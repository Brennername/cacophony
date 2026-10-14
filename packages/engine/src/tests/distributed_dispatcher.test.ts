import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FleetHealthMonitor } from "../fleet/FleetHealthMonitor.js";
import { DistributedTaskDispatcher } from "../scheduler/DistributedTaskDispatcher.js";

describe("DistributedTaskDispatcher Suite (T86.2)", () => {
  it("should fall back to local node when no remote nodes exist", () => {
    const monitor = new FleetHealthMonitor();
    const dispatcher = new DistributedTaskDispatcher(monitor, "local-orchestrator");

    const decision = dispatcher.selectPlacement({
      taskId: "task-001",
      model: "qwen2.5-coder:7b"
    });

    assert.equal(decision.nodeId, "local-orchestrator");
    assert.equal(decision.isLocal, true);
    assert.match(decision.reason, /falling back to local orchestrator/);
  });

  it("should route heavy models to nodes with largest free VRAM and lowest thermals", () => {
    const monitor = new FleetHealthMonitor();
    const dispatcher = new DistributedTaskDispatcher(monitor, "local-orchestrator");

    // Node 1: Moderate VRAM
    monitor.recordHeartbeat({
      nodeId: "node-gpu-small",
      hostname: "small.local",
      ipAddress: "192.168.1.10",
      port: 24074,
      gpuType: "NVIDIA_CUDA",
      vramTotalMb: 8192,
      vramUsedMb: 6144, // 2048 free
      gpuBusyPercent: 40,
      temperatureCelsius: 60,
      status: "ONLINE",
      activeTasksCount: 1,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "h1",
      activeMemoryUsage: 2048,
      apuThermal: 45,
      gpuThermal: 60
    });

    // Node 2: Large VRAM, cool thermals
    monitor.recordHeartbeat({
      nodeId: "node-gpu-large",
      hostname: "large.local",
      ipAddress: "192.168.1.20",
      port: 24074,
      gpuType: "NVIDIA_CUDA",
      vramTotalMb: 24576,
      vramUsedMb: 4096, // 20480 free
      gpuBusyPercent: 15,
      temperatureCelsius: 48,
      status: "ONLINE",
      activeTasksCount: 0,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "h2",
      activeMemoryUsage: 4096,
      apuThermal: 42,
      gpuThermal: 48
    });

    const decision = dispatcher.selectPlacement({
      taskId: "task-heavy-1",
      model: "deepseek-coder-v2:16b" // requires ~10GB VRAM
    });

    assert.equal(decision.nodeId, "node-gpu-large");
    assert.equal(decision.isLocal, false);
    assert.equal(decision.targetHost, "192.168.1.20");
    assert.match(decision.reason, /20480MB free VRAM/);
  });

  it("should migrate tasks from throttling nodes to cooler destinations", () => {
    const monitor = new FleetHealthMonitor();
    const dispatcher = new DistributedTaskDispatcher(monitor, "local-orchestrator");

    monitor.recordHeartbeat({
      nodeId: "node-throttling",
      hostname: "hot.local",
      ipAddress: "192.168.1.30",
      port: 24074,
      gpuType: "NVIDIA_CUDA",
      vramTotalMb: 12288,
      vramUsedMb: 8192,
      gpuBusyPercent: 99,
      temperatureCelsius: 86,
      status: "ONLINE",
      activeTasksCount: 2,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "h3",
      activeMemoryUsage: 4096,
      apuThermal: 85,
      gpuThermal: 86
    });

    monitor.recordHeartbeat({
      nodeId: "node-cool",
      hostname: "cool.local",
      ipAddress: "192.168.1.40",
      port: 24074,
      gpuType: "NVIDIA_CUDA",
      vramTotalMb: 12288,
      vramUsedMb: 2048,
      gpuBusyPercent: 20,
      temperatureCelsius: 45,
      status: "ONLINE",
      activeTasksCount: 0,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "h4",
      activeMemoryUsage: 2048,
      apuThermal: 40,
      gpuThermal: 45
    });

    const migration = dispatcher.migrateTask("task-reassign", "node-throttling", "qwen2.5-coder:7b");

    assert.ok(migration, "Expected migration decision to be produced");
    assert.equal(migration?.nodeId, "node-cool");
    assert.equal(migration?.targetHost, "192.168.1.40");
    assert.match(migration?.reason ?? "", /Migrated task task-reassign from throttling node node-throttling/);
  });
});
