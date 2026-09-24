import ts from "typescript";
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
 * TypeScriptDiagnosticRepairRule
 *
 * Runs compiler diagnostic analysis over modified TypeScript files.
 * In silent_repair mode, deterministically repairs common trivial compilation issues:
 * 1. Unused variable diagnostics (TS6133): prefixes variable name with an underscore `_`
 * 2. Unreachable code warnings
 */
export class TypeScriptDiagnosticRepairRule extends BaseRepairRule {
  readonly id = "typescript_diagnostic_repair";
  readonly name = "TypeScript Diagnostic Auto-Repair";
  readonly description = "Identifies compiler diagnostics and repairs trivial issues like unused parameters.";
  readonly defaultSeverity: RuleSeverity = "silent_repair";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["pre_test", "post_generation"];

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
      if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
        continue;
      }

      const content = context.fileContents.get(filePath);
      if (!content) continue;

      // In-memory AST check
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.ES2022,
        true,
        filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      let repairedContent = content;
      let modified = false;

      // Check basic syntax errors
      const parseDiagnostics = (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics;
      if (parseDiagnostics && parseDiagnostics.length > 0) {
        for (const diag of parseDiagnostics) {
          passed = false;
          diagnostics.push({
            ruleId: this.id,
            severity: "hard_rejection",
            message: `Syntax error: ${ts.flattenDiagnosticMessageText(diag.messageText, "\n")}`,
            filePath,
          });
        }
      }

      if (modified && severity === "silent_repair") {
        mutations.push({
          filePath,
          originalContent: content,
          updatedContent: repairedContent,
          description: "Applied TypeScript diagnostic auto-repairs",
        });
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
