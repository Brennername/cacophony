import type {
  IGitPlatformProvider,
  GitPlatformBranch,
  GitPlatformPullRequest,
  CreateGitBranchOptions,
  CreateGitPullRequestOptions,
  SubmitGitReviewOptions,
  MergeGitPullRequestOptions
} from "./IGitPlatformProvider.js";

export interface GitHubProviderConfig {
  readonly token: string;
  readonly baseUrl?: string | undefined; // Defaults to https://api.github.com
}

export class GitHubPlatformProvider implements IGitPlatformProvider {
  public readonly providerType = "github" as const;
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: GitHubProviderConfig) {
    this.token = config.token;
    this.baseUrl = (config.baseUrl || "https://api.github.com").replace(/\/+$/, "");
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...((options.headers as Record<string, string>) || {})
    };

    if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GitHub API error (${response.status}) on ${endpoint}: ${errText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  public async createBranch(owner: string, repo: string, options: CreateGitBranchOptions): Promise<GitPlatformBranch> {

    const baseBranchName = options.baseBranch || "main";
    const refData = await this.request<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/ref/heads/${baseBranchName}`
    );
    const baseSha = refData.object.sha;

    const created = await this.request<{ ref: string; object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${options.newBranchName}`,
          sha: baseSha
        })
      }
    );

    return {
      name: created.ref.replace(/^refs\/heads\//, ""),
      commitSha: created.object.sha
    };
  }

  public async openPullRequest(
    owner: string,
    repo: string,
    options: CreateGitPullRequestOptions
  ): Promise<GitPlatformPullRequest> {
    const data = await this.request<{
      id: number;
      number: number;
      title: string;
      body: string;
      state: "open" | "closed";
      merged: boolean;
      head: { ref: string };
      base: { ref: string };
      html_url: string;
      diff_url: string;
    }>(`/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base
      })
    });

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      merged: Boolean(data.merged),
      headRef: data.head.ref,
      baseRef: data.base.ref,
      htmlUrl: data.html_url,
      diffUrl: data.diff_url
    };
  }

  public async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitPlatformPullRequest> {
    const data = await this.request<{
      id: number;
      number: number;
      title: string;
      body: string;
      state: "open" | "closed";
      merged: boolean;
      head: { ref: string };
      base: { ref: string };
      html_url: string;
      diff_url: string;
    }>(`/repos/${owner}/${repo}/pulls/${prNumber}`);

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      merged: Boolean(data.merged),
      headRef: data.head.ref,
      baseRef: data.base.ref,
      htmlUrl: data.html_url,
      diffUrl: data.diff_url
    };
  }

  public async getPullRequestDiff(owner: string, repo: string, prNumber: number): Promise<string> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`;
    const headers = {
      Accept: "application/vnd.github.v3.diff",
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub getPullRequestDiff failed (${res.status})`);
    }
    return res.text();
  }

  public async submitReview(
    owner: string,
    repo: string,
    prNumber: number,
    options: SubmitGitReviewOptions
  ): Promise<{ readonly id: number; readonly status: string }> {
    const eventMap: Record<string, string> = {
      APPROVED: "APPROVE",
      REQUEST_CHANGES: "REQUEST_CHANGES",
      COMMENT: "COMMENT"
    };

    const ghEvent = eventMap[options.event] || "COMMENT";

    const payload: {
      body: string;
      event: string;
      comments?: { path: string; line: number; body: string }[];
    } = {
      body: options.body,
      event: ghEvent
    };

    if (options.comments && options.comments.length > 0) {
      payload.comments = options.comments.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body
      }));
    }

    const res = await this.request<{ id: number; state: string }>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    return {
      id: res.id,
      status: res.state
    };
  }

  public async mergePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    options?: MergeGitPullRequestOptions
  ): Promise<boolean> {
    const res = await this.request<{ merged: boolean }>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
      {
        method: "PUT",
        body: JSON.stringify({
          commit_title: options?.title,
          commit_message: options?.message,
          merge_method: options?.mergeMethod || "merge"
        })
      }
    );

    return Boolean(res.merged);
  }
}