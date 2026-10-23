import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractJsonObjectString, safeParseJsonObject } from "../utils/json_utils.js";

describe("json_utils Test Suite", () => {
  it("should extract outermost JSON object from clean string", () => {
    const raw = '{"key": "value", "count": 42}';
    const extracted = extractJsonObjectString(raw);
    assert.equal(extracted, raw);

    const parsed = safeParseJsonObject<{ key: string; count: number }>(raw);
    assert.deepEqual(parsed, { key: "value", count: 42 });
  });

  it("should extract JSON object surrounded by markdown and text without backtracking", () => {
    const raw = `
Here is the review result:
\`\`\`json
{
  "verdict": "APPROVE",
  "score": 95,
  "nested": {
    "details": "looks good"
  }
}
\`\`\`
Hope this helps!
`;
    const parsed = safeParseJsonObject<{ verdict: string; score: number }>(raw);
    assert.ok(parsed);
    assert.equal(parsed?.verdict, "APPROVE");
    assert.equal(parsed?.score, 95);
  });

  it("should safely return null on missing or unbalanced braces", () => {
    assert.equal(extractJsonObjectString(""), null);
    assert.equal(extractJsonObjectString(null), null);
    assert.equal(extractJsonObjectString(undefined), null);
    assert.equal(extractJsonObjectString("No braces here"), null);
    assert.equal(extractJsonObjectString("Only open { brace"), null);
    assert.equal(extractJsonObjectString("Only close } brace"), null);
    assert.equal(extractJsonObjectString("Reversed } {"), null);
    assert.equal(safeParseJsonObject("invalid json {not valid json}"), null);
  });

  it("should handle long repeating sequences with zero backtracking delay (ReDoS resilience)", () => {
    const maliciousInput = "{{".repeat(10000) + "}}";
    const start = Date.now();
    const extracted = extractJsonObjectString(maliciousInput);
    const duration = Date.now() - start;

    assert.ok(extracted);
    assert.ok(duration < 50, `Expected extraction under 50ms, took ${duration}ms`);
  });
});
