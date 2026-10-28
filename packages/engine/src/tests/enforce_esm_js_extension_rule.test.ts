import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EnforceEsmJsExtensionRule } from "../rules/catalog/EnforceEsmJsExtensionRule.js";
import { RuleEvaluationContext } from "@cacophony/shared-types";

describe("EnforceEsmJsExtensionRule Unit Tests", () => {
  const rule = new EnforceEsmJsExtensionRule();

  it("appends .js extension to relative imports without extension", async () => {
    const filePath = "packages/engine/src/foo.ts";
    const originalContent = 'import { bar } from "./bar";\nexport * from "../baz";';
    const context: RuleEvaluationContext = {
      projectRoot: "/app",
      hook: "post_generation",
      modifiedFiles: [filePath],
      fileContents: new Map([[filePath, originalContent]]),
      activeRole: "implementer",
    };

    const result = await rule.evaluate(context, "silent_repair");
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.mutations.length, 1);
    assert.strictEqual(
      result.mutations[0]!.updatedContent,
      'import { bar } from "./bar.js";\nexport * from "../baz.js";',
    );
  });

  it("rewrites .ts and .tsx extensions in relative imports to .js", async () => {
    const filePath = "packages/engine/src/foo.ts";
    const originalContent = 'import { bar } from "./bar.ts";\nimport { Component } from "./comp.tsx";';
    const context: RuleEvaluationContext = {
      projectRoot: "/app",
      hook: "post_generation",
      modifiedFiles: [filePath],
      fileContents: new Map([[filePath, originalContent]]),
      activeRole: "implementer",
    };

    const result = await rule.evaluate(context, "silent_repair");
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.mutations.length, 1);
    assert.strictEqual(
      result.mutations[0]!.updatedContent,
      'import { bar } from "./bar.js";\nimport { Component } from "./comp.js";',
    );
  });

  it("rewrites .mts to .mjs and .cts to .cjs in relative imports", async () => {
    const filePath = "packages/engine/src/foo.ts";
    const originalContent = 'import { a } from "./a.mts";\nimport { b } from "./b.cts";';
    const context: RuleEvaluationContext = {
      projectRoot: "/app",
      hook: "post_generation",
      modifiedFiles: [filePath],
      fileContents: new Map([[filePath, originalContent]]),
      activeRole: "implementer",
    };

    const result = await rule.evaluate(context, "silent_repair");
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.mutations.length, 1);
    assert.strictEqual(
      result.mutations[0]!.updatedContent,
      'import { a } from "./a.mjs";\nimport { b } from "./b.cjs";',
    );
  });

  it("preserves already valid .js extensions and package imports", async () => {
    const filePath = "packages/engine/src/foo.ts";
    const originalContent = 'import { bar } from "./bar.js";\nimport * as fs from "node:fs";';
    const context: RuleEvaluationContext = {
      projectRoot: "/app",
      hook: "post_generation",
      modifiedFiles: [filePath],
      fileContents: new Map([[filePath, originalContent]]),
      activeRole: "implementer",
    };

    const result = await rule.evaluate(context, "silent_repair");
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.mutations.length, 0);
  });
});
