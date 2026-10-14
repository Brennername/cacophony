import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { RemediationPromptFormatter } from "../inference/RemediationPromptFormatter.js";

describe("T98.1.2: RemediationPromptFormatter Test Output Truncation", () => {
  it("should truncate raw test error output exceeding 2000 characters", () => {
    const formatter = new RemediationPromptFormatter();
    const longError = "E".repeat(5000);

    const prompt = formatter.formatPrompt({
      taskGoal: "Truncation verification test",
      targetFilePath: "packages/engine/src/service.ts",
      currentCode: "export const x = 1;",
      testErrorOutput: longError,
    });

    assert.ok(prompt.includes("### 4. Failing Test Assertion"));
    // The truncated assertion section should contain at most 2000 E's
    const sectionIndex = prompt.indexOf("### 4. Failing Test Assertion");
    const nextSectionIndex = prompt.indexOf("### 5. Required Surgical Fix");
    const sectionText = prompt.slice(sectionIndex, nextSectionIndex);

    assert.ok(!sectionText.includes("E".repeat(2001)));
    assert.ok(sectionText.includes("E".repeat(2000)));
  });
});
