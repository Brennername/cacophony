import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";
import type { IHardwareTelemetryProvider } from "../telemetry/IHardwareTelemetryProvider.js";
import type { GpuMetrics, HardwareDeviceCategory } from "@cacophony/shared-types";

describe("ThermalGovernor Unit Test Suite (T102.2.3)", () => {
  it("should initialize with default standard thermal fenceposts", () => {
    const governor = new ThermalGovernor();

    assert.strictEqual(governor.blueMax, 80);
    assert.strictEqual(governor.greenMax, 85);
    assert.strictEqual(governor.yellowMax, 90);
    assert.strictEqual(governor.orangeMax, 95);
    assert.strictEqual(governor.redMax, 100);
    assert.strictEqual(governor.emergencyShutdownTemp, 105);
  });

  it("should evaluate thermal zones accurately across standard temperature bands", () => {
    const governor = new ThermalGovernor({ coolOffEnabled: true });

    // Below greenMax (85C): Nominal
    const evalNominal = governor.evaluate(72.5);
    assert.strictEqual(evalNominal.zone, "Nominal");
    assert.strictEqual(evalNominal.pacingDelaySeconds, 0);
    assert.strictEqual(evalNominal.emergencyHalt, false);

    // greenMax (85C) to yellowMax (90C): Warm
    const evalWarm = governor.evaluate(86.0);
    assert.strictEqual(evalWarm.zone, "Warm");
    assert.strictEqual(evalWarm.pacingDelaySeconds, 0);
    assert.strictEqual(evalWarm.emergencyHalt, false);

    // yellowMax (90C) to orangeMax (95C): Elevated
    const evalElevated = governor.evaluate(92.0);
    assert.strictEqual(evalElevated.zone, "Elevated");
    assert.strictEqual(evalElevated.pacingDelaySeconds, 3);
    assert.strictEqual(evalElevated.emergencyHalt, false);

    // orangeMax (95C) to redMax (100C): Danger (Hot)
    const evalOrange = governor.evaluate(97.0);
    assert.strictEqual(evalOrange.zone, "Danger");
    assert.strictEqual(evalOrange.pacingDelaySeconds, 5);
    assert.strictEqual(evalOrange.emergencyHalt, false);

    // redMax (100C) to emergencyShutdown (105C): Danger (Critical)
    const evalRed = governor.evaluate(102.0);
    assert.strictEqual(evalRed.zone, "Danger");
    assert.strictEqual(evalRed.pacingDelaySeconds, 10);
    assert.strictEqual(evalRed.emergencyHalt, false);

    // At or above emergency shutdown (105C): Emergency halt triggered
    const evalEmergency = governor.evaluate(105.5);
    assert.strictEqual(evalEmergency.zone, "Danger");
    assert.strictEqual(evalEmergency.emergencyHalt, true);
  });

  it("should suppress pacing delays when coolOffEnabled is false", () => {
    const governor = new ThermalGovernor({ coolOffEnabled: false });

    const evalHot = governor.evaluate(98.0);
    assert.strictEqual(evalHot.zone, "Danger");
    assert.strictEqual(evalHot.pacingDelaySeconds, 0);
    assert.strictEqual(evalHot.emergencyHalt, false);

    // Emergency halt should still trigger even when pacing delays are off
    const evalEmergency = governor.evaluate(108.0);
    assert.strictEqual(evalEmergency.emergencyHalt, true);
  });

  it("should support legacy 3-point configuration mode", () => {
    // legacy constructor: (nominalMax=75, warmMax=82, elevatedMax=90)
    const governor = new ThermalGovernor(75, 82, 90);

    assert.strictEqual(governor.evaluate(70).zone, "Nominal");
    assert.strictEqual(governor.evaluate(77).zone, "Warm");
    assert.strictEqual(governor.evaluate(85).zone, "Elevated");
    assert.strictEqual(governor.evaluate(92).zone, "Danger");
    assert.strictEqual(governor.evaluate(106).emergencyHalt, true);
  });

  it("should halt immediately during enforcePacing when emergency cutoff is breached", async () => {
    const governor = new ThermalGovernor();

    const mockProvider: IHardwareTelemetryProvider = {
      getName: () => "MockProvider",
      getCategory: (): HardwareDeviceCategory => "CPU_FALLBACK",
      isAvailable: async () => true,
      sample: async (): Promise<GpuMetrics> => ({
        gpuBusyPercent: 100,
        vramUsedBytes: 0,
        vramTotalBytes: 0,
        vramPercent: 0,
        gttUsedBytes: 0,
        gttTotalBytes: 0,
        edgeTempCelsius: 107.0, // Exceeds 105C emergency cutoff
        vddgfxMilliVolts: 900,
        socMilliVolts: 900,
        vddnbMilliVolts: 900,
        pptWatts: 45,
        sclkMhz: 1800,
        mclkMhz: 1600,
      }),
    };

    const result = await governor.enforcePacing(mockProvider);
    assert.strictEqual(result.emergencyHalt, true);
    assert.strictEqual(result.tempCelsius, 107.0);
  });

  it("should return immediately during enforcePacing when coolOff is disabled", async () => {
    const governor = new ThermalGovernor({ coolOffEnabled: false });

    const mockProvider: IHardwareTelemetryProvider = {
      getName: () => "MockProvider",
      getCategory: (): HardwareDeviceCategory => "CPU_FALLBACK",
      isAvailable: async () => true,
      sample: async (): Promise<GpuMetrics> => ({
        gpuBusyPercent: 50,
        vramUsedBytes: 0,
        vramTotalBytes: 0,
        vramPercent: 0,
        gttUsedBytes: 0,
        gttTotalBytes: 0,
        edgeTempCelsius: 98.0,
        vddgfxMilliVolts: 850,
        socMilliVolts: 900,
        vddnbMilliVolts: 900,
        pptWatts: 30,
        sclkMhz: 1400,
        mclkMhz: 1200,
      }),
    };

    const result = await governor.enforcePacing(mockProvider);
    assert.strictEqual(result.zone, "Danger");
    assert.strictEqual(result.emergencyHalt, false);
    assert.strictEqual(result.pacingDelaySeconds, 0);
  });
});
