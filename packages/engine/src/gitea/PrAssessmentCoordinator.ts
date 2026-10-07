import type { TaskRecord, ReviewVerdict } from "@cacophony/shared-types";
import type { TaskRepository } from "@cacophony/db";
import type { GiteaApiClient } from "./GiteaApiClient.js";
import type { ConsensusReviewSynthesis } from "../inference/ReviewOpinionSynthesizer.js";

export interface PrAssessmentRequest {
  readonly task: TaskRecord;
  readonly prNumber?: number | undefined;
  readonly synthesis: ConsensusReviewSynthesis;
  readonly owner?: string | undefined;
  readonly repo?: string | undefined;
}

export interface PrAssessmentOutcome {
  readonly verdict: ReviewVerdict;
  readonly remediationEnqueued: boolean;
  readonly remediationTaskId?: string | undefined;
  readonly remediationTask?: TaskRecord | undefined;
  readonly commentPosted: boolean;
}

/**
 * PrAssessmentCoordinator
 *
 * Closes the autonomous PR review feedback loop:
 * When consensus evaluation yields REQUEST_CHANGES, it:
 * 1. Posts the synthesized multi-model critique to the Gitea/GitHub PR.
 * 2. Enqueues a high-priority (P0) remediation task in the TaskRepository containing
 *    the exact reviewer findings, file locations, line references, and remediation guidance.
 */
export class PrAssessmentCoordinator {
  private readonly taskRepo: TaskRepository;
  private readonly giteaClient?: GiteaApiClient | undefined;

  constructor(taskRepo: TaskRepository, giteaClient?: GiteaApiClient) {
    this.taskRepo = taskRepo;
    this.giteaClient = giteaClient;
  }

  /**
   * Processes the review synthesis and enqueues remediation if needed.
   */
  public async handleAssessment(
    request: PrAssessmentRequest
  ): Promise<PrAssessmentOutcome> {
    let commentPosted = false;

    // 1. Post markdown review comment to PR if Gitea client is available
    if (this.giteaClient && request.prNumber && request.owner && request.repo) {
      try {
        if ("createIssueComment" in this.giteaClient) {
          await this.giteaClient.createIssueComment(
            request.owner,
            request.repo,
            request.prNumber,
            { body: request.synthesis.markdownComment }
          );
          commentPosted = true;
        } else if ("postReviewComment" in (this.giteaClient as Record<string, unknown>)) {
          await (this.giteaClient as unknown as { postReviewComment: (...args: unknown[]) => Promise<unknown> }).postReviewComment(
            request.owner,
            request.repo,
            request.prNumber,
            request.synthesis.markdownComment
          );
          commentPosted = true;
        }
      } catch {
        // Continue even if comment posting encounters an issue
        commentPosted = false;
      }
    }

    // 2. If verdict is APPROVE, no remediation needed
    if (request.synthesis.consensusVerdict === "APPROVE") {
      return {
        verdict: "APPROVE",
        remediationEnqueued: false,
        commentPosted,
      };
    }

    // 3. Verdict is REQUEST_CHANGES: construct targeted remediation task
    const remediationTaskId = `remediate-${request.task.id}-${Date.now().toString(36)}`;
    const focusPaths = Array.from(
      new Set(request.synthesis.unifiedFindings.map((f) => f.path).filter((p) => p !== "unknown"))
    );

    const remediationPrompt = this.buildRemediationPrompt(
      request.task,
      request.synthesis
    );

    const remediationTask: TaskRecord = {
      id: remediationTaskId,
      title: `[Remediation] Address PR Review for: ${request.task.title}`,
      prompt: remediationPrompt,
      role: "implementer",
      status: "PENDING",
      priority: "P0",
      modelAssigned: request.task.modelAssigned,
      testCommand: request.task.testCommand,
      focusFiles: focusPaths.length > 0 ? focusPaths.join(", ") : request.task.focusFiles,
      targetBranch: request.task.targetBranch,
      prUrl: request.task.prUrl,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      currentStage: "remediation",
      stageState: "PENDING",
    };

    await this.taskRepo.create(remediationTask);

    return {
      verdict: "REQUEST_CHANGES",
      remediationEnqueued: true,
      remediationTaskId,
      remediationTask,
      commentPosted,
    };
  }

  /**
   * Builds an actionable prompt outlining specific findings and line references.
   */
  private buildRemediationPrompt(
    originalTask: TaskRecord,
    synthesis: ConsensusReviewSynthesis
  ): string {
    const lines: string[] = [
      `Remediate code review findings for task: ${originalTask.title}`,
      "",
      `Original Goal: ${originalTask.prompt}`,
      "",
      "Reviewers requested changes with the following specific findings:",
    ];

    for (const finding of synthesis.unifiedFindings) {
      const loc = finding.lineNumber ? ` (line ${finding.lineNumber})` : "";
      lines.push(`- File: ${finding.path}${loc}`);
      lines.push(`  Severity: ${finding.severity.toUpperCase()}`);
      lines.push(`  Issue: ${finding.message}`);
      if (finding.suggestion) {
        lines.push(`  Remediation Directive: ${finding.suggestion}`);
      }
    }

    lines.push(
      "",
      "Instructions:",
      "1. Resolve every reported finding directly in the specified files.",
      "2. Ensure all unit and integration tests pass cleanly.",
      "3. Do not discard existing code or interfaces outside the necessary fixes."
    );

    return lines.join("\n");
  }
}
