import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CodeScrubber } from "../scrubber/CodeScrubber.js";
import { SyntacticRemediationScrubberRule } from "../scrubber/rules/SyntacticRemediationScrubberRule.js";

describe("SyntacticRemediationScrubberRule & CodeScrubber (T69.6.3)", () => {
  it("detects and auto-remediates unterminated template strings", () => {
    const rule = new SyntacticRemediationScrubberRule();
    const malformed = 'export const greeting = `Hello world;\n';

    const result = rule.scrub(malformed, "greeting.ts");
    assert.equal(result.modified, true);
    assert.ok(result.content.includes("`Hello world;`;"));
    assert.ok(result.issuesFixed.some((i) => i.includes("template literal")));
  });

  it("leaves balanced template strings intact", () => {
    const rule = new SyntacticRemediationScrubberRule();
    const valid = 'export const greeting = `Hello ${name}!`;\n';

    const result = rule.scrub(valid, "greeting.ts");
    assert.equal(result.modified, false);
    assert.equal(result.content, valid);
  });

  it("detects and auto-remediates unbalanced braces", () => {
    const rule = new SyntacticRemediationScrubberRule();
    const malformed = `export class Greeter {
  public greet(): string {
    return "hello";
`;

    const result = rule.scrub(malformed, "Greeter.ts");
    assert.equal(result.modified, true);
    assert.ok(result.issuesFixed.some((i) => i.includes("closing brace")));
    // Count braces in output
    const openCount = (result.content.match(/{/g) || []).length;
    const closeCount = (result.content.match(/}/g) || []).length;
    assert.equal(openCount, closeCount);
  });

  it("does not count braces inside string literals or comments", () => {
    const rule = new SyntacticRemediationScrubberRule();
    const validWithBracesInStrings = `export class Sample {
  public test(): void {
    // Note: { inside comment
    const val = "{ bracket in string }";
  }
}
`;

    const result = rule.scrub(validWithBracesInStrings, "Sample.ts");
    assert.equal(result.modified, false);
    assert.equal(result.content, validWithBracesInStrings);
  });

  it("integrates into CodeScrubber pipeline", () => {
    const scrubber = new CodeScrubber();
    const malformedCode = `export class BrokenClass {
  public run() {
    console.log(\`unfinished;
`;

    const scrubResult = scrubber.scrubContent(malformedCode, "Broken.ts");
    assert.equal(scrubResult.modified, true);
    assert.ok(scrubResult.issuesFixed.length >= 2);
  });
});
