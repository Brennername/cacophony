import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";

describe("T97.3.4: ThermalGovernor Cool-Off Disabled Flag Overrides Pacing", () => {
  it("should keep pacingDelaySeconds at 0 even in high thermal zones when coolOffEnabled is false", () => {
    const governor = new ThermalGovernor({ coolOffEnabled: false });

    const elevated = governor.evaluate(92);
    assert.strictEqual(elevated.zone, "Elevated");
    assert.strictEqual(elevated.pacingDelaySeconds, 0);

    const dangerOrange = governor.evaluate(97);
    assert.strictEqual(dangerOrange.zone, "Danger");
    assert.strictEqual(dangerOrange.pacingDelaySeconds, 0);

    const dangerRed = governor.evaluate(102);
    assert.strictEqual(dangerRed.zone, "Danger");
    assert.strictEqual(dangerRed.pacingDelaySeconds, 0);
  });
});
