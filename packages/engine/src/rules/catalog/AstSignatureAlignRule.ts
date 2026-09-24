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
import { SignatureAlignmentScrubber } from "../../signature/SignatureAlignmentScrubber.js";

/**
 * AstSignatureAlignRule
 *
 * Bridges the Phase 23 SignatureStore and SignatureAlignmentScrubber
 * into the composable Phase 25 Rule Pipeline.
 */
export class AstSignatureAlignRule extends BaseRepairRule {
  readonly id = "ast_signature_align";
  readonly name = "AST Signature Alignment";
  readonly description = "Mechanistically aligns misspelled parameter names and inverted argument order to match authoritative AST signatures.";
  readonly defaultSeverity: RuleSeverity = "silent_repair";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["post_generation", "pre_test"];

  private readonly scrubber: SignatureAlignmentScrubber;

  constructor(signatureStore?: SignatureStore) {
    super();
    const store = signatureStore || new SignatureStore();
    this.scrubber = new SignatureAlignmentScrubber(store);
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

      const alignment = this.scrubber.scrubTypeScript(filePath, content);

      if (alignment.modified) {
        if (severity === "silent_repair") {
          mutations.push({
            filePath,
            originalContent: content,
            updatedContent: alignment.code,
            description: `Aligned ${alignment.corrections.length} call signature parameter(s)`,
          });
        } else if (severity === "hard_rejection") {
          passed = false;
          for (const corr of alignment.corrections) {
            diagnostics.push({
              ruleId: this.id,
              severity,
              message: `Signature mismatch: ${corr.reason} at line ${corr.line}`,
              filePath,
              line: corr.line,
              suggestedFix: corr.correctedCall,
            });
          }
        } else if (severity === "soft_warning") {
          for (const corr of alignment.corrections) {
            diagnostics.push({
              ruleId: this.id,
              severity,
              message: `Warning: Signature alignment difference: ${corr.reason}`,
              filePath,
              line: corr.line,
            });
          }
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
