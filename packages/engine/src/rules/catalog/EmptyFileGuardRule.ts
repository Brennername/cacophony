import {
  RuleSeverity,
  RuleLifecycleHook,
  RuleEvaluationContext,
  RuleExecutionResult,
  RuleDiagnostic,
  FileMutation,
} from "@cacophony/shared-types";
import { BaseRepairRule } from "../BaseRepairRule.js";

/**
 * EmptyFileGuardRule
 *
 * Rejects or strips 0-byte or whitespace-only files created or modified by models.
 */
export class EmptyFileGuardRule extends BaseRepairRule {
  readonly id = "empty_files";
  readonly name = "Empty File Guard";
  readonly description = "Detects 0-byte or whitespace-only files produced during generation and rejects or warns.";
  readonly defaultSeverity: RuleSeverity = "hard_rejection";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["post_generation", "pre_test"];

  public async evaluate(
    context: RuleEvaluationContext,
    severity: RuleSeverity,
    _options?: Record<string, unknown>
  ): Promise<RuleExecutionResult> {
    const start = performance.now();
    const diagnostics: RuleDiagnostic[] = [];
    const mutations: FileMutation[] = [];
    let passed = true;

    for (const filePath of context.modifiedFiles) {
      const content = context.fileContents.get(filePath);
      if (content === undefined) continue;

      if (content.trim().length === 0) {
        if (severity === "hard_rejection") {
          passed = false;
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Empty or whitespace-only file detected: ${filePath}`,
            filePath,
          });
        } else if (severity === "soft_warning") {
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Warning: Empty file detected: ${filePath}`,
            filePath,
          });
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
