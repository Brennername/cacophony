import type { TaskRecord } from "@cacophony/shared-types";

export interface GitHubIssue {
  readonly number: number;
  readonly title: string;
  readonly body?: string | undefined;
  readonly labels: Array<{ readonly name: string } | string>;
  readonly state: "open" | "closed";
  readonly html_url: string;
}

export interface GitHubIssueSyncDaemonOptions {
  readonly repoOwner?: string | undefined;
  readonly repoName?: string | undefined;
  readonly githubToken?: string | undefined;
  readonly pollIntervalMs?: number | undefined;
  readonly targetLabel?: string | undefined;
}

/**
 * GitHubIssueSyncDaemon
 *
 * Implements bi-directional GitHub issue synchronization (Phase 84 T84.3 & T84.4).
 * Polls upstream GitHub issues labeled 'arena:auto', parses them into structured
 * TaskRecord rows, prevents duplicates, and updates issues with verification comments.
 */
export class GitHubIssueSyncDaemon {
  private isRunning = false;
  private timerHandle?: NodeJS.Timeout | undefined;

  private readonly repoOwner: string;
  private readonly repoName: string;
  private readonly githubToken: string;
  private readonly pollIntervalMs: number;
  private readonly targetLabel: string;

  constructor(
    private readonly taskRepo: {
      getByTitle: (title: string) => Promise<TaskRecord | null>;
      createIfNotExists: (task: TaskRecord) => Promise<{ created: boolean; task: TaskRecord }>;
      listRecent?: (limit?: number) => Promise<readonly TaskRecord[]>;
    },
    options?: GitHubIssueSyncDaemonOptions
  ) {
    this.repoOwner = options?.repoOwner || process.env.GITHUB_REPO_OWNER || "NeXeN";
    this.repoName = options?.repoName || process.env.GITHUB_REPO_NAME || "cacophony";
    this.githubToken = options?.githubToken || process.env.GITHUB_TOKEN || "";
    this.pollIntervalMs = options?.pollIntervalMs ?? 300_000; // 5 minutes default
    this.targetLabel = options?.targetLabel || "arena:auto";
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextPoll();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = undefined;
    }
  }

  /**
   * Executes a single polling iteration fetching candidate issues and enqueuing new tasks.
   */
  public async pollOnce(): Promise<number> {
    try {
      const issues = await this.fetchCandidateIssues();
      let ingestedCount = 0;

      for (const issue of issues) {
        const isDupe = await this.isDuplicate(issue.number, issue.title);
        if (isDupe) continue;

        const task = this.parseIssueToTask(issue);
        const res = await this.taskRepo.createIfNotExists(task);
        if (res.created) {
          ingestedCount++;
        }
      }

      return ingestedCount;
    } catch (err: any) {
      console.warn(`[GitHubIssueSyncDaemon] Polling warning: ${err?.message}`);
      return 0;
    }
  }

  /**
   * Fetches issues labeled with the configured auto-label from GitHub.
   */
  public async fetchCandidateIssues(): Promise<readonly GitHubIssue[]> {
    if (!this.githubToken) {
      return [];
    }

    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues?state=open&labels=${encodeURIComponent(this.targetLabel)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${this.githubToken}`,
        "User-Agent": "Cacophony-Arena-Sync"
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as any[];
    return data.filter((item) => !item.pull_request);
  }

  /**
   * Checks whether an issue has already been enqueued or completed in the arena.
   */
  public async isDuplicate(_issueNumber: number, title: string): Promise<boolean> {
    const existing = await this.taskRepo.getByTitle(title);
    return existing !== null;
  }

  /**
   * Transforms a GitHub issue into a typed TaskRecord.
   */
  public parseIssueToTask(issue: GitHubIssue): TaskRecord {
    const focusFileMatch = (issue.body || "").match(/(?:Focus File|Focus Files|File):\s*`?([a-zA-Z0-9_./\\-]+)`?/i);
    const focusFiles = focusFileMatch ? focusFileMatch[1] : null;

    const testMatch = (issue.body || "").match(/(?:Test|Test Command):\s*`?([^`\n]+)`?/i);
    const testCommand = testMatch ? testMatch[1]!.trim() : "npm test";

    return {
      id: `gh-issue-${issue.number}`,
      title: issue.title,
      prompt: `[GITHUB ISSUE #${issue.number}]: ${issue.title}\n\n${issue.body || ""}`,
      role: "implementer",
      status: "PENDING",
      priority: "P1",
      modelAssigned: null,
      testCommand,
      focusFiles: focusFiles ?? null,
      targetBranch: "main",
      prUrl: null,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };
  }

  /**
   * Posts an automated verification status comment on a GitHub issue.
   */
  public async postVerificationStatus(issueNumber: number, comment: string): Promise<void> {
    if (!this.githubToken) return;
    try {
      const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues/${issueNumber}/comments`;
      await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${this.githubToken}`,
          "User-Agent": "Cacophony-Arena-Sync",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ body: comment })
      });
    } catch {
      // non-fatal
    }
  }

  /**
   * Closes a GitHub issue upon successful staging merge and promotion.
   */
  public async closeResolvedIssue(issueNumber: number): Promise<void> {
    if (!this.githubToken) return;
    try {
      const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues/${issueNumber}`;
      await fetch(url, {
        method: "PATCH",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${this.githubToken}`,
          "User-Agent": "Cacophony-Arena-Sync",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ state: "closed" })
      });
    } catch {
      // non-fatal
    }
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;
    this.timerHandle = setTimeout(async () => {
      await this.pollOnce();
      this.scheduleNextPoll();
    }, this.pollIntervalMs);
  }
}
