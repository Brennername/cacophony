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
 * WhitespaceAndEolNormalizerRule
 *
 * Normalizes CRLF (\r\n) to LF (\n), trims trailing whitespace per line,
 * and ensures single newline termination at the end of files.
 */
export class WhitespaceAndEolNormalizerRule extends BaseRepairRule {
  readonly id = "whitespace_normalizer";
  readonly name = "Whitespace & EOL Normalizer";
  readonly description = "Normalizes CRLF to LF, trims trailing whitespace on lines, and ensures single newline EOF.";
  readonly defaultSeverity: RuleSeverity = "silent_repair";
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
      if (!content) continue;

      // 1. CRLF -> LF
      let normalized = content.replace(/\r\n/g, "\n");

      // 2. Trim trailing whitespace per line
      normalized = normalized
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/, ""))
        .join("\n");

      // 3. Ensure single EOF newline if non-empty
      if (normalized.length > 0 && !normalized.endsWith("\n")) {
        normalized += "\n";
      }

      if (normalized !== content) {
        if (severity === "silent_repair") {
          mutations.push({
            filePath,
            originalContent: content,
            updatedContent: normalized,
            description: "Normalized line endings and trimmed trailing whitespace",
          });
        } else if (severity === "hard_rejection") {
          passed = false;
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `File contains non-standard whitespace or CRLF endings: ${filePath}`,
            filePath,
          });
        } else if (severity === "soft_warning") {
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Warning: Non-standard whitespace/CRLF found in ${filePath}`,
            filePath,
          });
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
