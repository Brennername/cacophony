import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";

describe("T97.3.2: ThermalGovernor Pacing Delays Scale Across Zones", () => {
  it("should scale pacing delays from 0s at Nominal to 10s at Danger zone when cool-off is enabled", () => {
    const governor = new ThermalGovernor({ coolOffEnabled: true });

    // Nominal (<85C)
    const nominal = governor.evaluate(75);
    assert.strictEqual(nominal.zone, "Nominal");
    assert.strictEqual(nominal.pacingDelaySeconds, 0);

    // Warm (>=85C, <90C)
    const warm = governor.evaluate(86);
    assert.strictEqual(warm.zone, "Warm");
    assert.strictEqual(warm.pacingDelaySeconds, 0);

    // Elevated (>=90C, <95C)
    const elevated = governor.evaluate(92);
    assert.strictEqual(elevated.zone, "Elevated");
    assert.strictEqual(elevated.pacingDelaySeconds, 3);

    // Danger (>=95C, <100C)
    const dangerOrange = governor.evaluate(96);
    assert.strictEqual(dangerOrange.zone, "Danger");
    assert.strictEqual(dangerOrange.pacingDelaySeconds, 5);

    // Danger (>=100C)
    const dangerRed = governor.evaluate(102);
    assert.strictEqual(dangerRed.zone, "Danger");
    assert.strictEqual(dangerRed.pacingDelaySeconds, 10);
  });
});
