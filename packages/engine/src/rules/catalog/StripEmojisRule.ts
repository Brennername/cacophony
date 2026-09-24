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
 * Unicode emoji regex excluding musical notes (U+2669 - U+266F).
 */
const EMOJI_REGEX = /(?![\u2669-\u266F])[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

/**
 * StripEmojisRule
 *
 * Scans source and markdown documents for unicode emoji ranges,
 * stripping them in silent_repair mode or alerting under warning/rejection.
 */
export class StripEmojisRule extends BaseRepairRule {
  readonly id = "strip_emojis";
  readonly name = "Strip Emojis";
  readonly description = "Removes emojis from code, comments, and documentation while preserving musical notation symbols.";
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

      if (EMOJI_REGEX.test(content)) {
        // Reset regex index
        EMOJI_REGEX.lastIndex = 0;

        if (severity === "silent_repair") {
          const stripped = content.replace(EMOJI_REGEX, "");
          mutations.push({
            filePath,
            originalContent: content,
            updatedContent: stripped,
            description: "Stripped forbidden emoji unicode characters",
          });
        } else if (severity === "hard_rejection") {
          passed = false;
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `File contains forbidden emoji characters: ${filePath}`,
            filePath,
          });
        } else if (severity === "soft_warning") {
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Warning: Emoji character detected in ${filePath}`,
            filePath,
          });
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
