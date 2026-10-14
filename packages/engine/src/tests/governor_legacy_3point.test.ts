import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";

describe("T97.3.3: ThermalGovernor Legacy 3-Point Backwards Compatibility", () => {
  it("should support numeric constructor arguments for legacy nominal, warm, and elevated boundaries", () => {
    // legacy constructor: (nominalMax, warmMax, elevatedMax)
    const governor = new ThermalGovernor(70, 80, 90);

    const nominal = governor.evaluate(65);
    assert.strictEqual(nominal.zone, "Nominal");
    assert.strictEqual(nominal.pacingDelaySeconds, 0);

    const warm = governor.evaluate(75);
    assert.strictEqual(warm.zone, "Warm");
    assert.strictEqual(warm.pacingDelaySeconds, 5);

    const elevated = governor.evaluate(85);
    assert.strictEqual(elevated.zone, "Elevated");
    assert.strictEqual(elevated.pacingDelaySeconds, 15);

    const danger = governor.evaluate(95);
    assert.strictEqual(danger.zone, "Danger");
    assert.strictEqual(danger.pacingDelaySeconds, 10);
  });
});
