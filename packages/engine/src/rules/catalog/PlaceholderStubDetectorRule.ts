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
 * Common lazy placeholder stub patterns emitted by LLMs.
 */
const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /\/\/\s*TODO:\s*(implement|fill|add|later)/i,
  /\/\/\s*\.\.\.\s*rest of code goes here\s*\.\.\./i,
  /\/\/\s*\.\.\.\s*existing code\s*\.\.\./i,
  /\/\/\s*your code here/i,
  /throw\s+new\s+Error\(\s*["']Not implemented["']\s*\)/i,
  /throw\s+new\s+Error\(\s*["']TODO["']\s*\)/i,
];

/**
 * PlaceholderStubDetectorRule
 *
 * Scans code for unfulfilled placeholder comments and stubs,
 * preventing incomplete code from proceeding to automated test loops.
 */
export class PlaceholderStubDetectorRule extends BaseRepairRule {
  readonly id = "placeholder_stubs";
  readonly name = "Placeholder Stub Detector";
  readonly description = "Flags lazy incomplete code stubs, ellipses, and unfulfilled TODO markers.";
  readonly defaultSeverity: RuleSeverity = "soft_warning";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["post_generation", "pre_test"];

  public async evaluate(
    context: RuleEvaluationContext,
    severity: RuleSeverity,
    options?: { maxAllowed?: number }
  ): Promise<RuleExecutionResult> {
    const start = performance.now();
    const diagnostics: RuleDiagnostic[] = [];
    const mutations: FileMutation[] = [];
    let passed = true;
    const maxAllowed = options?.maxAllowed ?? 0;

    for (const filePath of context.modifiedFiles) {
      const content = context.fileContents.get(filePath);
      if (!content) continue;

      let fileStubCount = 0;
      const lines = content.split("\n");

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx]!;
        for (const pattern of PLACEHOLDER_PATTERNS) {
          if (pattern.test(line)) {
            fileStubCount++;
            if (fileStubCount > maxAllowed) {
              if (severity === "hard_rejection") {
                passed = false;
                diagnostics.push({
                  ruleId: this.id,
                  severity,
                  message: `Unimplemented placeholder stub detected: "${line.trim()}"`,
                  filePath,
                  line: lineIdx + 1,
                });
              } else if (severity === "soft_warning") {
                diagnostics.push({
                  ruleId: this.id,
                  severity,
                  message: `Warning: Placeholder stub found: "${line.trim()}"`,
                  filePath,
                  line: lineIdx + 1,
                });
              }
            }
            break;
          }
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
