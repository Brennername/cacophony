import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppleSiliconProvider } from "../telemetry/AppleSiliconProvider.js";

describe("AppleSiliconProvider Suite (T83.3)", () => {
  it("detects chip model and unified memory allocations", async () => {
    const provider = new AppleSiliconProvider({
      chipName: "Apple M3 Max",
      totalMemoryBytes: 36 * 1024 * 1024 * 1024,
      freeMemoryBytes: 12 * 1024 * 1024 * 1024,
      commandRunner: (cmd: string) => {
        if (cmd.includes("machdep.cpu.brand_string")) return "Apple M3 Max";
        if (cmd.includes("thermal")) return "Current pressure level: Nominal";
        return "";
      },
    });

    assert.equal(provider.getName(), "AppleSiliconProvider");
    assert.equal(provider.getCategory(), "APPLE_SILICON");
    assert.equal(await provider.isAvailable(), true);
    assert.equal(provider.detectChipModel(), "Apple M3 Max");

    const sample = await provider.sample();
    assert.equal(sample.vramTotalBytes, 36 * 1024 * 1024 * 1024);
    assert.equal(sample.vramUsedBytes, 24 * 1024 * 1024 * 1024);
    assert.equal(sample.edgeTempCelsius, 48.0);
    assert.equal(sample.pptWatts, 18.0);
  });

  it("maps thermal pressure states directly to backpressure delays", () => {
    const provider = new AppleSiliconProvider();

    // Nominal
    assert.equal(provider.mapThermalPressureToZone("Nominal"), "Nominal");
    assert.equal(provider.mapThermalPressureToPacingDelay("Nominal"), 0);

    // Fair
    assert.equal(provider.mapThermalPressureToZone("Fair"), "Warm");
    assert.equal(provider.mapThermalPressureToPacingDelay("Fair"), 2);

    // Serious
    assert.equal(provider.mapThermalPressureToZone("Serious"), "Elevated");
    assert.equal(provider.mapThermalPressureToPacingDelay("Serious"), 8);

    // Critical
    assert.equal(provider.mapThermalPressureToZone("Critical"), "Danger");
    assert.equal(provider.mapThermalPressureToPacingDelay("Critical"), 20);
  });

  it("triggers backpressure flag on Serious and Critical thermal states", () => {
    const criticalProvider = new AppleSiliconProvider({
      commandRunner: () => "Current pressure level: Critical",
    });

    const state = criticalProvider.getThermalState();
    assert.equal(state.pressure, "Critical");
    assert.equal(state.zone, "Danger");
    assert.equal(state.pacingDelaySeconds, 20);
    assert.equal(state.isBackpressured, true);
  });
});
