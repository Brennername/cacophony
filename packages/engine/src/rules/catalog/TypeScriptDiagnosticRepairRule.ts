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
import { CompilerDiagnosticAutoRepair } from "../../testing/CompilerDiagnosticAutoRepair.js";

/**
 * TypeScriptDiagnosticRepairRule
 *
 * Runs compiler diagnostic analysis over modified TypeScript files.
 * In silent_repair mode, deterministically repairs common trivial compilation issues:
 * 1. Missing test runner shims for 'jest' / 'expect'
 * 2. Missing explicit '.js' extensions on relative imports
 * 3. Hallucinated 'vscode' or 'express' imports
 * 4. Unused variable diagnostics
 */
export class TypeScriptDiagnosticRepairRule extends BaseRepairRule {
  readonly id = "typescript_diagnostic_repair";
  readonly name = "TypeScript Diagnostic Auto-Repair";
  readonly description = "Identifies compiler diagnostics and repairs trivial issues like unused parameters and missing test shims.";
  readonly defaultSeverity: RuleSeverity = "silent_repair";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["pre_test", "post_generation"];

  private readonly autoRepair = new CompilerDiagnosticAutoRepair();

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

      if (severity === "silent_repair") {
        // Synthesize simulated diagnostics for static checks if needed
        const syntheticDiags = [];
        if (/\bjest\./.test(repairedContent) && !repairedContent.includes("const jest =")) {
          syntheticDiags.push({
            filePath,
            lineNumber: 1,
            columnNumber: 1,
            severity: "error" as const,
            message: "Cannot find name 'jest'.",
            errorCode: "TS2304"
          });
        }
        if (/\bexpect\(/.test(repairedContent) && !repairedContent.includes("const expect =")) {
          syntheticDiags.push({
            filePath,
            lineNumber: 1,
            columnNumber: 1,
            severity: "error" as const,
            message: "Cannot find name 'expect'.",
            errorCode: "TS2304"
          });
        }
        if (/import.*from\s+['"]vscode['"]/.test(repairedContent)) {
          syntheticDiags.push({
            filePath,
            lineNumber: 1,
            columnNumber: 1,
            severity: "error" as const,
            message: "Cannot find module 'vscode' or its corresponding type declarations.",
            errorCode: "TS2307"
          });
        }
        if (/import.*from\s+['"]express['"]/.test(repairedContent)) {
          syntheticDiags.push({
            filePath,
            lineNumber: 1,
            columnNumber: 1,
            severity: "error" as const,
            message: "Cannot find module 'express' or its corresponding type declarations.",
            errorCode: "TS2307"
          });
        }

        if (syntheticDiags.length > 0) {
          const autoRepairResult = this.autoRepair.repair(repairedContent, syntheticDiags);
          if (autoRepairResult.repairsApplied.length > 0) {
            repairedContent = autoRepairResult.repairedCode;
            mutations.push({
              filePath,
              originalContent: content,
              updatedContent: repairedContent,
              description: `Applied diagnostic auto-repairs: ${autoRepairResult.repairsApplied.join("; ")}`,
            });
          }
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}

