import test from "node:test";
import assert from "node:assert/strict";
import { PromptTemplateRegistry } from "../inference/PromptTemplateRegistry.js";

test("PromptTemplateRegistry Suite (T93.1.2)", async (t) => {
  await t.test("formats Pass 1 architect prompt with file structuring instructions", () => {
    const prompt = PromptTemplateRegistry.createPass1ArchitectPrompt({
      taskPrompt: "Create UserAuthenticationService with password hash validation",
      targetFilePath: "src/auth/UserAuthenticationService.ts",
      contextSummary: "Exports IUser interface and TokenPayload type",
    });

    assert.ok(prompt.includes("UserAuthenticationService.ts"));
    assert.ok(prompt.includes("CACOPHONY_HASH_STUB"));
    assert.ok(prompt.includes("Pass 1") || prompt.includes("architect"));
    assert.ok(prompt.includes("Exports IUser interface"));
  });

  await t.test("formats Pass 2 implementer prompt focusing strictly on single method body", () => {
    const prompt = PromptTemplateRegistry.createPass2ImplementerPrompt({
      methodName: "validateHash",
      methodSignature: "validateHash(plain: string, hash: string): Promise<boolean>",
      hashAnchor: "/* [CACOPHONY_HASH_STUB:abcdef12:validateHash] */",
      targetFilePath: "src/auth/UserAuthenticationService.ts",
      surroundingContext: "class UserAuthenticationService { private salt: string; }",
      taskGoal: "Validate password against hash securely",
    });

    assert.ok(prompt.includes("Target Method: validateHash"));
    assert.ok(prompt.includes("CACOPHONY_HASH_STUB:abcdef12:validateHash"));
    assert.ok(prompt.includes("Validate password against hash securely"));
    assert.ok(prompt.includes("Implement ONLY this specific method: validateHash"));
  });

  await t.test("extracts method declaration code block from markdown fences", () => {
    const rawOutput = [
      "Here is the implemented method:",
      "```typescript",
      "public async validateHash(plain: string, hash: string): Promise<boolean> {",
      "  return crypto.timingSafeEqual(Buffer.from(plain), Buffer.from(hash));",
      "}",
      "```",
      "Hope this helps!",
    ].join("\n");

    const extracted = PromptTemplateRegistry.extractMethodFromOutput(rawOutput);
    assert.ok(extracted.startsWith("public async validateHash"));
    assert.ok(extracted.endsWith("}"));
    assert.ok(!extracted.includes("```"));
    assert.ok(!extracted.includes("Hope this helps!"));
  });
});
