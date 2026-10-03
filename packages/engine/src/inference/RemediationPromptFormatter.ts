import { CompilerDiagnostic } from "../testing/CompilerDiagnosticParser.js";

/**
 * Options required to assemble a structured, context-rich remediation prompt
 * for the language model to perform targeted code repairs.
 */
export interface RemediationPromptOptions {
  readonly taskGoal: string;
  readonly targetFilePath: string;
  readonly currentCode: string;
  readonly command?: string | undefined;
  readonly compilerDiagnostics?: readonly CompilerDiagnostic[] | undefined;
  readonly testErrorOutput?: string | undefined;
  readonly failingAssertion?: string | undefined;
}

/**
 * RemediationPromptFormatter
 *
 * Implements Phase 63.3 of the Technical Architecture:
 * Generates structured remediation prompts combining the original task objective,
 * the current file code containing the failure, extracted compiler diagnostics
 * (with exact file and line locations), and failing test assertions.
 *
 * Enforces strict output directives requiring whole-file replacements without
 * conversational fluff, partial snippets, or placeholders.
 */
export class RemediationPromptFormatter {
  /**
   * Formats a complete structured remediation prompt containing all necessary
   * context for an LLM to accurately correct compilation or test verification failures.
   *
   * @param options Structured inputs including task goal, current code, and failure outputs.
   * @returns Formatted prompt string partitioned into five distinct operational sections.
   */
  public formatPrompt(options: RemediationPromptOptions): string {
    const sections: string[] = [];

    // 1. Original Task Goal
    sections.push("### 1. Original Task Goal");
    sections.push(options.taskGoal.trim());
    sections.push("");

    // 2. Current Code with Bug
    sections.push("### 2. Current Code with Bug");
    sections.push(`Target File: ${options.targetFilePath}`);
    const ext = options.targetFilePath.endsWith(".ts")
      ? "typescript"
      : options.targetFilePath.endsWith(".js")
      ? "javascript"
      : options.targetFilePath.endsWith(".json")
      ? "json"
      : "text";
    sections.push("```" + ext);
    sections.push(options.currentCode.trim());
    sections.push("```");
    sections.push("");

    // 3. Compiler Error Diagnostics
    sections.push("### 3. Compiler Error Diagnostics");
    if (options.compilerDiagnostics && options.compilerDiagnostics.length > 0) {
      for (const diag of options.compilerDiagnostics) {
        const codeSuffix = diag.errorCode ? `, ${diag.errorCode}` : "";
        sections.push(
          `- [Line ${diag.lineNumber}, Col ${diag.columnNumber}] [${diag.severity.toUpperCase()}] ${diag.message} (${diag.filePath}${codeSuffix})`
        );
      }
    } else {
      sections.push("No explicit compiler diagnostics recorded.");
    }
    sections.push("");

    // 4. Failing Test Assertion
    sections.push("### 4. Failing Test Assertion");
    if (options.failingAssertion) {
      sections.push(options.failingAssertion.trim());
    } else if (options.testErrorOutput) {
      sections.push(options.testErrorOutput.slice(0, 2000).trim());
    } else {
      sections.push("No specific assertion failure recorded.");
    }
    sections.push("");

    // 5. Required Surgical Fix
    sections.push("### 5. Required Surgical Fix");
    sections.push(this.formatDirectives(options.targetFilePath));

    return sections.join("\n");
  }

  /**
   * Generates strict, explicit directives demanding whole-file replacement
   * without filler, placeholders, or conversational fluff.
   *
   * @param targetFilePath Path to the target file being modified.
   * @returns Formatted string of output formatting rules.
   */
  public formatDirectives(targetFilePath?: string): string {
    const target = targetFilePath ? ` for '${targetFilePath}'` : "";
    return [
      `Provide the COMPLETE, corrected implementation${target}.`,
      "- Do NOT output partial diffs, search/replace blocks, or placeholder comments (e.g. '// ... existing code ...').",
      "- Do NOT include conversational filler, pleasantries, or explanations before or after the code.",
      "- Preserve all existing interfaces, methods, and types in the file. Do NOT truncate or drop existing functionality.",
      "- Testing Standards: If modifying or creating a test file, use strictly 'node:test' and 'node:assert/strict'. NEVER import 'jest', '@jest/globals', 'chai', or 'mocha'.",
      "- Module Imports: Ensure all imports, types, and dependencies exist and resolve correctly. All internal relative imports must end with '.js'. NEVER import 'vscode' or non-existent external libraries.",
      "- Enclose the entire updated file content in a single standard markdown code block: ```typescript ... ```."
    ].join("\n");
  }
}
