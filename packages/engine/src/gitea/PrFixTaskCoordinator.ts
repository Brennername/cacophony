import {
  type TaskRecord,
  type StructuredAssessmentReport,
  type AssessmentFinding,
  buildStageRoundKey,
} from "@cacophony/shared-types";
import type { TaskRepository } from "@cacophony/db";
import type { GiteaApiClient } from "./GiteaApiClient.js";

export interface EnqueuePrFixInput {
  readonly workItemId: string;
  readonly parentTaskId: string;
  readonly prNumber: number;
  readonly prBranch: string;
  readonly currentRound: number;
  readonly headSha: string;
  readonly report: StructuredAssessmentReport;
  readonly targetBranch?: string | undefined;
  readonly priority?: "P0" | "P1" | "P2" | undefined;
}

export interface EnqueuePrFixResult {
  readonly enqueued: boolean;
  readonly task?: TaskRecord | undefined;
  readonly stageRoundKey: string;
  readonly reason?: string | undefined;
}

/**
 * PrFixTaskCoordinator
 *
 * Coordinates targeted remediation tasks for autonomous pull requests:
 * - T88.4.2: Enqueues targeted PR-fix tasks containing only validated findings, affected files,
 *   line numbers, and deterministic hints instead of generic re-runs.
 * - T88.4.3: Directs fix commits to update the existing PR branch rather than creating duplicate branches,
 *   advancing the assessment round upon push.
 */
export class PrFixTaskCoordinator {
  private readonly taskRepo: TaskRepository;
  private readonly giteaClient?: GiteaApiClient | undefined;

  constructor(taskRepo: TaskRepository, giteaClient?: GiteaApiClient) {
    this.taskRepo = taskRepo;
    this.giteaClient = giteaClient;
  }

  public getGiteaClient(): GiteaApiClient | undefined {
    return this.giteaClient;
  }

  /**
   * Enqueues a targeted fix task in the database keyed by work item and round.
   */
  public async enqueueFixTask(input: EnqueuePrFixInput): Promise<EnqueuePrFixResult> {
    const nextRound = input.currentRound + 1;
    const stageRoundKey = buildStageRoundKey(
      input.workItemId,
      "fix",
      nextRound,
      input.headSha,
    );

    // Idempotency: verify no active task already exists for this stageRoundKey
    const existing = await this.taskRepo.findByStageRoundKey(stageRoundKey);
    if (existing) {
      return {
        enqueued: false,
        task: existing,
        stageRoundKey,
        reason: `Task already exists for stage-round key '${stageRoundKey}'`,
      };
    }

    // Filter actionable findings (skip info-only findings unless they have fix hints)
    const actionableFindings = input.report.findings.filter(
      (f) => f.severity !== "info" || Boolean(f.deterministicFixHint),
    );

    if (actionableFindings.length === 0) {
      return {
        enqueued: false,
        stageRoundKey,
        reason: "No actionable findings found in assessment report",
      };
    }

    const uniquePaths = Array.from(new Set(actionableFindings.map((f) => f.path)));
    const findingIds = actionableFindings.map((f) => f.id);
    const prompt = this.buildTargetedPrompt(
      input.prNumber,
      input.prBranch,
      nextRound,
      actionableFindings,
    );

    const taskTitle = `[PR Fix R${nextRound}] Address reviewer findings on PR #${input.prNumber}`;
    const nowIso = new Date().toISOString();

    const fixTaskRecord: TaskRecord = {
      id: `task-fix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: taskTitle,
      prompt,
      role: "fixer",
      status: "PENDING",
      priority: input.priority ?? "P0",
      modelAssigned: null,
      testCommand: null,
      focusFiles: uniquePaths.join(","),
      targetBranch: input.prBranch, // Crucial: targets the existing PR branch (T88.4.3)
      prUrl: null,
      failureCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: null,
      workItemId: input.workItemId,
      lineageStage: "fix",
      assessmentRound: nextRound,
      headSha: input.headSha,
      stageRoundKey,
      findingIds,
      fixSourceTaskId: input.parentTaskId,
      metadataHints: {
        lineage: {
          workItemId: input.workItemId,
          stage: "fix",
          round: nextRound,
          headSha: input.headSha,
          stageRoundKey,
          findingIds,
          fixSourceTaskId: input.parentTaskId,
        },
      },
    };

    const task = await this.taskRepo.create(fixTaskRecord);

    return {
      enqueued: true,
      task,
      stageRoundKey,
    };
  }

  private buildTargetedPrompt(
    prNumber: number,
    prBranch: string,
    round: number,
    findings: readonly AssessmentFinding[],
  ): string {
    const lines = [
      `Remediate specific findings identified by independent review on PR #${prNumber} (Branch: \`${prBranch}\`, Round ${round}):`,
      "",
      "### Targeted Review Findings to Remediate",
    ];

    findings.forEach((f, idx) => {
      lines.push(
        `${idx + 1}. **[${f.severity.toUpperCase()}]** \`${f.category}\` in \`${f.path}${f.lineNumber ? `:${f.lineNumber}` : ""}\`:`,
        `   - Message: ${f.message}`,
      );
      if (f.deterministicFixHint) {
        lines.push(`   - Deterministic Fix Hint: ${f.deterministicFixHint}`);
      }
      if (f.rationale) {
        lines.push(`   - Rationale: ${f.rationale}`);
      }
    });

    lines.push(
      "",
      "### Execution Directives",
      "- Target only the affected files and lines described above.",
      "- Make surgical, minimal method replacements without modifying unaffected functions.",
      "- Run all targeted tests to ensure zero regressions before completing.",
    );

    return lines.join("\n");
  }
}
