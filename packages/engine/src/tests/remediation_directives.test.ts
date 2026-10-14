import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { RemediationPromptFormatter } from "../inference/RemediationPromptFormatter.js";

describe("T98.1.3: RemediationPromptFormatter Anti-Filler Directives", () => {
  it("should generate strict anti-filler instructions forbidding conversational fluff and placeholders", () => {
    const formatter = new RemediationPromptFormatter();
    const directives = formatter.formatDirectives("packages/engine/src/service.ts");

    // Must forbid introductory filler like "Here is the code" or "Sure, I can help"
    assert.ok(directives.includes("conversational filler"));
    assert.ok(directives.includes("pleasantries"));
    assert.ok(directives.includes("COMPLETE, corrected implementation"));
    assert.ok(directives.includes("placeholder comments"));
  });
});
