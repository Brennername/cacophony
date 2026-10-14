import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MultiGpuTaskRouter,
  type AcceleratorAllocation,
} from "../hardware/MultiGpuTaskRouter.js";

describe("MultiGpuTaskRouter Suite (T68.5)", () => {
  it("getDeviceEnvForModel maps AMD and NVIDIA environment variables (T68.5.2)", () => {
    const router = new MultiGpuTaskRouter();

    const amdEnv = router.getDeviceEnvForModel("gpu-1", "AMD", 1);
    assert.equal(amdEnv["ROCR_VISIBLE_DEVICES"], "1");
    assert.equal(amdEnv["HIP_VISIBLE_DEVICES"], "1");

    const nvidiaEnv = router.getDeviceEnvForModel("gpu-0", "NVIDIA", 0);
    assert.equal(nvidiaEnv["CUDA_VISIBLE_DEVICES"], "0");
  });

  it("assigns tasks to the accelerator with the greatest available VRAM headroom (T68.5.4)", async () => {
    const router = new MultiGpuTaskRouter();
    const taskId = "task-vram-123";

    const simulatedAccelerators: readonly AcceleratorAllocation[] = [
      {
        deviceId: "gpu-0",
        cardName: "card0",
        availableVramMb: 4096,
        totalVramMb: 8192,
        isApu: true,
        environment: { ROCR_VISIBLE_DEVICES: "0" },
      },
      {
        deviceId: "gpu-1",
        cardName: "card1",
        availableVramMb: 12288,
        totalVramMb: 16384,
        isApu: false,
        environment: { ROCR_VISIBLE_DEVICES: "1" },
      },
    ];

    const assigned = await router.assignTaskToAccelerator(
      taskId,
      2048,
      simulatedAccelerators,
    );

    assert.equal(assigned.deviceId, "gpu-1");
    assert.equal(assigned.cardName, "card1");
    assert.equal(assigned.availableVramMb, 12288);
  });

  it("balanceAccelerators distributes heavy and light models across discrete GPU and APU (T68.5.3)", async () => {
    const router = new MultiGpuTaskRouter();

    const simulatedAccelerators: readonly AcceleratorAllocation[] = [
      {
        deviceId: "gpu-apu",
        cardName: "card0",
        availableVramMb: 4096,
        totalVramMb: 8192,
        isApu: true,
        environment: { ROCR_VISIBLE_DEVICES: "0" },
      },
      {
        deviceId: "gpu-discrete",
        cardName: "card1",
        availableVramMb: 16384,
        totalVramMb: 16384,
        isApu: false,
        environment: { ROCR_VISIBLE_DEVICES: "1" },
      },
    ];

    const models = [
      { modelId: "deepseek-r1:8b", requiredMb: 6144 },
      { modelId: "qwen2.5-coder:3b", requiredMb: 2200 },
    ];

    const placements = await router.balanceAccelerators(
      models,
      simulatedAccelerators,
    );

    assert.equal(placements.length, 2);
    // Heavy 8b model should be placed on discrete GPU
    const heavyPlan = placements.find((p) => p.modelId === "deepseek-r1:8b");
    assert.ok(heavyPlan);
    assert.equal(heavyPlan?.accelerator.deviceId, "gpu-discrete");

    // Lighter 3b model should fit on APU or discrete with remaining capacity
    const lightPlan = placements.find((p) => p.modelId === "qwen2.5-coder:3b");
    assert.ok(lightPlan);
  });

  it("falls back gracefully when no physical accelerators are detected", async () => {
    const router = new MultiGpuTaskRouter();
    const assigned = await router.assignTaskToAccelerator("task-fallback", 1024, []);

    assert.equal(assigned.deviceId, "gpu-0");
    assert.equal(assigned.isApu, true);
    assert.ok(assigned.availableVramMb >= 1024);
  });
});

