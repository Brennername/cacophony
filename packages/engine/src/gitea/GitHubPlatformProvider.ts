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
  DependabotSecurityAlert,
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
    let url = config.baseUrl || "https://api.github.com";
    while (url.endsWith("/")) {
      url = url.slice(0, -1);
    }
    this.baseUrl = url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (
      options.body &&
      typeof options.body === "string" &&
      !headers["Content-Type"]
    ) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `GitHub API error (${response.status}) on ${endpoint}: ${errText}`,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  public async createBranch(
    owner: string,
    repo: string,
    options: CreateGitBranchOptions,
  ): Promise<GitPlatformBranch> {
    const baseBranchName = options.baseBranch || "main";
    const refData = await this.request<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/ref/heads/${baseBranchName}`,
    );
    const baseSha = refData.object.sha;

    const created = await this.request<{
      ref: string;
      object: { sha: string };
    }>(`/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${options.newBranchName}`,
        sha: baseSha,
      }),
    });

    return {
      name: created.ref.replace(/^refs\/heads\//, ""),
      commitSha: created.object.sha,
    };
  }

  public async openPullRequest(
    owner: string,
    repo: string,
    options: CreateGitPullRequestOptions,
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
        base: options.base,
      }),
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
      diffUrl: data.diff_url,
    };
  }

  public async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
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
      diffUrl: data.diff_url,
    };
  }

  public async listPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<GitPlatformPullRequest[]> {
    const list = await this.request<
      Array<{
        id: number;
        number: number;
        title: string;
        body: string;
        state: string;
        merged_at: string | null;
        head: { ref: string };
        base: { ref: string };
        html_url: string;
        diff_url: string;
      }>
    >(`/repos/${owner}/${repo}/pulls?state=${encodeURIComponent(state)}`);

    return list.map((data) => ({
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state === "closed" ? "closed" : "open",
      merged: Boolean(data.merged_at),
      headRef: data.head?.ref ?? "",
      baseRef: data.base?.ref ?? "",
      htmlUrl: data.html_url,
      diffUrl: data.diff_url,
    }));
  }

  public async getPullRequestDiff(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<string> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`;
    const headers = {
      Accept: "application/vnd.github.v3.diff",
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
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
    options: SubmitGitReviewOptions,
  ): Promise<{ readonly id: number; readonly status: string }> {
    const eventMap: Record<string, string> = {
      APPROVED: "APPROVE",
      REQUEST_CHANGES: "REQUEST_CHANGES",
      COMMENT: "COMMENT",
    };

    const ghEvent = eventMap[options.event] || "COMMENT";

    const payload: {
      body: string;
      event: string;
      comments?: { path: string; line: number; body: string }[];
    } = {
      body: options.body,
      event: ghEvent,
    };

    if (options.comments && options.comments.length > 0) {
      payload.comments = options.comments.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body,
      }));
    }

    const res = await this.request<{ id: number; state: string }>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    return {
      id: res.id,
      status: res.state || (res as any).status || options.event,
    };
  }

  public async mergePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    options?: MergeGitPullRequestOptions,
  ): Promise<boolean> {
    const res = await this.request<{ merged: boolean }>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
      {
        method: "PUT",
        body: JSON.stringify({
          commit_title: options?.title,
          commit_message: options?.message,
          merge_method: options?.mergeMethod || "merge",
        }),
      },
    );

    return Boolean(res.merged);
  }

  /**
   * Generates authenticated HTTPS git clone/push remote URL using the provided GitHub bearer token.
   */
  public getAuthenticatedRemoteUrl(owner: string, repo: string): string {
    return `https://x-access-token:${this.token}@github.com/${owner}/${repo}.git`;
  }

  /**
   * Retrieves branch details from GitHub or returns null if branch does not exist.
   */
  public async getBranch(
    owner: string,
    repo: string,
    branchName: string,
  ): Promise<GitPlatformBranch | null> {
    try {
      const data = await this.request<{
        name: string;
        commit: { sha: string };
      }>(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branchName)}`);
      return {
        name: data.name,
        commitSha: data.commit.sha,
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Creates or updates a Git ref on GitHub.
   */
  public async createOrUpdateRef(
    owner: string,
    repo: string,
    branchName: string,
    sha: string,
    force: boolean = false,
  ): Promise<void> {
    const existing = await this.getBranch(owner, repo, branchName);
    if (!existing) {
      await this.request(`/repos/${owner}/${repo}/git/refs`, {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha,
        }),
      });
    } else {
      await this.request(
        `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branchName)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            sha,
            force,
          }),
        },
      );
    }
  }

  public async createIssue(
    owner: string,
    repo: string,
    options: CreateGitIssueOptions,
  ): Promise<GitPlatformIssue> {
    const data = await this.request<{
      id: number;
      number: number;
      title: string;
      body: string;
      state: "open" | "closed";
      labels?: Array<{ name: string } | string>;
      html_url: string;
      created_at: string;
      updated_at: string;
    }>(`/repos/${owner}/${repo}/issues`, {
      method: "POST",
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        labels: options.labels,
      }),
    });

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      labels: (data.labels || []).map((l) =>
        typeof l === "string" ? l : l.name,
      ),
      htmlUrl: data.html_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  public async listIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<GitPlatformIssue[]> {
    const data = await this.request<
      Array<{
        id: number;
        number: number;
        title: string;
        body: string;
        state: "open" | "closed";
        labels?: Array<{ name: string } | string>;
        html_url: string;
        pull_request?: unknown;
        created_at: string;
        updated_at: string;
      }>
    >(`/repos/${owner}/${repo}/issues?state=${state}`);

    return data
      .filter((item) => !item.pull_request)
      .map((item) => ({
        id: item.id,
        number: item.number,
        title: item.title,
        body: item.body,
        state: item.state,
        labels: (item.labels || []).map((l) =>
          typeof l === "string" ? l : l.name,
        ),
        htmlUrl: item.html_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
  }

  public async getIssue(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<GitPlatformIssue> {
    const data = await this.request<{
      id: number;
      number: number;
      title: string;
      body: string;
      state: "open" | "closed";
      labels?: Array<{ name: string } | string>;
      html_url: string;
      created_at: string;
      updated_at: string;
    }>(`/repos/${owner}/${repo}/issues/${issueNumber}`);

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      labels: (data.labels || []).map((l) =>
        typeof l === "string" ? l : l.name,
      ),
      htmlUrl: data.html_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  public async closeIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    options?: CloseGitIssueOptions,
  ): Promise<void> {
    if (options?.comment) {
      await this.createIssueComment(owner, repo, issueNumber, options.comment);
    }
    await this.request(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed" }),
    });
  }

  public async createIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<void> {
    await this.request(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      },
    );
  }

  public async listDependabotAlerts(
    owner: string,
    repo: string,
    state: "open" | "fixed" | "dismissed" = "open",
  ): Promise<DependabotSecurityAlert[]> {
    try {
      const data = await this.request<
        Array<{
          number: number;
          state: "open" | "fixed" | "dismissed";
          dependency: { package: { name: string; ecosystem: string } };
          security_advisory: {
            summary: string;
            description: string;
            severity: "low" | "medium" | "high" | "critical";
            cve_id?: string;
          };
          html_url: string;
        }>
      >(`/repos/${owner}/${repo}/dependabot/alerts?state=${state}`);

      return data.map((alert) => ({
        number: alert.number,
        state: alert.state,
        dependencyPackage: alert.dependency?.package?.name || "unknown",
        dependencyEcosystem: alert.dependency?.package?.ecosystem || "npm",
        securityAdvisorySummary:
          alert.security_advisory?.summary || "Security vulnerability",
        securityAdvisoryDescription: alert.security_advisory?.description || "",
        severity: alert.security_advisory?.severity || "high",
        cveId: alert.security_advisory?.cve_id,
        htmlUrl: alert.html_url,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("403")) {
        return [];
      }
      throw err;
    }
  }
}
