import type { AssessmentFinding } from "@cacophony/shared-types";
import {
  TypeScriptMethodSplicer,
  type MethodTargetValidationResult,
} from "./TypeScriptMethodSplicer.js";

export interface SlotFillPromptOptions {
  readonly source: string;
  readonly fileName: string;
  readonly className: string;
  readonly methodName: string;
  readonly directive: string;
  readonly findings?: readonly AssessmentFinding[] | undefined;
}

export interface SlotFillPromptResult {
  readonly success: boolean;
  readonly prompt?: string | undefined;
  readonly validation: MethodTargetValidationResult;
  readonly reason?: string | undefined;
}

/**
 * Builds slot-fill replacement prompts targeting single methods with
 * AST verification preconditions.
 */
export class SlotFillPromptBuilder {
  /**
   * Generates a focused slot-fill repair prompt after verifying that target class and method exist.
   */
  public static buildSlotFillPrompt(
    options: SlotFillPromptOptions,
  ): SlotFillPromptResult {
    const { source, fileName, className, methodName, directive, findings } = options;

    const validation = TypeScriptMethodSplicer.validateTarget(
      source,
      fileName,
      className,
      methodName,
    );

    if (!validation.valid) {
      return {
        success: false,
        validation,
        reason: validation.reason,
      };
    }

    const lines: string[] = [
      "### [AST-TARGETED METHOD REPAIR]",
      `FILE: \`${fileName}\``,
      `TARGET: \`${className}.${methodName}\``,
      "",
      "#### Class Member Contracts",
      validation.contracts && validation.contracts.length > 0
        ? validation.contracts.join("\n")
        : "  (no other class members)",
      "",
      "#### Target Signature",
      `\`\`\`typescript\n${validation.methodHead} {\n  // body to replace\n}\n\`\`\``,
      "",
      "#### Current Body",
      `\`\`\`typescript\n${validation.currentBody}\n\`\`\``,
      "",
      "#### Objective & Directives",
      directive,
    ];

    if (findings && findings.length > 0) {
      lines.push("", "#### Reviewer Findings Addressed");
      for (const f of findings) {
        lines.push(
          `- [${f.severity.toUpperCase()}] \`${f.category}\`: ${f.message}`,
        );
        if (f.deterministicFixHint) {
          lines.push(`  - Deterministic Fix Hint: ${f.deterministicFixHint}`);
        }
      }
    }

    lines.push(
      "",
      "#### Generation Constraints",
      "1. Return ONLY the replacement code statements for the method body inside a single ```typescript code block.",
      "2. Do NOT output class declaration, method signature, imports, or placeholder comments (e.g., '// ... existing code').",
      "3. Use only class members defined in the contracts above to preserve compile-time integrity.",
      "4. The system will splice your output directly into the target method's AST node.",
    );

    return {
      success: true,
      prompt: lines.join("\n"),
      validation,
    };
  }
}
