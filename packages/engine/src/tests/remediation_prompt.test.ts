import { describe, it } from "node:test";
import assert from "node:assert";
import { RemediationPromptFormatter } from "../inference/RemediationPromptFormatter.js";
import { CompilerDiagnostic } from "../testing/CompilerDiagnosticParser.js";

describe("RemediationPromptFormatter Test Suite", () => {
  const formatter = new RemediationPromptFormatter();

  it("should format all 5 required structured sections in remediation prompt", () => {
    const prompt = formatter.formatPrompt({
      taskGoal: "T63.3.1: Create RemediationPromptFormatter",
      targetFilePath: "packages/engine/src/inference/RemediationPromptFormatter.ts",
      currentCode: "export class IncompleteClass {}",
      testErrorOutput: "AssertionError: expected true to equal false"
    });

    assert.ok(prompt.includes("### 1. Original Task Goal"), "Must include Section 1");
    assert.ok(prompt.includes("### 2. Current Code with Bug"), "Must include Section 2");
    assert.ok(prompt.includes("### 3. Compiler Error Diagnostics"), "Must include Section 3");
    assert.ok(prompt.includes("### 4. Failing Test Assertion"), "Must include Section 4");
    assert.ok(prompt.includes("### 5. Required Surgical Fix"), "Must include Section 5");
    assert.ok(prompt.includes("Target File: packages/engine/src/inference/RemediationPromptFormatter.ts"));
    assert.ok(prompt.includes("export class IncompleteClass {}"));
  });

  it("should format compiler diagnostics with exact line numbers and severity", () => {
    const diagnostics: CompilerDiagnostic[] = [
      {
        filePath: "packages/engine/src/test.ts",
        lineNumber: 42,
        columnNumber: 15,
        severity: "error",
        message: "Cannot find name 'SchedulerConfig'",
        errorCode: "TS2304"
      },
      {
        filePath: "packages/engine/src/test.ts",
        lineNumber: 99,
        columnNumber: 3,
        severity: "warning",
        message: "Unused parameter 'options'",
        errorCode: "TS6133"
      }
    ];

    const prompt = formatter.formatPrompt({
      taskGoal: "Fix type imports",
      targetFilePath: "packages/engine/src/test.ts",
      currentCode: "const x = 1;",
      compilerDiagnostics: diagnostics
    });

    assert.ok(prompt.includes("[Line 42, Col 15] [ERROR] Cannot find name 'SchedulerConfig'"));
    assert.ok(prompt.includes("[Line 99, Col 3] [WARNING] Unused parameter 'options'"));
  });

  it("should format explicit directives demanding complete whole-file replacement without filler", () => {
    const directives = formatter.formatDirectives("packages/engine/src/sample.ts");

    assert.ok(directives.includes("Provide the COMPLETE, corrected implementation for 'packages/engine/src/sample.ts'"));
    assert.ok(directives.includes("Do NOT output partial diffs"));
    assert.ok(directives.includes("Do NOT include conversational filler"));
    assert.ok(directives.includes("```typescript ... ```"));
  });
});
