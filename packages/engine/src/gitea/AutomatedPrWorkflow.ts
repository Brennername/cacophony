import type { GiteaApiClient } from "./GiteaApiClient.js";
import type { GitWorktreeManager, WorktreeDescriptor } from "./GitWorktreeManager.js";
import type { GiteaPullRequest } from "./giteaTypes.js";

export interface AutomatedPrOptions {
  readonly owner: string;
  readonly repo: string;
  readonly taskId: string;
  readonly title: string;
  readonly testSummary: string;
  readonly commitMessage: string;
  readonly baseBranch?: string;
}

export interface AutomatedPrResult {
  readonly success: boolean;
  readonly pullRequest?: GiteaPullRequest;
  readonly branchName: string;
  readonly error?: string;
}

/**
 * Automates the git branch push, PR creation, and task metadata attachment
 * to internal Gitea instance.
 */
export class AutomatedPrWorkflow {
  private readonly giteaClient: GiteaApiClient;
  private readonly worktreeManager: GitWorktreeManager;

  constructor(giteaClient: GiteaApiClient, worktreeManager: GitWorktreeManager) {
    this.giteaClient = giteaClient;
    this.worktreeManager = worktreeManager;
  }

  /**
   * Pushes the task branch and opens a Pull Request on Gitea.
   */
  public async publishPullRequest(
    worktree: WorktreeDescriptor,
    options: AutomatedPrOptions
  ): Promise<AutomatedPrResult> {
    try {
      // 1. Commit any remaining changes in the worktree
      await this.worktreeManager.commitWorktree(worktree.worktreePath, options.commitMessage);

      // 2. Push branch to remote
      await this.worktreeManager.pushBranch(worktree.worktreePath, "origin", worktree.branchName);

      // 3. Format PR body with task references and test outputs
      const prBody = this.buildPrDescription(options.taskId, options.testSummary);

      // 4. Open PR via Gitea API
      const pr = await this.giteaClient.createPullRequest(options.owner, options.repo, {
        title: options.title,
        body: prBody,
        head: worktree.branchName,
        base: options.baseBranch ?? "main"
      });

      return {
        success: true,
        pullRequest: pr,
        branchName: worktree.branchName
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        branchName: worktree.branchName,
        error: message
      };
    }
  }

  private buildPrDescription(taskId: string, testSummary: string): string {
    return [
      `## Cacophony Automated PR for Task [${taskId}]`,
      "",
      "### Verification Summary",
      "```",
      testSummary.trim(),
      "```",
      "",
      "> Automatically generated and verified by Cacophony Autonomous Engine."
    ].join("\n");
  }
}
