import test from "node:test";
import assert from "node:assert/strict";
import { PromptCompressor } from "../inference/PromptCompressor.js";
import { ContextMinimizer } from "../inference/ContextMinimizer.js";

test("PromptCompressor Suite", async (t) => {
  await t.test("strips inline and block comments while preserving compiler directives", () => {
    const compressor = new PromptCompressor();
    const input = `
// Normal explanatory comment
/// <reference path="./types.d.ts" />
/*
 * Block comment with architectural musings
 */
export function add(a: number, b: number): number {
  // @ts-ignore
  return a + b;
}
`;

    const result = compressor.compress(input, true);
    assert.ok(!result.compressed.includes("Normal explanatory comment"));
    assert.ok(!result.compressed.includes("Block comment with architectural musings"));
    assert.ok(result.compressed.includes("/// <reference path="));
    assert.ok(result.compressed.includes("// @ts-ignore"));
    assert.ok(result.compressed.includes("export function add"));
    assert.ok(result.removedCommentsCount >= 2);
    assert.ok(result.compressionRatio < 1.0);
  });

  await t.test("collapses multiple consecutive empty lines and trailing whitespace", () => {
    const compressor = new PromptCompressor();
    const input = "line1   \n\n\n\n\nline2   \n";
    const result = compressor.compress(input, false);
    assert.strictEqual(result.compressed, "line1\n\nline2");
  });

  await t.test("prunes unreferenced interface declarations", () => {
    const compressor = new PromptCompressor();
    const input = `
export interface UnusedA {
  foo: string;
}

export interface UsedB {
  bar: number;
}

export type UnusedC = number;
export type UsedD = string;
`;

    const referenced = new Set(["UsedB", "UsedD"]);
    const pruned = compressor.pruneUnreferencedDeclarations(input, referenced);
    assert.ok(!pruned.includes("interface UnusedA"));
    assert.ok(!pruned.includes("type UnusedC"));
    assert.ok(pruned.includes("interface UsedB"));
    assert.ok(pruned.includes("type UsedD"));
  });

  await t.test("ContextMinimizer calculates compression and token savings estimate", () => {
    const minimizer = new ContextMinimizer(process.cwd());
    const bundle = minimizer.assembleContext(
      "Test prompt with ample instructions",
      [],
      ["Directive 1", "Directive 2"],
      false,
      true
    );

    assert.ok(bundle.assembledPrompt.length > 0);
    assert.ok(bundle.tokenSavingsEstimate !== undefined);
    assert.ok(typeof bundle.tokenSavingsEstimate.savingsPercent === "number");
  });
});
