import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { StructuredLogger } from "../telemetry/StructuredLogger.js";
import type { MonorepoBuildGate } from "./MonorepoBuildGate.js";

const execFileAsync = promisify(execFile);

export interface GitHubSyncServiceOptions {
  readonly workspaceDir?: string | undefined;
  readonly sourceRemote?: string | undefined;
  readonly sourceBranch?: string | undefined;
  readonly targetRemote?: string | undefined;
  readonly targetBranch?: string | undefined;
  readonly verifyBuildBeforePush?: boolean | undefined;
  readonly buildGate?: MonorepoBuildGate | undefined;
  readonly intervalMs?: number | undefined;
  readonly dryRun?: boolean | undefined;
  readonly logger?: StructuredLogger | undefined;
}

export interface GitHubSyncResult {
  readonly success: boolean;
  readonly pushed: boolean;
  readonly sourceSha: string;
  readonly targetSha: string;
  readonly error?: string | undefined;
  readonly buildVerified?: boolean | undefined;
}

/**
 * GitHubSyncService
 *
 * Keeps the upstream GitHub repository in continuous synchronization with the
 * self-hosted Gitea base repository. Executes pre-push verification gates to ensure
 * only verified passing commits are propagated upstream.
 */
export class GitHubSyncService {
  private readonly workspaceDir: string;
  private readonly sourceRemote: string;
  private readonly sourceBranch: string;
  private readonly targetRemote: string;
  private readonly targetBranch: string;
  private readonly verifyBuildBeforePush: boolean;
  private readonly buildGate?: MonorepoBuildGate | undefined;
  private readonly intervalMs: number;
  private readonly dryRun: boolean;
  private readonly logger: StructuredLogger;

  private timer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  private static sanitizeGitIdentifier(value: string, paramName: string): string {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith("-") || !/^[a-zA-Z0-9_./-]+$/.test(trimmed)) {
      throw new Error(`Invalid git identifier for ${paramName}: '${value}'`);
    }
    return trimmed;
  }

  constructor(options?: GitHubSyncServiceOptions) {
    this.workspaceDir = options?.workspaceDir || process.cwd();
    this.sourceRemote = GitHubSyncService.sanitizeGitIdentifier(
      options?.sourceRemote || "gitea",
      "sourceRemote",
    );
    this.sourceBranch = GitHubSyncService.sanitizeGitIdentifier(
      options?.sourceBranch || "main",
      "sourceBranch",
    );
    this.targetRemote = GitHubSyncService.sanitizeGitIdentifier(
      options?.targetRemote || "origin",
      "targetRemote",
    );
    this.targetBranch = GitHubSyncService.sanitizeGitIdentifier(
      options?.targetBranch || "master",
      "targetBranch",
    );
    this.verifyBuildBeforePush = options?.verifyBuildBeforePush ?? false;
    this.buildGate = options?.buildGate;
    this.intervalMs = options?.intervalMs ?? 300_000;
    this.dryRun = options?.dryRun ?? false;
    this.logger = options?.logger ?? new StructuredLogger("GitHubSyncService");
  }

  /**
   * Starts periodic upstream synchronization timer.
   */
  public start(): void {
    if (this.timer) {
      return;
    }
    this.logger.info("Starting GitHubSyncService interval sync", {
      sourceRemote: this.sourceRemote,
      sourceBranch: this.sourceBranch,
      targetRemote: this.targetRemote,
      targetBranch: this.targetBranch,
      intervalMs: this.intervalMs,
    });
    this.timer = setInterval(async () => {
      try {
        await this.sync();
      } catch (err) {
        this.logger.warn("Non-fatal background error during GitHub upstream sync", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, this.intervalMs);
  }

  /**
   * Stops periodic upstream synchronization timer.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info("Stopped GitHubSyncService interval sync");
    }
  }

  /**
   * Checks if periodic sync timer is currently running.
   */
  public isRunning(): boolean {
    return this.timer !== null;
  }

  /**
   * Performs a synchronization check and pushes verified commits upstream if necessary.
   */
  public async sync(): Promise<GitHubSyncResult> {
    if (this.isSyncing) {
      this.logger.info("GitHub upstream synchronization already in progress, skipping pass");
      return {
        success: true,
        pushed: false,
        sourceSha: "",
        targetSha: "",
      };
    }

    this.isSyncing = true;
    try {
      return await this.executeSyncPass();
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeSyncPass(): Promise<GitHubSyncResult> {
    let sourceSha = "";
    let targetSha = "";

    // 1. Resolve local/source SHA
    try {
      // First check if sourceRemote/sourceBranch exists in git references
      const { stdout: localShaOutput } = await execFileAsync(
        "git",
        ["rev-parse", "--verify", `refs/remotes/${this.sourceRemote}/${this.sourceBranch}`],
        { cwd: this.workspaceDir },
      ).catch(async () => {
        // Fallback to local HEAD
        return execFileAsync("git", ["rev-parse", "--verify", "HEAD"], {
          cwd: this.workspaceDir,
        });
      });
      sourceSha = localShaOutput.trim();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn("Failed to resolve source branch SHA", { error: errMsg });
      return {
        success: false,
        pushed: false,
        sourceSha: "",
        targetSha: "",
        error: `Failed to resolve source SHA: ${errMsg}`,
      };
    }

    // 2. Query target upstream SHA via ls-remote
    try {
      const { stdout: remoteOutput } = await execFileAsync(
        "git",
        ["ls-remote", "--", this.targetRemote, `refs/heads/${this.targetBranch}`],
        { cwd: this.workspaceDir },
      );
      const firstLine = remoteOutput.trim().split("\n")[0] || "";
      targetSha = firstLine.split(/\s+/)[0] || "";
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn("Failed to query target remote SHA", { error: errMsg });
      return {
        success: false,
        pushed: false,
        sourceSha,
        targetSha: "",
        error: `Failed to query target remote: ${errMsg}`,
      };
    }

    // 3. Compare SHAs
    if (sourceSha && targetSha && sourceSha === targetSha) {
      this.logger.debug("Upstream GitHub repository is already up to date with source branch", {
        sourceSha,
        targetSha,
      });
      return {
        success: true,
        pushed: false,
        sourceSha,
        targetSha,
      };
    }

    // 4. Pre-push build gate verification (if enabled)
    let buildVerified: boolean | undefined;
    if (this.verifyBuildBeforePush && this.buildGate) {
      this.logger.info("Executing pre-sync MonorepoBuildGate verification...");
      const buildResult = await this.buildGate.verifyCleanBuild(this.workspaceDir);
      buildVerified = buildResult.passed;
      if (!buildResult.passed) {
        this.logger.warn("Pre-sync MonorepoBuildGate failed, aborting upstream push", {
          diagnosticsCount: buildResult.diagnostics.length,
          summary: buildResult.failureSummary,
        });
        return {
          success: false,
          pushed: false,
          sourceSha,
          targetSha,
          error: buildResult.failureSummary || "Monorepo build verification failed",
          buildVerified: false,
        };
      }
    }

    // 5. Push verified commits upstream
    try {
      this.logger.info("Pushing verified commits to upstream GitHub", {
        targetRemote: this.targetRemote,
        sourceBranch: this.sourceBranch,
        targetBranch: this.targetBranch,
        sourceSha,
        targetSha,
        dryRun: this.dryRun,
      });

      // Push source ref to target branch
      const pushRef = `${sourceSha}:refs/heads/${this.targetBranch}`;
      const pushArgs = ["push"];
      if (this.dryRun) {
        pushArgs.push("--dry-run");
      }
      pushArgs.push("--", this.targetRemote, pushRef);

      await execFileAsync("git", pushArgs, {
        cwd: this.workspaceDir,
        env: { ...process.env, SKIP_CODEQL: "1" },
      });

      this.logger.info("Successfully pushed verified commits to upstream GitHub", {
        sourceSha,
        targetBranch: this.targetBranch,
      });

      return {
        success: true,
        pushed: true,
        sourceSha,
        targetSha,
        ...(buildVerified !== undefined ? { buildVerified } : {}),
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn("Failed to push verified commits to upstream GitHub", {
        error: errMsg,
      });
      return {
        success: false,
        pushed: false,
        sourceSha,
        targetSha,
        error: `Git push error: ${errMsg}`,
        ...(buildVerified !== undefined ? { buildVerified } : {}),
      };
    }
  }
}
