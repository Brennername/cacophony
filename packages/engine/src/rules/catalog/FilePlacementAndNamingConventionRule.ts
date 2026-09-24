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

export interface FilePlacementAndNamingOptions {
  readonly disallowPhaseNaming?: boolean;
  readonly enforceColocatedAngularSpecs?: boolean;
}

/**
 * FilePlacementAndNamingConventionRule
 *
 * Enforces repository directory conventions, rejects phase-numbered filenames (e.g. phaseXX),
 * and ensures component unit tests are co-located in their respective component directories.
 */
export class FilePlacementAndNamingConventionRule extends BaseRepairRule {
  readonly id = "file_placement_and_naming";
  readonly name = "File Placement and Naming Convention Guard";
  readonly description = "Prevents phase-numbered filenames and ensures tests and components are properly co-located.";
  readonly defaultSeverity: RuleSeverity = "hard_rejection";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["post_generation", "pre_test"];

  public async evaluate(
    context: RuleEvaluationContext,
    severity: RuleSeverity,
    options?: FilePlacementAndNamingOptions
  ): Promise<RuleExecutionResult> {
    const start = performance.now();
    const diagnostics: RuleDiagnostic[] = [];
    const mutations: FileMutation[] = [];
    let passed = true;

    const disallowPhaseNaming = options?.disallowPhaseNaming ?? true;
    const enforceColocatedAngularSpecs = options?.enforceColocatedAngularSpecs ?? true;

    for (const filePath of context.modifiedFiles) {
      const relPath = path.isAbsolute(filePath)
        ? path.relative(context.projectRoot, filePath)
        : filePath;
      const normalizedPath = relPath.replace(/\\/g, "/");
      const baseName = path.basename(filePath);

      // Check 1: Disallow phase-numbered filenames (e.g. phase15-components.spec.ts, phase1.ts)
      if (disallowPhaseNaming && /phase\d+/i.test(baseName)) {
        if (severity === "hard_rejection") {
          passed = false;
        }
        diagnostics.push({
          ruleId: this.id,
          severity,
          message: `Disallowed phase-numbered filename: "${baseName}". Code and tests must describe domain functionality, not milestone phases.`,
          filePath,
        });
      }

      // Check 2: Disallow loose component spec files in the parent components directory
      // (e.g. packages/frontend/src/app/components/*.spec.ts or src/app/components/*.spec.ts)
      if (enforceColocatedAngularSpecs) {
        const looseComponentSpecPattern = /(?:^|\/)src\/app\/components\/[^/]+\.spec\.ts$/;
        if (looseComponentSpecPattern.test(normalizedPath)) {
          if (severity === "hard_rejection") {
            passed = false;
          }
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Misplaced component test file: "${normalizedPath}". Angular component spec files must be co-located with their target component inside a dedicated subfolder (e.g. components/<name>/<name>.component.spec.ts).`,
            filePath,
          });
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
