import type { GiteaApiClient } from "./GiteaApiClient.js";
import type {
  GitWorktreeManager,
  WorktreeDescriptor,
} from "./GitWorktreeManager.js";
import type { GiteaPullRequest } from "./giteaTypes.js";

import { buildStageRoundKey, type WorkItemLineageStage } from "@cacophony/shared-types";

export interface AutomatedPrOptions {
  readonly owner: string;
  readonly repo: string;
  readonly taskId: string;
  readonly title: string;
  readonly testSummary: string;
  readonly commitMessage: string;
  readonly baseBranch?: string;
  readonly stageRoundKey?: string;
  readonly workItemId?: string;
  readonly lineageStage?: WorkItemLineageStage | string;
  readonly round?: number;
  readonly headSha?: string;
}

export interface AutomatedPrResult {
  readonly success: boolean;
  readonly pullRequest?: GiteaPullRequest;
  readonly branchName: string;
  readonly error?: string;
}

/**
 * Automates the git branch push, PR creation, and task metadata attachment
 * to internal Gitea instance with idempotent stage-round key guarantees.
 */
export class AutomatedPrWorkflow {
  private readonly giteaClient: GiteaApiClient;
  private readonly worktreeManager: GitWorktreeManager;
  private readonly processedStageRoundKeys = new Map<string, GiteaPullRequest>();

  constructor(
    giteaClient: GiteaApiClient,
    worktreeManager: GitWorktreeManager,
  ) {
    this.giteaClient = giteaClient;
    this.worktreeManager = worktreeManager;
  }

  /**
   * Checks whether a stage-round execution key has already produced a verified PR.
   */
  public isStageRoundProcessed(key: string): boolean {
    return this.processedStageRoundKeys.has(key);
  }

  /**
   * Pushes the task branch and opens a Pull Request on Gitea.
   * Idempotently keyed by stageRoundKey to avoid duplicate PRs or reviews.
   */
  public async publishPullRequest(
    worktree: WorktreeDescriptor,
    options: AutomatedPrOptions,
  ): Promise<AutomatedPrResult> {
    const stageRoundKey =
      options.stageRoundKey ??
      (options.workItemId
        ? buildStageRoundKey(
            options.workItemId,
            options.lineageStage ?? "implementation",
            options.round ?? 1,
            options.headSha,
          )
        : undefined);

    if (stageRoundKey && this.processedStageRoundKeys.has(stageRoundKey)) {
      return {
        success: true,
        pullRequest: this.processedStageRoundKeys.get(stageRoundKey)!,
        branchName: worktree.branchName,
      };
    }

    try {
      // 1. Commit any remaining changes in the worktree
      await this.worktreeManager.commitWorktree(
        worktree.worktreePath,
        options.commitMessage,
      );

      // 2. Push branch to remote
      await this.worktreeManager.pushBranch(
        worktree.worktreePath,
        "origin",
        worktree.branchName,
      );

      // 3. Check for existing open PR for this branch to prevent duplicates
      const openPrs = await this.giteaClient
        .listPullRequests(options.owner, options.repo, "open")
        .catch(() => [] as GiteaPullRequest[]);

      const existingPr = openPrs.find(
        (p) => p.head?.ref === worktree.branchName,
      );

      if (existingPr) {
        if (stageRoundKey) {
          this.processedStageRoundKeys.set(stageRoundKey, existingPr);
        }
        return {
          success: true,
          pullRequest: existingPr,
          branchName: worktree.branchName,
        };
      }

      // 4. Format PR body with task references, lineage, and test outputs
      const prBody = this.buildPrDescription(
        options.taskId,
        options.testSummary,
        stageRoundKey,
      );

      // 5. Open PR via Gitea API
      const pr = await this.giteaClient.createPullRequest(
        options.owner,
        options.repo,
        {
          title: options.title,
          body: prBody,
          head: worktree.branchName,
          base: options.baseBranch ?? "main",
        },
      );

      if (stageRoundKey) {
        this.processedStageRoundKeys.set(stageRoundKey, pr);
      }

      return {
        success: true,
        pullRequest: pr,
        branchName: worktree.branchName,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        branchName: worktree.branchName,
        error: message,
      };
    }
  }

  private buildPrDescription(
    taskId: string,
    testSummary: string,
    stageRoundKey?: string,
  ): string {
    const lines = [
      `## Cacophony Automated PR for Task [${taskId}]`,
      "",
    ];

    if (stageRoundKey) {
      lines.push(`**Lineage Key**: \`${stageRoundKey}\``, "");
    }

    lines.push(
      "### Verification Summary",
      "```",
      testSummary.trim(),
      "```",
      "",
      "> Automatically generated and verified by Cacophony Autonomous Engine.",
    );

    return lines.join("\n");
  }

  /**
   * Evaluates whether a PR meets the strict preconditions for automated merging:
   * 1. Commit status check must be 'success' (green tests)
   * 2. Review verdict must be 'APPROVE' or 'APPROVED'
   */
  public evaluateMergeEligibility(
    commitStatus: string,
    reviewVerdict: string,
  ): boolean {
    const isStatusGreen = commitStatus.toLowerCase() === "success";
    const isReviewApproved =
      reviewVerdict.toUpperCase() === "APPROVE" ||
      reviewVerdict.toUpperCase() === "APPROVED";

    return isStatusGreen && isReviewApproved;
  }

  /**
   * Executes squash-merge on an approved PR and cleans up remote task branch.
   */
  public async executeSquashMerge(
    owner: string,
    repo: string,
    prIndex: number,
    options?: {
      readonly branchName?: string | undefined;
      readonly commitTitle?: string | undefined;
      readonly commitMessage?: string | undefined;
    },
  ): Promise<{
    readonly success: boolean;
    readonly merged: boolean;
    readonly error?: string;
  }> {
    try {
      await this.giteaClient.mergePullRequest(owner, repo, prIndex, {
        Do: "squash",
        MergeTitleField: options?.commitTitle,
        MergeMessageField: options?.commitMessage,
      });

      // Cleanup remote branch if requested
      if (options?.branchName) {
        try {
          const baseUrl = (this.giteaClient as any).baseUrl;
          const token = (this.giteaClient as any).apiToken;
          const headers: Record<string, string> = {
            Accept: "application/json",
          };
          if (token) headers["Authorization"] = `token ${token}`;

          await fetch(
            `${baseUrl}/api/v1/repos/${owner}/${repo}/branches/${encodeURIComponent(options.branchName)}`,
            {
              method: "DELETE",
              headers,
            },
          ).catch(() => {});
        } catch {
          // non-fatal remote branch deletion
        }
      }

      return { success: true, merged: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, merged: false, error: message };
    }
  }
}
