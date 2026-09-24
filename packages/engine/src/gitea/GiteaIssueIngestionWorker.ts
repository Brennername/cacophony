import type { GiteaApiClient } from "./GiteaApiClient.js";
import type { TaskRepository } from "@cacophony/db";
import type { GiteaIssue } from "./giteaTypes.js";

export interface IssueIngestionOptions {
  readonly owner: string;
  readonly repo: string;
  readonly labelFilter?: string;
  readonly maxTasksToEnqueue?: number;
}

export interface IngestionResult {
  readonly totalIngested: number;
  readonly taskIds: readonly string[];
}

/**
 * Worker that polls or processes Gitea issues, converting issues with target labels into arena tasks,
 * and posting progress status updates back to the issue thread.
 */
export class GiteaIssueIngestionWorker {
  private readonly client: GiteaApiClient;
  private readonly taskRepo: TaskRepository;

  constructor(client: GiteaApiClient, taskRepo: TaskRepository) {
    this.client = client;
    this.taskRepo = taskRepo;
  }

  /**
   * Ingests open issues from repository and enqueues matching issues as tasks.
   */
  public async ingestIssues(options: IssueIngestionOptions): Promise<IngestionResult> {
    const issues = await this.client.listIssues(options.owner, options.repo, "open");
    const enqueuedTaskIds: string[] = [];

    const label = options.labelFilter ? options.labelFilter.toLowerCase() : undefined;
    const max = options.maxTasksToEnqueue ?? 50;

    for (const issue of issues) {
      if (enqueuedTaskIds.length >= max) {
        break;
      }

      if (label && !this.issueHasLabel(issue, label)) {
        continue;
      }

      const taskId = `gitea-issue-${issue.number}-${Date.now()}`;
      await this.taskRepo.create({
        id: taskId,
        title: `[Gitea Issue #${issue.number}] ${issue.title}`,
        prompt: `Implement requirement from Gitea Issue #${issue.number}:\n\nTitle: ${issue.title}\nDescription:\n${issue.body}`,
        role: "implementer",
        status: "PENDING",
        priority: issue.title.toLowerCase().includes("[urgent]") ? "P0" : "P1",
        modelAssigned: null,
        testCommand: null,
        focusFiles: null,
        targetBranch: "main",
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      });

      enqueuedTaskIds.push(taskId);

      // Post status comment back to issue
      await this.client.createIssueComment(options.owner, options.repo, issue.number, {
        body: `Cacophony Taskcade has ingested this issue into the autonomous arena.\nTask ID: \`${taskId}\`\nStatus: \`PENDING\``
      });
    }

    return {
      totalIngested: enqueuedTaskIds.length,
      taskIds: enqueuedTaskIds
    };
  }

  private issueHasLabel(issue: GiteaIssue, targetLabel: string): boolean {
    if (!issue.labels || issue.labels.length === 0) {
      return false;
    }
    return issue.labels.some((l) => l.name.toLowerCase() === targetLabel);
  }
}
