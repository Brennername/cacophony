import type {
  IGitPlatformProvider,
  GitPlatformBranch,
  GitPlatformPullRequest,
  GitPlatformIssue,
  CreateGitBranchOptions,
  CreateGitPullRequestOptions,
  CreateGitIssueOptions,
  CloseGitIssueOptions,
  SubmitGitReviewOptions,
  MergeGitPullRequestOptions,
} from "./IGitPlatformProvider.js";
import { GiteaApiClient } from "./GiteaApiClient.js";

export class GiteaPlatformProvider implements IGitPlatformProvider {
  public readonly providerType = "gitea" as const;
  private readonly client: GiteaApiClient;

  constructor(client: GiteaApiClient) {
    this.client = client;
  }

  public async createBranch(
    owner: string,
    repo: string,
    options: CreateGitBranchOptions,
  ): Promise<GitPlatformBranch> {
    const branch = await this.client.createBranch(owner, repo, {
      new_branch_name: options.newBranchName,
      old_branch_name: options.baseBranch,
    });

    return {
      name: branch.name,
      commitSha: branch.commit?.id,
    };
  }

  public async openPullRequest(
    owner: string,
    repo: string,
    options: CreateGitPullRequestOptions,
  ): Promise<GitPlatformPullRequest> {
    try {
      const pr = await this.client.createPullRequest(owner, repo, {
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
      });

      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        merged: pr.merged,
        headRef: pr.head.ref,
        baseRef: pr.base.ref,
        htmlUrl: pr.html_url,
        diffUrl: pr.diff_url,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes("already exists") ||
        errMsg.includes("409") ||
        errMsg.includes("422")
      ) {
        const pulls = await this.client
          .listPullRequests(owner, repo, "open")
          .catch(() => []);
        const existing = pulls.find((p) => p.head?.ref === options.head);
        if (existing) {
          return {
            id: existing.id,
            number: existing.number,
            title: existing.title,
            body: existing.body,
            state: existing.state,
            merged: existing.merged,
            headRef: existing.head?.ref ?? options.head,
            baseRef: existing.base?.ref ?? (options.base || "main"),
            htmlUrl: existing.html_url,
            diffUrl: existing.diff_url,
          };
        }
      }
      throw err;
    }
  }

  public async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitPlatformPullRequest> {
    const pr = await this.client.getPullRequest(owner, repo, prNumber);
    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      merged: pr.merged,
      headRef: pr.head?.ref ?? "",
      baseRef: pr.base?.ref ?? "main",
      htmlUrl: pr.html_url,
      diffUrl: pr.diff_url,
    };
  }

  public async listPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<GitPlatformPullRequest[]> {
    const prs = await this.client.listPullRequests(owner, repo, state);
    return prs.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      merged: pr.merged,
      headRef: pr.head?.ref ?? "",
      baseRef: pr.base?.ref ?? "main",
      htmlUrl: pr.html_url,
      diffUrl: pr.diff_url,
    }));
  }

  public async getPullRequestDiff(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<string> {
    return this.client.getPullRequestDiff(owner, repo, prNumber);
  }

  public async submitReview(
    owner: string,
    repo: string,
    prNumber: number,
    options: SubmitGitReviewOptions,
  ): Promise<{ readonly id: number; readonly status: string }> {
    await this.client.submitPullRequestReview(owner, repo, prNumber, {
      body: options.body,
      event: options.event,
      comments: options.comments?.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body,
      })),
    });

    return {
      id: Date.now(),
      status: options.event,
    };
  }

  public async listPullRequestReviews(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Array<{
    readonly id: number;
    readonly authorName: string;
    readonly state: string;
    readonly body: string;
    readonly submittedAt: string;
  }>> {
    const reviews = await this.client.listPullRequestReviews(owner, repo, prNumber);
    return reviews.map((r) => ({
      id: r.id,
      authorName: r.user.login,
      state: r.state,
      body: r.body,
      submittedAt: r.submitted_at,
    }));
  }

  public async listPullRequestComments(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Array<{
    readonly id: number;
    readonly authorName: string;
    readonly body: string;
    readonly createdAt: string;
  }>> {
    const comments = await this.client.listIssueComments(owner, repo, prNumber);
    return comments.map((c) => ({
      id: c.id,
      authorName: c.user.login,
      body: c.body,
      createdAt: c.created_at,
    }));
  }

  public async mergePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    options?: MergeGitPullRequestOptions,
  ): Promise<boolean> {
    await this.client.mergePullRequest(owner, repo, prNumber, {
      Do: options?.mergeMethod ?? "merge",
      MergeTitleField: options?.title,
      MergeMessageField: options?.message,
    });
    return true;
  }

  public async createIssue(
    owner: string,
    repo: string,
    options: CreateGitIssueOptions,
  ): Promise<GitPlatformIssue> {
    const issue = await this.client.createIssue(owner, repo, {
      title: options.title,
      body: options.body,
    });
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: issue.labels?.map((l) => l.name) ?? [],
      htmlUrl: `${(this.client as any).baseUrl || ""}/${owner}/${repo}/issues/${issue.number}`,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    };
  }

  public async listIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<GitPlatformIssue[]> {
    const issues = await this.client.listIssues(owner, repo, state);
    return issues.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: issue.labels?.map((l) => l.name) ?? [],
      htmlUrl: `${(this.client as any).baseUrl || ""}/${owner}/${repo}/issues/${issue.number}`,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    }));
  }

  public async getIssue(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<GitPlatformIssue> {
    const issue = await this.client.getIssue(owner, repo, issueNumber);
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: issue.labels?.map((l) => l.name) ?? [],
      htmlUrl: `${(this.client as any).baseUrl || ""}/${owner}/${repo}/issues/${issue.number}`,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    };
  }

  public async closeIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    options?: CloseGitIssueOptions,
  ): Promise<void> {
    if (options?.comment) {
      await this.client.createIssueComment(owner, repo, issueNumber, {
        body: options.comment,
      });
    }
    await this.client.closeIssue(owner, repo, issueNumber);
  }

  public async createIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<void> {
    await this.client.createIssueComment(owner, repo, issueNumber, { body });
  }
}
