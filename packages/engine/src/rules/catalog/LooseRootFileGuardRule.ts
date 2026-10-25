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
  readonly description =
    "Prevents LLMs from creating loose source or test files directly in the repository root directory.";
  readonly defaultSeverity: RuleSeverity = "soft_warning";
  readonly applicableHooks: readonly RuleLifecycleHook[] = [
    "post_generation",
    "pre_test",
  ];

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

  /**
   * Validates a file path against root confinement and unauthorized subfolder rules.
   * Returns false if the file is in an unauthorized path/subfolder or is an unauthorized loose root file.
   */
  public validate(
    filePath: string,
    options?: { allowedRootFiles?: string[]; unauthorizedSegments?: string[] },
  ): boolean {
    if (!filePath || typeof filePath !== "string") {
      return false;
    }
    const normalized = filePath.replace(/\\/g, "/");
    const segments = options?.unauthorizedSegments ?? ["unauthorized"];

    for (const segment of segments) {
      if (
        normalized.includes(`/${segment}/`) ||
        normalized.startsWith(`${segment}/`) ||
        normalized.endsWith(`/${segment}`) ||
        normalized === segment
      ) {
        return false;
      }
    }

    if (!normalized.includes("/")) {
      const allowed = options?.allowedRootFiles
        ? new Set([...this.allowedRootFiles, ...options.allowedRootFiles])
        : this.allowedRootFiles;
      return allowed.has(normalized);
    }

    return true;
  }

  public async evaluate(
    context: RuleEvaluationContext,
    severity: RuleSeverity,
    options?: { allowedRootFiles?: string[]; unauthorizedSegments?: string[] },
  ): Promise<RuleExecutionResult> {
    const start = performance.now();
    const diagnostics: RuleDiagnostic[] = [];
    const mutations: FileMutation[] = [];
    let passed = true;

    for (const filePath of context.modifiedFiles) {
      const relPath = path.isAbsolute(filePath)
        ? path.relative(context.projectRoot, filePath)
        : filePath;

      if (!this.validate(relPath, options)) {
        if (severity === "hard_rejection") {
          passed = false;
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Disallowed or unauthorized file path rejected: ${relPath}`,
            filePath,
          });
        } else if (severity === "soft_warning") {
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Warning: Unauthorized or loose file placement: ${relPath}`,
            filePath,
          });
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(
      passed,
      durationMs,
      diagnostics,
      mutations,
      severity,
    );
  }
}
