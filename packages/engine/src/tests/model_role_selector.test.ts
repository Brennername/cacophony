import test from "node:test";
import assert from "node:assert/strict";
import { ModelRoleSelector } from "../scheduler/ModelRoleSelector.js";

test("ModelRoleSelector Suite (T92.4.1)", async (t) => {
  const availableFleet = [
    "smollm2:135m",
    "qwen2.5-coder:1.5b",
    "qwen2.5-coder:7b",
    "qwen2.5-coder:14b",
    "deepseek-r1:8b",
  ];

  await t.test("should route chore_runner to ultra-lightweight micro-models", () => {
    const selector = new ModelRoleSelector();
    const model = selector.selectModelForRole("chore_runner", availableFleet);
    assert.strictEqual(model, "smollm2:135m");
    assert.strictEqual(selector.isMicroTaskRole("chore_runner"), true);
  });

  await t.test("should route architect to high-reasoning model", () => {
    const selector = new ModelRoleSelector();
    const model = selector.selectModelForRole("architect", availableFleet);
    assert.strictEqual(model, "deepseek-r1:8b");
    assert.strictEqual(selector.isMicroTaskRole("architect"), false);
  });

  await t.test("should route implementer to coder model", () => {
    const selector = new ModelRoleSelector();
    const model = selector.selectModelForRole("implementer", availableFleet);
    assert.strictEqual(model, "qwen2.5-coder:7b");
  });
});
