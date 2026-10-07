import test from "node:test";
import assert from "node:assert/strict";
import { RuleSynthesisQueue } from "../rules/RuleSynthesisQueue.js";

test("RuleSynthesisQueue Suite (T91.3.1)", async (t) => {
  await t.test("should collect diagnostics and surface candidates when threshold is reached", () => {
    const queue = new RuleSynthesisQueue({ thresholdForSynthesis: 3 });

    queue.recordDiagnostic("TS2304", "Cannot find name 'inject'", "src/component.ts");
    queue.recordDiagnostic("TS2304", "Cannot find name 'signal'", "src/store.ts");

    assert.strictEqual(queue.getHarvestedCandidates().length, 0);

    // 3rd occurrence reaches threshold
    queue.recordDiagnostic("TS2304", "Cannot find name 'computed'", "src/view.ts");

    const candidates = queue.getHarvestedCandidates();
    assert.strictEqual(candidates.length, 1);
    assert.strictEqual(candidates[0]?.code, "TS2304");
    assert.strictEqual(candidates[0]?.occurrences, 3);
    assert.strictEqual(candidates[0]?.affectedFiles.length, 3);
  });

  await t.test("should synthesize declarative repair rule template code", () => {
    const queue = new RuleSynthesisQueue({ thresholdForSynthesis: 2 });
    queue.recordDiagnostic("TS2834", "Relative import paths need explicit file extensions", "src/index.ts");
    queue.recordDiagnostic("TS2834", "Relative import paths need explicit file extensions", "src/app.ts");

    const candidates = queue.getHarvestedCandidates();
    assert.ok(candidates.length > 0);

    const ruleCode = queue.synthesizeDeclarativeRule(candidates[0]!);
    assert.ok(ruleCode.includes("class AutoSynthesizedTS2834RepairRule"));
    assert.ok(ruleCode.includes('public readonly id = "rule-ts2834-auto-synthesized"'));
    assert.ok(ruleCode.includes("BaseRepairRule"));
  });

  await t.test("should enqueue meta-task in TaskRepository without duplicate enqueues", async () => {
    const queue = new RuleSynthesisQueue({ thresholdForSynthesis: 1 });
    queue.recordDiagnostic("TS7006", "Parameter 'item' implicitly has an 'any' type");

    const candidates = queue.getHarvestedCandidates();
    const createdTasks: any[] = [];
    const mockTaskRepo = {
      createIfNotExists: async (task: any) => {
        createdTasks.push(task);
      },
    } as any;

    const taskId = await queue.enqueueMetaRuleTask(candidates[0]!, mockTaskRepo);
    assert.ok(taskId !== null);
    assert.strictEqual(createdTasks.length, 1);
    assert.strictEqual(createdTasks[0].priority, "P0");
    assert.strictEqual(createdTasks[0].role, "architect");

    // Second call should return null due to deduplication
    const secondCall = await queue.enqueueMetaRuleTask(candidates[0]!, mockTaskRepo);
    assert.strictEqual(secondCall, null);
    assert.strictEqual(createdTasks.length, 1);
  });
});
