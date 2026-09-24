import {
  IRepairRule,
  RuleSeverity,
  RuleLifecycleHook,
  RuleEvaluationContext,
  RuleExecutionResult,
  RuleDiagnostic,
  FileMutation,
} from "@cacophony/shared-types";

/**
 * Base abstract class for deterministic repair rules.
 */
export abstract class BaseRepairRule implements IRepairRule {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly defaultSeverity: RuleSeverity;
  abstract readonly applicableHooks: readonly RuleLifecycleHook[];

  abstract evaluate(
    context: RuleEvaluationContext,
    severity: RuleSeverity,
    options?: Record<string, unknown>
  ): Promise<RuleExecutionResult>;

  protected createResult(
    passed: boolean,
    durationMs: number,
    diagnostics: RuleDiagnostic[],
    mutations: FileMutation[],
    severity: RuleSeverity
  ): RuleExecutionResult {
    const hardRejected = !passed && severity === "hard_rejection";
    return {
      ruleId: this.id,
      passed,
      durationMs,
      diagnostics,
      mutations,
      hardRejected,
    };
  }
}
