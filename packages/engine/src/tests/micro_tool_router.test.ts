import test from "node:test";
import assert from "node:assert/strict";
import {
  MicroModelToolRouter,
  TaskRoutingContext,
} from "../inference/MicroModelToolRouter.js";
import { IModelInferenceCaller } from "../inference/MultiModelConsensusCoordinator.js";

test("MicroModelToolRouter Suite (T95.1.1 & T95.1.2)", async (t) => {
  await t.test("routes to HASH_STUB_SPLICING via line threshold guard without model call", async () => {
    const router = new MicroModelToolRouter();
    const context: TaskRoutingContext = {
      taskTitle: "Refactor OrderProcessor",
      taskPrompt: "Update fee calculation",
      targetFilePath: "src/OrderProcessor.ts",
      existingFileLines: 320,
    };

    const decision = await router.routeTaskStrategy(context);
    assert.equal(decision.strategy, "HASH_STUB_SPLICING");
    assert.equal(decision.modelUsed, "heuristic-line-guard");
    assert.ok(decision.latencyMs < 50);
  });

  await t.test("routes small new file to MONOLITHIC_FILE_GENERATION", async () => {
    const router = new MicroModelToolRouter();
    const context: TaskRoutingContext = {
      taskTitle: "Create MathUtils",
      taskPrompt: "Create a simple math utility with clamp and lerp functions",
      targetFilePath: "src/MathUtils.ts",
      existingFileLines: 0,
    };

    const decision = await router.routeTaskStrategy(context);
    assert.equal(decision.strategy, "MONOLITHIC_FILE_GENERATION");
    assert.ok(decision.latencyMs < 50);
  });

  await t.test("parses structured constrained JSON response from micro-model", async () => {
    const mockCaller: IModelInferenceCaller = {
      async generate(): Promise<string> {
        return JSON.stringify({
          strategy: "HASH_STUB_SPLICING",
          confidence: 0.94,
          reasoning: "Class contains multiple existing methods requiring surgical splice",
        });
      },
    };

    const router = new MicroModelToolRouter(mockCaller);
    const context: TaskRoutingContext = {
      taskTitle: "Update calculateTotal in CartService",
      taskPrompt: "Update calculateTotal to apply promotional coupon",
      targetFilePath: "src/CartService.ts",
      existingFileLines: 80,
    };

    const decision = await router.routeTaskStrategy(context);
    assert.equal(decision.strategy, "HASH_STUB_SPLICING");
    assert.equal(decision.confidence, 0.94);
    assert.ok(decision.reasoning.includes("surgical splice"));
  });

  await t.test("handles micro-model error gracefully with fallback classification", async () => {
    const mockFaultyCaller: IModelInferenceCaller = {
      async generate(): Promise<string> {
        throw new Error("Micro-model inference timeout");
      },
    };

    const router = new MicroModelToolRouter(mockFaultyCaller);
    const context: TaskRoutingContext = {
      taskTitle: "Refactor method computeTax",
      taskPrompt: "Implement method computeTax on existing tax provider",
      targetFilePath: "src/TaxService.ts",
      existingFileLines: 90,
      existingMethodCount: 4,
    };

    const decision = await router.routeTaskStrategy(context);
    // Should gracefully fallback to heuristic without throwing
    assert.equal(decision.strategy, "HASH_STUB_SPLICING");
    assert.equal(decision.modelUsed, "heuristic-error-fallback");
  });
});
