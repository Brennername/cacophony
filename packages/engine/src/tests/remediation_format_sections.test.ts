import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { RemediationPromptFormatter } from "../inference/RemediationPromptFormatter.js";

describe("T98.1.1: RemediationPromptFormatter Structured Markdown Sections", () => {
  it("should generate markdown with five clearly numbered sections", () => {
    const formatter = new RemediationPromptFormatter();
    const prompt = formatter.formatPrompt({
      taskGoal: "Fix null pointer in worker pipeline",
      targetFilePath: "packages/engine/src/worker.ts",
      currentCode: "export class Worker { run() {} }",
      compilerDiagnostics: [
        {
          filePath: "packages/engine/src/worker.ts",
          lineNumber: 10,
          columnNumber: 5,
          message: "Object is possibly 'undefined'.",
          severity: "error",
          errorCode: "TS2532",
        },
      ],
      failingAssertion: "AssertionError: expected true, got false",
    });

    assert.ok(prompt.includes("### 1. Original Task Goal"));
    assert.ok(prompt.includes("### 2. Current Code with Bug"));
    assert.ok(prompt.includes("### 3. Compiler Error Diagnostics"));
    assert.ok(prompt.includes("### 4. Failing Test Assertion"));
    assert.ok(prompt.includes("### 5. Required Surgical Fix"));

    assert.ok(prompt.includes("Fix null pointer in worker pipeline"));
    assert.ok(prompt.includes("```typescript"));
    assert.ok(prompt.includes("TS2532"));
    assert.ok(prompt.includes("AssertionError: expected true, got false"));
  });
});
