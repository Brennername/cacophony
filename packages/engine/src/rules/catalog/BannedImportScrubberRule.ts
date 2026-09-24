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
 * BannedImportScrubberRule
 *
 * Scans code for forbidden package imports (e.g. legacy conductor dependencies,
 * unapproved heavyweight libraries) and strips them or triggers rejection/warning.
 */
export class BannedImportScrubberRule extends BaseRepairRule {
  readonly id = "banned_imports";
  readonly name = "Banned Import Scrubber";
  readonly description = "Detects or strips hallucinated or forbidden third-party library imports.";
  readonly defaultSeverity: RuleSeverity = "hard_rejection";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["post_generation", "pre_test"];

  public async evaluate(
    context: RuleEvaluationContext,
    severity: RuleSeverity,
    options?: { packages?: string[] }
  ): Promise<RuleExecutionResult> {
    const start = performance.now();
    const diagnostics: RuleDiagnostic[] = [];
    const mutations: FileMutation[] = [];
    let passed = true;

    const bannedList = options?.packages ?? ["conductor", "lodash", "python"];
    const bannedPattern = new RegExp(
      `import\\s+.*?from\\s+["'](${bannedList.join("|")})["'];?`,
      "g"
    );

    for (const filePath of context.modifiedFiles) {
      if (!filePath.endsWith(".ts") && !filePath.endsWith(".js") && !filePath.endsWith(".tsx")) {
        continue;
      }

      const content = context.fileContents.get(filePath);
      if (!content) continue;

      if (bannedPattern.test(content)) {
        bannedPattern.lastIndex = 0;

        if (severity === "silent_repair") {
          const stripped = content.replace(bannedPattern, "");
          mutations.push({
            filePath,
            originalContent: content,
            updatedContent: stripped,
            description: "Stripped banned package import statements",
          });
        } else if (severity === "hard_rejection") {
          passed = false;
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Banned package import detected in ${filePath}`,
            filePath,
          });
        } else if (severity === "soft_warning") {
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Warning: Banned package import present in ${filePath}`,
            filePath,
          });
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
