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

export interface GitPlatformIssue {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly state: "open" | "closed";
  readonly labels?: readonly string[];
  readonly htmlUrl: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface CreateGitIssueOptions {
  readonly title: string;
  readonly body: string;
  readonly labels?: readonly string[];
}

export interface CloseGitIssueOptions {
  readonly comment?: string;
}

export interface DependabotSecurityAlert {
  readonly number: number;
  readonly state: "open" | "fixed" | "dismissed";
  readonly dependencyPackage: string;
  readonly dependencyEcosystem: string;
  readonly securityAdvisorySummary: string;
  readonly securityAdvisoryDescription: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly cveId?: string | undefined;
  readonly htmlUrl: string;
}

export interface IGitPlatformProvider {
  /**
   * The platform provider type identifier: 'gitea' or 'github'.
   */
  readonly providerType: "gitea" | "github";

  /**
   * Creates a new branch from an existing base branch.
   */
  createBranch(
    owner: string,
    repo: string,
    options: CreateGitBranchOptions,
  ): Promise<GitPlatformBranch>;

  /**
   * Opens a new Pull Request.
   */
  openPullRequest(
    owner: string,
    repo: string,
    options: CreateGitPullRequestOptions,
  ): Promise<GitPlatformPullRequest>;

  /**
   * Retrieves pull request details.
   */
  getPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitPlatformPullRequest>;

  /**
   * Lists pull requests from the remote platform.
   */
  listPullRequests?(
    owner: string,
    repo: string,
    state?: "open" | "closed" | "all",
  ): Promise<GitPlatformPullRequest[]>;

  /**
   * Retrieves pull request diff.
   */
  getPullRequestDiff(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<string>;

  /**
   * Submits a code review with verdict and line comments on a pull request.
   */
  submitReview(
    owner: string,
    repo: string,
    prNumber: number,
    options: SubmitGitReviewOptions,
  ): Promise<{ readonly id: number; readonly status: string }>;

  /**
   * Lists reviews submitted on a pull request.
   */
  listPullRequestReviews?(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Array<{
    readonly id: number;
    readonly authorName: string;
    readonly state: string;
    readonly body: string;
    readonly submittedAt: string;
  }>>;

  /**
   * Lists discussion comments on a pull request / issue.
   */
  listPullRequestComments?(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Array<{
    readonly id: number;
    readonly authorName: string;
    readonly body: string;
    readonly createdAt: string;
  }>>;

  /**
   * Merges an approved pull request.
   */
  mergePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    options?: MergeGitPullRequestOptions,
  ): Promise<boolean>;

  /**
   * Creates an issue on the remote platform.
   */
  createIssue?(
    owner: string,
    repo: string,
    options: CreateGitIssueOptions,
  ): Promise<GitPlatformIssue>;

  /**
   * Lists issues from the remote platform.
   */
  listIssues?(
    owner: string,
    repo: string,
    state?: "open" | "closed" | "all",
  ): Promise<GitPlatformIssue[]>;

  /**
   * Retrieves a single issue by number.
   */
  getIssue?(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<GitPlatformIssue>;

  /**
   * Closes an issue on the remote platform with optional resolution comment.
   */
  closeIssue?(
    owner: string,
    repo: string,
    issueNumber: number,
    options?: CloseGitIssueOptions,
  ): Promise<void>;

  /**
   * Creates a comment on an issue thread.
   */
  createIssueComment?(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<void>;

  /**
   * Optional: Lists Dependabot security alerts for GitHub platform providers.
   */
  listDependabotAlerts?(
    owner: string,
    repo: string,
    state?: "open" | "fixed" | "dismissed",
  ): Promise<DependabotSecurityAlert[]>;
}
