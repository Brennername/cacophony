import path from "node:path";
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
 * LooseRootFileGuardRule
 *
 * Prevents generated code from spilling into the root repository folder,
 * requiring code and tests to live within designated subpackages (e.g. packages/* or src/*).
 */
export class LooseRootFileGuardRule extends BaseRepairRule {
  readonly id = "loose_root_files";
  readonly name = "Loose Root File Guard";
  readonly description = "Prevents LLMs from creating loose source or test files directly in the repository root directory.";
  readonly defaultSeverity: RuleSeverity = "soft_warning";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["post_generation", "pre_test"];

  private readonly allowedRootFiles = new Set([
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "README.md",
    "LICENSE",
    ".gitignore",
    ".gitmodules",
    "cacophony.json",
  ]);

  public async evaluate(
    context: RuleEvaluationContext,
    severity: RuleSeverity,
    options?: { allowedRootFiles?: string[] }
  ): Promise<RuleExecutionResult> {
    const start = performance.now();
    const diagnostics: RuleDiagnostic[] = [];
    const mutations: FileMutation[] = [];
    let passed = true;

    const allowed = options?.allowedRootFiles
      ? new Set([...this.allowedRootFiles, ...options.allowedRootFiles])
      : this.allowedRootFiles;

    for (const filePath of context.modifiedFiles) {
      const relPath = path.isAbsolute(filePath)
        ? path.relative(context.projectRoot, filePath)
        : filePath;

      // Check if file is directly in the project root (no subdirectory slashes)
      if (!relPath.includes(path.sep) && !relPath.includes("/")) {
        if (!allowed.has(relPath)) {
          if (severity === "hard_rejection") {
            passed = false;
            diagnostics.push({
              ruleId: this.id,
              severity,
              message: `Disallowed loose file created in project root: ${relPath}`,
              filePath,
            });
          } else if (severity === "soft_warning") {
            diagnostics.push({
              ruleId: this.id,
              severity,
              message: `Warning: File placed directly in project root instead of package: ${relPath}`,
              filePath,
            });
          }
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
