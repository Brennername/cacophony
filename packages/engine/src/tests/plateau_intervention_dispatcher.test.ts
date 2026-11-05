import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PlateauInterventionDispatcher } from "../analytics/PlateauInterventionDispatcher.js";

describe("PlateauInterventionDispatcher Test Suite", () => {
  let dispatcher: PlateauInterventionDispatcher;

  beforeEach(() => {
    dispatcher = new PlateauInterventionDispatcher({
      windowSize: 3,
      stagnationThreshold: 0.01,
      minSamples: 3,
    });
  });

  it("should initialize without stagnation and with empty history", () => {
    assert.strictEqual(dispatcher.isStagnating(), false);
    assert.strictEqual(dispatcher.getDispatchedInterventions().length, 0);
  });

  it("should not detect stagnation when fewer than minSamples are ingested", async () => {
    await dispatcher.processData({ timestamp: 1000, value: 0.5 });
    await dispatcher.processData({ timestamp: 2000, value: 0.5 });

    assert.strictEqual(dispatcher.isStagnating(), false);
  });

  it("should detect stagnation when values stay within stagnation threshold across window", async () => {
    await dispatcher.processData({ timestamp: 1000, value: 0.5 });
    await dispatcher.processData({ timestamp: 2000, value: 0.5005 });
    await dispatcher.processData({ timestamp: 3000, value: 0.5008 });

    assert.strictEqual(dispatcher.isStagnating(), true);
  });

  it("should not detect stagnation when values vary beyond the threshold", async () => {
    await dispatcher.processData({ timestamp: 1000, value: 0.5 });
    await dispatcher.processData({ timestamp: 2000, value: 0.6 });
    await dispatcher.processData({ timestamp: 3000, value: 0.7 });

    assert.strictEqual(dispatcher.isStagnating(), false);
  });

  it("should trigger manual intervention and record it in dispatched history", () => {
    const trigger = dispatcher.triggerIntervention("Manual stagnation flag");
    assert.strictEqual(trigger.reason, "Manual stagnation flag");
    assert.strictEqual(trigger.status, "intervened");

    const history = dispatcher.getDispatchedInterventions();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0]?.id, trigger.id);
  });

  it("should not dispatch intervention if task is null or undefined", () => {
    const resultNull = dispatcher.dispatchIntervention(null);
    assert.strictEqual(resultNull, null);

    const resultUndefined = dispatcher.dispatchIntervention(undefined);
    assert.strictEqual(resultUndefined, null);
  });

  it("should not dispatch intervention if task is not stagnant", () => {
    const activeTask = { id: "task-1", status: "active" };
    const result = dispatcher.dispatchIntervention(activeTask);
    assert.strictEqual(result, null);
  });

  it("should dispatch intervention when task status is stagnant", () => {
    const stagnantTask = { id: "task-2", status: "stagnant" };
    const result = dispatcher.dispatchIntervention(stagnantTask);

    assert.notStrictEqual(result, null);
    assert.strictEqual(result?.status, "intervened");
    assert.strictEqual(result?.task, stagnantTask);
  });

  it("should handle plateaus with overlapping ranges by intervening on stagnant tasks", () => {
    const task1 = { id: "t1", status: "stagnant", range: [1, 5] };
    const task2 = { id: "t2", status: "stagnant", range: [3, 7] };
    const task3 = { id: "t3", status: "active", range: [6, 10] };

    const interventions = dispatcher.handleOverlappingRanges([task1, task2, task3]);

    assert.strictEqual(interventions.length, 2);
    assert.strictEqual(interventions[0]?.task, task1);
    assert.strictEqual(interventions[1]?.task, task2);
  });

  it("should prune old data points beyond 4x window size and allow clearing data", async () => {
    for (let i = 0; i < 20; i++) {
      await dispatcher.processData({ timestamp: i * 1000, value: 0.5 });
    }
    assert.strictEqual(dispatcher.isStagnating(), true);

    dispatcher.clearData();
    assert.strictEqual(dispatcher.isStagnating(), false);
  });
});
