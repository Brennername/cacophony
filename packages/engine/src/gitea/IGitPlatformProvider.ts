/**
 * Unified Git Platform Provider interface.
 * Abstracts remote Git forge operations across self-hosted Gitea and GitHub.
 */
export interface GitPlatformBranch {
  readonly name: string;
  readonly commitSha?: string;
}

export interface GitPlatformPullRequest {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly state: "open" | "closed";
  readonly merged: boolean;
  readonly headRef: string;
  readonly baseRef: string;
  readonly htmlUrl: string;
  readonly diffUrl?: string;
}

export interface CreateGitBranchOptions {
  readonly newBranchName: string;
  readonly baseBranch?: string;
}

export interface CreateGitPullRequestOptions {
  readonly title: string;
  readonly body: string;
  readonly head: string;
  readonly base: string;
}

export interface SubmitGitReviewOptions {
  readonly body: string;
  readonly event: "APPROVED" | "REQUEST_CHANGES" | "COMMENT";
  readonly comments?: readonly {
    readonly path: string;
    readonly line: number;
    readonly body: string;
  }[];
}

export interface MergeGitPullRequestOptions {
  readonly mergeMethod?: "merge" | "rebase" | "squash";
  readonly title?: string;
  readonly message?: string;
}

export interface IGitPlatformProvider {
  /**
   * The platform provider type identifier: 'gitea' or 'github'.
   */
  readonly providerType: "gitea" | "github";

  /**
   * Creates a new branch from an existing base branch.
   */
  createBranch(owner: string, repo: string, options: CreateGitBranchOptions): Promise<GitPlatformBranch>;

  /**
   * Opens a new Pull Request.
   */
  openPullRequest(owner: string, repo: string, options: CreateGitPullRequestOptions): Promise<GitPlatformPullRequest>;

  /**
   * Retrieves pull request diff.
   */
  getPullRequestDiff(owner: string, repo: string, prNumber: number): Promise<string>;

  /**
   * Submits a code review with verdict and line comments on a pull request.
   */
  submitReview(owner: string, repo: string, prNumber: number, options: SubmitGitReviewOptions): Promise<{ readonly id: number; readonly status: string }>;

  /**
   * Merges an approved pull request.
   */
  mergePullRequest(owner: string, repo: string, prNumber: number, options?: MergeGitPullRequestOptions): Promise<boolean>;
}
