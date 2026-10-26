import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GiteaApiClient, type GiteaClientConfig } from "./GiteaApiClient.js";
import type {
  GiteaPullRequest,
  CreatePullRequestRequest,
  SubmitReviewRequest,
  CreateCommitStatusRequest,
  GiteaCommitStatus,
} from "./giteaTypes.js";

const execFileAsync = promisify(execFile);

export interface OpenPullRequestOptions {
  readonly owner: string;
  readonly repo: string;
  readonly title: string;
  readonly body: string;
  readonly head: string;
  readonly base?: string | undefined;
}

export interface SubmitReviewOptions {
  readonly owner: string;
  readonly repo: string;
  readonly prIndex: number;
  readonly review: SubmitReviewRequest;
}

export interface SetCommitStatusOptions {
  readonly owner: string;
  readonly repo: string;
  readonly sha: string;
  readonly status: CreateCommitStatusRequest;
}

export interface MergePullRequestOptions {
  readonly owner: string;
  readonly repo: string;
  readonly prIndex: number;
  readonly mergeStyle?: "squash" | "merge" | "rebase" | undefined;
  readonly deleteBranch?: boolean | undefined;
}

/**
 * Autonomous Gitea Pull Request Publisher & Manager.
 * Orchestrates branch pushes, PR lifecycle operations, code review submissions,
 * commit status checks, and automated squash-merging via Gitea REST API.
 */
export class GiteaPrClient {
  private readonly client: GiteaApiClient;
  private readonly apiToken?: string | undefined;

  constructor(configOrClient: GiteaClientConfig | GiteaApiClient) {
    if (configOrClient instanceof GiteaApiClient) {
      this.client = configOrClient;
    } else {
      this.client = new GiteaApiClient(configOrClient);
      this.apiToken = configOrClient.apiToken;
    }
  }

  /**
   * Pushes a local task branch to the Gitea remote origin.
   */
  public async pushBranch(
    worktreePath: string,
    branchName: string,
    remote = "origin",
  ): Promise<void> {
    try {
      await execFileAsync(
        "git",
        ["push", "--no-verify", "--force", "-u", remote, branchName],
        {
          cwd: worktreePath,
          env: { ...process.env, SKIP_CODEQL: "1" },
        },
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to push branch ${branchName} to ${remote}: ${errorMsg}`,
      );
    }
  }

  /**
   * Opens a new Pull Request on Gitea.
   */
  public async openPullRequest(
    options: OpenPullRequestOptions,
  ): Promise<GiteaPullRequest> {
    const req: CreatePullRequestRequest = {
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base ?? "main",
    };

    return this.client.createPullRequest(options.owner, options.repo, req);
  }

  /**
   * Submits a structured code review (APPROVED, REQUEST_CHANGES, COMMENT) to a PR.
   */
  public async submitReview(options: SubmitReviewOptions): Promise<void> {
    return this.client.submitPullRequestReview(
      options.owner,
      options.repo,
      options.prIndex,
      options.review,
    );
  }

  /**
   * Sets commit status (success, failure, pending) for a commit SHA.
   */
  public async setCommitStatus(
    options: SetCommitStatusOptions,
  ): Promise<GiteaCommitStatus> {
    return this.client.createCommitStatus(
      options.owner,
      options.repo,
      options.sha,
      options.status,
    );
  }

  /**
   * Executes a merge (default squash) on an approved PR and optionally deletes remote branch.
   */
  public async mergePullRequest(
    options: MergePullRequestOptions,
  ): Promise<void> {
    const mergeStyle = options.mergeStyle ?? "squash";
    await this.client.mergePullRequest(
      options.owner,
      options.repo,
      options.prIndex,
      {
        Do: mergeStyle,
      },
    );

    if (options.deleteBranch) {
      try {
        const pr = await this.client.getPullRequest(
          options.owner,
          options.repo,
          options.prIndex,
        );
        if (pr?.head?.ref) {
          // Gitea REST API to delete branch: DELETE /api/v1/repos/{owner}/{repo}/branches/{branch}
          const baseUrl = (this.client as any).baseUrl;
          const headers: Record<string, string> = {
            Accept: "application/json",
          };
          const token = this.apiToken || (this.client as any).apiToken;
          if (token) {
            headers["Authorization"] = `token ${token}`;
          }
          await fetch(
            `${baseUrl}/api/v1/repos/${options.owner}/${options.repo}/branches/${encodeURIComponent(pr.head.ref)}`,
            {
              method: "DELETE",
              headers,
            },
          ).catch(() => {});
        }
      } catch {
        // non-fatal remote branch deletion
      }
    }
  }
}
