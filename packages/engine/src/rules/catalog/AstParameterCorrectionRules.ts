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
import { SignatureStore } from "../../signature/SignatureStore.js";

/**
 * AstParameterCorrectionRules
 *
 * TypeScript AST repair rule detecting transposed arguments at function call sites.
 * Uses TypeScript AST to parse function declarations and call sites, matching argument
 * identifier names against declared parameter names to detect and correct inversions (e.g. fn(b, a)).
 */
export class AstParameterCorrectionRules extends BaseRepairRule {
  readonly id = "ast_parameter_correction";
  readonly name = "AST Parameter Inversion Repair";
  readonly description = "Detects and repairs inverted function arguments at call sites based on declared parameter names.";
  readonly defaultSeverity: RuleSeverity = "silent_repair";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["post_generation", "pre_test"];

  private readonly signatureStore: SignatureStore;

  constructor(signatureStore?: SignatureStore) {
    super();
    this.signatureStore = signatureStore || new SignatureStore();
  }

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

      const corrected = this.correctTransposedArguments(filePath, content);
      if (corrected.modified) {
        if (severity === "silent_repair") {
          mutations.push({
            filePath,
            originalContent: content,
            updatedContent: corrected.code,
            description: `Corrected ${corrected.correctionsCount} transposed argument(s)`
          });
        } else if (severity === "hard_rejection") {
          passed = false;
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Detected ${corrected.correctionsCount} transposed argument(s) in ${filePath}`,
            filePath,
            suggestedFix: corrected.code
          });
        } else if (severity === "soft_warning") {
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Warning: Possible transposed argument in ${filePath}`,
            filePath
          });
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }

  /**
   * Evaluates code and repairs transposed arguments where argument identifier
   * names match declared parameter names in inverted order.
   */
  public correctTransposedArguments(
    filePath: string,
    code: string
  ): { code: string; modified: boolean; correctionsCount: number } {
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.ES2022,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    // 1. First pass: Harvest function parameter names declared in this source file
    const declaredFunctionParams = new Map<string, string[]>();

    const collectDeclarations = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const fnName = node.name.text;
        const params = node.parameters.map((p) => p.name.getText(sourceFile));
        declaredFunctionParams.set(fnName, params);
      }
      ts.forEachChild(node, collectDeclarations);
    };
    collectDeclarations(sourceFile);

    // 2. Second pass: Find call expressions where arguments are inverted
    let updatedCode = code;
    let correctionsCount = 0;

    const inspectCalls = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        let fnName = "";
        if (ts.isIdentifier(expr)) {
          fnName = expr.text;
        } else if (ts.isPropertyAccessExpression(expr)) {
          fnName = expr.name.text;
        }

        let expectedParams = declaredFunctionParams.get(fnName);
        if (!expectedParams) {
          // Check signatureStore if available
          const sig = this.signatureStore.get(fnName);
          if (sig && sig.callables.length > 0 && sig.callables[0]?.parameters) {
            expectedParams = sig.callables[0].parameters.map((p) => p.name);
          }
        }

        if (expectedParams && expectedParams.length >= 2 && node.arguments.length === expectedParams.length) {
          const argTexts = node.arguments.map((a) => a.getText(sourceFile));
          
          // Check for 2-parameter transposition: expected [a, b], passed [b, a]
          if (
            expectedParams.length === 2 &&
            expectedParams[0] &&
            expectedParams[1] &&
            argTexts[0] === expectedParams[1] &&
            argTexts[1] === expectedParams[0]
          ) {
            const rawCall = node.getText(sourceFile);
            const correctedCall = `${fnName}(${expectedParams[0]}, ${expectedParams[1]})`;
            if (rawCall !== correctedCall) {
              updatedCode = updatedCode.replace(rawCall, correctedCall);
              correctionsCount++;
            }
          }
        }
      }

      ts.forEachChild(node, inspectCalls);
    };

    inspectCalls(sourceFile);

    return {
      code: updatedCode,
      modified: correctionsCount > 0,
      correctionsCount
    };
  }
}
