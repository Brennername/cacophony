import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";

describe("T97.3.1: ThermalGovernor Emergency Shutdown Threshold", () => {
  it("should trigger emergency halt when temperature reaches or exceeds 105 degrees Celsius", () => {
    const governor = new ThermalGovernor();

    const normal = governor.evaluate(82);
    assert.strictEqual(normal.emergencyHalt, false);

    const high = governor.evaluate(100);
    assert.strictEqual(high.emergencyHalt, false);

    const cutoff = governor.evaluate(105);
    assert.strictEqual(cutoff.emergencyHalt, true);
    assert.strictEqual(cutoff.zone, "Danger");

    const extreme = governor.evaluate(110);
    assert.strictEqual(extreme.emergencyHalt, true);
    assert.strictEqual(extreme.zone, "Danger");
  });

  it("should respect custom emergency shutdown temperature override", () => {
    const governor = new ThermalGovernor({ emergencyShutdownTemp: 98 });
    const at97 = governor.evaluate(97);
    assert.strictEqual(at97.emergencyHalt, false);

    const at98 = governor.evaluate(98);
    assert.strictEqual(at98.emergencyHalt, true);
  });
});
