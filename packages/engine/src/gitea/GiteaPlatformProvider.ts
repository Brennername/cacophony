import type {
  IGitPlatformProvider,
  GitPlatformBranch,
  GitPlatformPullRequest,
  CreateGitBranchOptions,
  CreateGitPullRequestOptions,
  SubmitGitReviewOptions,
  MergeGitPullRequestOptions
} from "./IGitPlatformProvider.js";
import { GiteaApiClient } from "./GiteaApiClient.js";

export class GiteaPlatformProvider implements IGitPlatformProvider {
  public readonly providerType = "gitea" as const;
  private readonly client: GiteaApiClient;

  constructor(client: GiteaApiClient) {
    this.client = client;
  }

  public async createBranch(owner: string, repo: string, options: CreateGitBranchOptions): Promise<GitPlatformBranch> {
    const branch = await this.client.createBranch(owner, repo, {
      new_branch_name: options.newBranchName,
      old_branch_name: options.baseBranch
    });

    return {
      name: branch.name,
      commitSha: branch.commit?.id
    };
  }

  public async openPullRequest(
    owner: string,
    repo: string,
    options: CreateGitPullRequestOptions
  ): Promise<GitPlatformPullRequest> {
    try {
      const pr = await this.client.createPullRequest(owner, repo, {
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base
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
        diffUrl: pr.diff_url
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("already exists") || errMsg.includes("409") || errMsg.includes("422")) {
        const pulls = await this.client.listPullRequests(owner, repo, "open").catch(() => []);
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
            diffUrl: existing.diff_url
          };
        }
      }
      throw err;
    }
  }

  public async getPullRequestDiff(owner: string, repo: string, prNumber: number): Promise<string> {
    return this.client.getPullRequestDiff(owner, repo, prNumber);
  }

  public async submitReview(
    owner: string,
    repo: string,
    prNumber: number,
    options: SubmitGitReviewOptions
  ): Promise<{ readonly id: number; readonly status: string }> {
    await this.client.submitPullRequestReview(owner, repo, prNumber, {
      body: options.body,
      event: options.event,
      comments: options.comments?.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body
      }))
    });

    return {
      id: Date.now(),
      status: options.event
    };
  }

  public async mergePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    options?: MergeGitPullRequestOptions
  ): Promise<boolean> {
    await this.client.mergePullRequest(owner, repo, prNumber, {
      Do: options?.mergeMethod ?? "merge",
      MergeTitleField: options?.title,
      MergeMessageField: options?.message
    });
    return true;
  }
}
