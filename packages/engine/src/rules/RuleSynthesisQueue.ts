/**
 * RuleSynthesisQueue
 *
 * Harvests recurring compiler diagnostic errors and syntactic anomalies across
 * task runs, automatically aggregating recurring failure patterns and queueing
 * high-priority meta-tasks to generate declarative repair rules for RulePipelineEngine.
 */

import type { TaskRepository } from "@cacophony/db";

export interface DiagnosticOccurrence {
  readonly code: string;
  readonly message: string;
  readonly filePath?: string | undefined;
  readonly timestamp: number;
}

export interface RuleSynthesisCandidate {
  readonly code: string;
  readonly occurrences: number;
  readonly sampleMessages: readonly string[];
  readonly affectedFiles: readonly string[];
  readonly firstSeen: number;
  readonly lastSeen: number;
}

export interface RuleSynthesisQueueOptions {
  readonly thresholdForSynthesis?: number | undefined;
}

export class RuleSynthesisQueue {
  private readonly threshold: number;
  private readonly occurrencesByCode = new Map<string, DiagnosticOccurrence[]>();
  private readonly enqueuedCodes = new Set<string>();

  constructor(options: RuleSynthesisQueueOptions = {}) {
    this.threshold = options.thresholdForSynthesis ?? 3;
  }

  /**
   * Records a compiler diagnostic occurrence for synthesis analysis.
   */
  public recordDiagnostic(code: string, message: string, filePath?: string): void {
    const normalizedCode = code.toUpperCase().trim();
    const list = this.occurrencesByCode.get(normalizedCode) ?? [];
    list.push({
      code: normalizedCode,
      message,
      filePath,
      timestamp: Date.now(),
    });
    this.occurrencesByCode.set(normalizedCode, list);
  }

  /**
   * Retrieves all candidate diagnostic codes that have met or exceeded the occurrence threshold.
   */
  public getHarvestedCandidates(): readonly RuleSynthesisCandidate[] {
    const candidates: RuleSynthesisCandidate[] = [];

    for (const [code, items] of this.occurrencesByCode.entries()) {
      if (items.length >= this.threshold) {
        const sampleMessages = Array.from(new Set(items.map((i) => i.message))).slice(0, 5);
        const affectedFiles = Array.from(
          new Set(items.map((i) => i.filePath).filter((f): f is string => Boolean(f)))
        ).slice(0, 5);

        candidates.push({
          code,
          occurrences: items.length,
          sampleMessages,
          affectedFiles,
          firstSeen: items[0]?.timestamp ?? Date.now(),
          lastSeen: items[items.length - 1]?.timestamp ?? Date.now(),
        });
      }
    }

    return candidates.sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Synthesizes a declarative TypeScript repair rule template from candidate data.
   */
  public synthesizeDeclarativeRule(candidate: RuleSynthesisCandidate): string {
    const ruleClassName = `AutoSynthesized${candidate.code}RepairRule`;
    const samplesComment = candidate.sampleMessages
      .map((m) => ` * - ${m}`)
      .join("\n");

    return `import { BaseRepairRule } from "../BaseRepairRule.js";
import type { RuleEvaluationContext, RuleExecutionResult } from "@cacophony/shared-types";

/**
 * ${ruleClassName}
 * Auto-synthesized deterministic repair rule targeting ${candidate.code}.
 *
 * Sample compiler diagnostics:
${samplesComment}
 */
export class ${ruleClassName} extends BaseRepairRule {
  public readonly id = "rule-${candidate.code.toLowerCase()}-auto-synthesized";
  public readonly name = "${candidate.code} Auto Repair";
  public readonly description = "Deterministic auto-repair for compiler diagnostic ${candidate.code}";
  public readonly lifecycle = "post_generation";

  public async evaluate(context: RuleEvaluationContext): Promise<RuleExecutionResult> {
    const modifiedFiles: string[] = [];
    const mutations = [];

    for (const [filePath, content] of context.fileContents.entries()) {
      // Deterministic surgical repair logic for ${candidate.code}
      let repaired = content;
      // Pattern match and clean target anomaly
      if (repaired !== content) {
        modifiedFiles.push(filePath);
        mutations.push({
          filePath,
          originalContent: content,
          updatedContent: repaired,
          description: "Synthesized repair for ${candidate.code}",
        });
      }
    }

    return {
      passed: true,
      modifiedFiles,
      mutations,
    };
  }
}
`;
  }

  /**
   * Automatically enqueues a high-priority meta-task into TaskRepository to build and register
   * the synthesized declarative rule.
   */
  public async enqueueMetaRuleTask(
    candidate: RuleSynthesisCandidate,
    taskRepo?: TaskRepository
  ): Promise<string | null> {
    if (this.enqueuedCodes.has(candidate.code)) {
      return null;
    }

    const taskId = `meta-rule-${candidate.code.toLowerCase()}-${Date.now()}`;
    const ruleCode = this.synthesizeDeclarativeRule(candidate);

    if (taskRepo) {
      const now = new Date().toISOString();
      await taskRepo.createIfNotExists({
        id: taskId,
        title: `Auto-Synthesize Declarative Rule for ${candidate.code}`,
        prompt: `Implement deterministic repair rule for compiler error ${candidate.code}.\n\nCandidate details:\nOccurrences: ${candidate.occurrences}\nSamples: ${candidate.sampleMessages.join("; ")}\n\nTemplate:\n\`\`\`typescript\n${ruleCode}\n\`\`\``,
        role: "architect",
        status: "PENDING",
        priority: "P0",
        modelAssigned: null,
        testCommand: null,
        focusFiles: null,
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      });
    }

    this.enqueuedCodes.add(candidate.code);
    return taskId;
  }

  /**
   * Clears accumulated diagnostic occurrences.
   */
  public reset(): void {
    this.occurrencesByCode.clear();
    this.enqueuedCodes.clear();
  }
}
