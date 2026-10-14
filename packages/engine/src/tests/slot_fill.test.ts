import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SlotFillPromptBuilder,
  type ISlotFillPromptOptions,
} from "../inference/SlotFillPromptBuilder.js";

describe("SlotFillPromptBuilder & AST Integrity Suite (T70.2.3 & T70.2.4)", () => {
  const baseScaffold = [
    'import { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";',
    "",
    "export class MathUtility {",
    "  public add(a: number, b: number): number {",
    "    // <BEGIN_IMPLEMENTATION>",
    "    // your code here",
    "    // <END_IMPLEMENTATION>",
    "  }",
    "}",
  ].join("\n");

  const options: ISlotFillPromptOptions = {
    targetFile: "src/utils/MathUtility.ts",
    targetSymbol: "add",
    methodSignature: "public add(a: number, b: number): number",
    scaffoldContent: baseScaffold,
    taskDescription: "Implement simple addition of numbers a and b.",
    returnType: "number",
    parameterList: ["a: number", "b: number"],
  };

  it("builds a structured prompt instructing the model to generate within slot markers", () => {
    const builder = new SlotFillPromptBuilder(options);
    const prompt = builder.buildPrompt();

    assert.ok(prompt.systemPrompt.includes("Generate ONLY the code body"));
    assert.ok(prompt.systemPrompt.includes(SlotFillPromptBuilder.BEGIN_MARKER));
    assert.ok(prompt.systemPrompt.includes(SlotFillPromptBuilder.END_MARKER));
    assert.ok(prompt.userPrompt.includes("Task: Implement method 'add'"));
    assert.ok(prompt.userPrompt.includes(baseScaffold));
  });

  it("extracts slot body between exact markers even with leading/trailing text", () => {
    const builder = new SlotFillPromptBuilder(options);
    const rawLlmResponse = [
      "Here is the code you requested:",
      "// <BEGIN_IMPLEMENTATION>",
      "    return a + b;",
      "// <END_IMPLEMENTATION>",
      "Hope this helps!",
    ].join("\n");

    const extracted = builder.extractSlotBody(rawLlmResponse);
    assert.strictEqual(extracted, "return a + b;");
  });

  it("falls back to stripping markdown code fences if markers are omitted", () => {
    const builder = new SlotFillPromptBuilder(options);
    const markdownLlmResponse = [
      "```typescript",
      "const result = a + b;",
      "return result;",
      "```",
    ].join("\n");

    const extracted = builder.extractSlotBody(markdownLlmResponse);
    assert.strictEqual(extracted, "const result = a + b;\nreturn result;");
  });

  it("synthesizes the extracted implementation into the scaffold and validates AST integrity", () => {
    const builder = new SlotFillPromptBuilder(options);
    const slotBody = "return a + b;";

    const synthesized = builder.synthesize(slotBody);
    assert.ok(synthesized.includes("return a + b;"));
    assert.ok(synthesized.includes("export class MathUtility"));

    const validation = builder.validate(slotBody);
    assert.strictEqual(validation.valid, true, `Validation failed: ${validation.errors.join(", ")}`);
    assert.strictEqual(validation.errors.length, 0);
  });

  it("rejects hallucinated @ts-ignore and dummy index signature stubs via AST integrity check", () => {
    const builder = new SlotFillPromptBuilder(options);
    const hallucinatedSlot = [
      "// @ts-ignore",
      "const dummy: { [key: string]: any } = {};",
      "return a + b;",
    ].join("\n");

    const validation = builder.validate(hallucinatedSlot);
    assert.strictEqual(validation.valid, false);
    assert.ok(
      validation.errors.some((e) => e.includes("@ts-ignore")),
      `Expected @ts-ignore error, got: ${validation.errors.join(", ")}`,
    );
  });

  it("rejects unfulfilled placeholder error throws in slot body", () => {
    const builder = new SlotFillPromptBuilder(options);
    const placeholderSlot = 'throw new Error("TODO");';

    const validation = builder.validate(placeholderSlot);
    assert.strictEqual(validation.valid, false);
    assert.ok(
      validation.errors.some((e) => e.includes("Unfulfilled placeholder error throw")),
      `Expected placeholder error, got: ${validation.errors.join(", ")}`,
    );
  });
});
