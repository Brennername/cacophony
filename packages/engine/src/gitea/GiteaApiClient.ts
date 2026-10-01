import type {
  GiteaRepository,
  GiteaBranch,
  GiteaPullRequest,
  CreateBranchRequest,
  CreatePullRequestRequest,
  SubmitReviewRequest,
  MergePullRequestRequest,
  OAuthTokenResponse,
  GiteaUser,
  GiteaIssue,
  CreateIssueCommentRequest,
  GiteaComment,
  GiteaPackage
} from "./giteaTypes.js";
import { GiteaPermissionGuard } from "./GiteaPermissionGuard.js";

export interface GiteaClientConfig {
  readonly baseUrl: string;
  readonly apiToken?: string | undefined;
  readonly guard?: GiteaPermissionGuard | undefined;
}

/**
 * Robust HTTP client interfacing with Gitea REST API.
 * Supports repository inspection, branch creation, diff querying, PR workflows, and reviews,
 * with enforced least-privilege permission guardrails.
 */
export class GiteaApiClient {
  private readonly baseUrl: string;
  private readonly apiToken: string | undefined;
  private readonly guard: GiteaPermissionGuard | undefined;

  constructor(config: GiteaClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiToken = config.apiToken;
    this.guard = config.guard;
  }

  /**
   * Retrieves repository metadata.
   */
  public async getRepository(owner: string, repo: string): Promise<GiteaRepository> {
    this.guard?.assertScope("repository", "read");
    return this.request<GiteaRepository>(`/api/v1/repos/${owner}/${repo}`);
  }

  /**
   * Lists branches for a repository.
   */
  public async listBranches(owner: string, repo: string): Promise<GiteaBranch[]> {
    this.guard?.assertScope("repository", "read");
    return this.request<GiteaBranch[]>(`/api/v1/repos/${owner}/${repo}/branches`);
  }

  /**
   * Creates a new branch from an existing base branch.
   */
  public async createBranch(owner: string, repo: string, req: CreateBranchRequest): Promise<GiteaBranch> {
    this.guard?.assertScope("repository", "write");
    this.guard?.assertBranchModificationPermitted(req.new_branch_name);
    return this.request<GiteaBranch>(`/api/v1/repos/${owner}/${repo}/branches`, {
      method: "POST",
      body: JSON.stringify(req)
    });
  }

  /**
   * Lists issues for a repository.
   */
  public async listIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open"
  ): Promise<GiteaIssue[]> {
    this.guard?.assertScope("issue", "read");
    return this.request<GiteaIssue[]>(`/api/v1/repos/${owner}/${repo}/issues?state=${state}`);
  }

  /**
   * Retrieves a single issue by number.
   */
  public async getIssue(owner: string, repo: string, issueNumber: number): Promise<GiteaIssue> {
    this.guard?.assertScope("issue", "read");
    return this.request<GiteaIssue>(`/api/v1/repos/${owner}/${repo}/issues/${issueNumber}`);
  }

  /**
   * Creates a comment on an issue or PR.
   */
  public async createIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    comment: CreateIssueCommentRequest
  ): Promise<GiteaComment> {
    this.guard?.assertScope("issue", "write");
    return this.request<GiteaComment>(`/api/v1/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: "POST",
      body: JSON.stringify(comment)
    });
  }

  /**
   * Lists packages for an owner/organization.
   */
  public async listPackages(owner: string): Promise<GiteaPackage[]> {
    this.guard?.assertScope("package", "read");
    return this.request<GiteaPackage[]>(`/api/v1/packages/${owner}`);
  }

  /**
   * Opens a new Pull Request.
   */
  public async createPullRequest(owner: string, repo: string, req: CreatePullRequestRequest): Promise<GiteaPullRequest> {
    this.guard?.assertScope("repository", "write");
    this.guard?.assertBranchModificationPermitted(req.head);
    return this.request<GiteaPullRequest>(`/api/v1/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify(req)
    });
  }

  /**
   * Fetches unified diff for a Pull Request.
   */
  public async getPullRequestDiff(owner: string, repo: string, prNumber: number): Promise<string> {
    this.guard?.assertScope("repository", "read");
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}.diff`;
    const headers: Record<string, string> = {};
    if (this.apiToken) {
      headers["Authorization"] = `token ${this.apiToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch PR diff (${res.status}): ${await res.text()}`);
    }
    return res.text();
  }

  /**
   * Submits a structured code review (APPROVE, REQUEST_CHANGES, COMMENT) with optional inline comments.
   */
  public async submitPullRequestReview(
    owner: string,
    repo: string,
    prNumber: number,
    review: SubmitReviewRequest
  ): Promise<void> {
    this.guard?.assertScope("repository", "write");
    await this.request<void>(`/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
      method: "POST",
      body: JSON.stringify(review)
    });
  }

  /**
   * Merges an approved Pull Request.
   */
  public async mergePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    mergeReq: MergePullRequestRequest
  ): Promise<void> {
    this.guard?.assertScope("repository", "write");
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.request<void>(`/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
          method: "POST",
          body: JSON.stringify(mergeReq)
        });
        return;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // Gitea returns 405 Method Not Allowed ("Please try again later") while conflict checking is in progress
        if (errMsg.includes("405") && errMsg.includes("Please try again later") && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Exchanges OAuth2 authorization code for access tokens.
   */
  public async exchangeOAuthCode(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    });

    const res = await fetch(`${this.baseUrl}/login/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: params.toString()
    });

    if (!res.ok) {
      throw new Error(`Gitea OAuth token exchange failed (${res.status}): ${await res.text()}`);
    }

    return (await res.json()) as OAuthTokenResponse;
  }

  /**
   * Fetches authenticated user profile using an OAuth access token.
   */
  public async getAuthenticatedUser(accessToken: string): Promise<GiteaUser> {
    const res = await fetch(`${this.baseUrl}/api/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Gitea user (${res.status}): ${await res.text()}`);
    }

    return (await res.json()) as GiteaUser;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>)
    };

    if (this.apiToken && !headers["Authorization"]) {
      headers["Authorization"] = `token ${this.apiToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gitea API Error [${response.status} ${response.statusText}] at ${endpoint}: ${errorText}`);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return undefined as unknown as T;
    }

    return JSON.parse(text) as T;
  }
}
