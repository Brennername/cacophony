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
 * EnforceEsmJsExtensionRule
 *
 * Scans TypeScript / JavaScript relative import and export statements,
 * ensuring they end with explicit `.js` extension (required by NodeNext ESM).
 * Example: `import { foo } from "./foo";` -> `import { foo } from "./foo.js";`
 */
export class EnforceEsmJsExtensionRule extends BaseRepairRule {
  readonly id = "enforce_esm_js";
  readonly name = "Enforce ESM .js Extensions";
  readonly description = "Ensures relative import and export specifiers end with explicit .js extension for NodeNext ESM.";
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

    // Pattern for relative imports/exports missing extensions
    // e.g. from "./foo" or from '../bar'
    const importRegex = /(from\s+["'])((\.\.?\/)[^"'\n]+)(["'])/g;

    for (const filePath of context.modifiedFiles) {
      if (!filePath.endsWith(".ts") && !filePath.endsWith(".js") && !filePath.endsWith(".tsx")) {
        continue;
      }

      const content = context.fileContents.get(filePath);
      if (!content) continue;

      let fileModified = false;
      const updated = content.replace(importRegex, (match, prefix, importPath, _relPrefix, suffix) => {
        // If it already ends with .js, .json, .wasm, .css, etc., keep it
        if (/\.[a-zA-Z0-9]+$/.test(importPath)) {
          return match;
        }

        fileModified = true;
        const fixedPath = `${importPath}.js`;

        if (severity === "hard_rejection") {
          passed = false;
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Missing .js extension on relative import '${importPath}' in ${filePath}`,
            filePath,
          });
        } else if (severity === "soft_warning") {
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Warning: Relative import '${importPath}' is missing .js extension in ${filePath}`,
            filePath,
          });
        }

        return `${prefix}${fixedPath}${suffix}`;
      });

      if (fileModified && severity === "silent_repair") {
        mutations.push({
          filePath,
          originalContent: content,
          updatedContent: updated,
          description: "Appended missing .js extension to relative import specifiers",
        });
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
