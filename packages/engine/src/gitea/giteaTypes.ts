export interface GiteaUser {
  readonly id: number;
  readonly login: string;
  readonly email: string;
  readonly full_name?: string;
  readonly avatar_url?: string;
}

export interface GiteaRepository {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly owner: GiteaUser;
  readonly default_branch: string;
  readonly clone_url: string;
  readonly ssh_url: string;
  readonly html_url: string;
}

export interface GiteaBranch {
  readonly name: string;
  readonly commit: {
    readonly id: string;
    readonly message: string;
    readonly author: {
      readonly name: string;
      readonly email: string;
    };
  };
}

export interface CreateBranchRequest {
  readonly new_branch_name: string;
  readonly old_branch_name?: string | undefined;
}

export interface CreatePullRequestRequest {
  readonly title: string;
  readonly body: string;
  readonly head: string; // branch containing changes
  readonly base: string; // branch to merge into (e.g. main)
}

export interface GiteaPullRequest {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly state: "open" | "closed";
  readonly merged: boolean;
  readonly head: {
    readonly ref: string;
    readonly sha: string;
  };
  readonly base: {
    readonly ref: string;
    readonly sha: string;
  };
  readonly html_url: string;
  readonly diff_url: string;
}

export interface CreateReviewCommentRequest {
  readonly body: string;
  readonly path?: string | undefined;
  readonly line?: number | undefined;
}

export interface SubmitReviewRequest {
  readonly event: "APPROVED" | "REQUEST_CHANGES" | "COMMENT";
  readonly body?: string | undefined;
  readonly comments?: readonly CreateReviewCommentRequest[] | undefined;
}

export interface MergePullRequestRequest {
  readonly Do: "merge" | "rebase" | "rebase-merge" | "squash" | "manually-merged";
  readonly MergeTitleField?: string | undefined;
  readonly MergeMessageField?: string | undefined;
}

export interface OAuthTokenResponse {
  readonly access_token: string;
  readonly token_type: string;
  readonly expires_in?: number;
  readonly refresh_token?: string;
}

export interface GiteaIssue {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly state: "open" | "closed";
  readonly labels?: readonly { readonly id: number; readonly name: string }[];
  readonly assignee?: GiteaUser | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateIssueCommentRequest {
  readonly body: string;
}

export interface GiteaComment {
  readonly id: number;
  readonly html_url: string;
  readonly body: string;
  readonly user: GiteaUser;
  readonly created_at: string;
}

export interface GiteaPackage {
  readonly id: number;
  readonly owner: GiteaUser;
  readonly type: string;
  readonly name: string;
  readonly version: string;
  readonly created_at: string;
}
