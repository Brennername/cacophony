import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FleetHealthMonitor } from "../fleet/FleetHealthMonitor.js";
import type { INodeHealthStatus } from "@cacophony/shared-types";

describe("FleetHealthMonitor Suite (T86.1)", () => {
  it("should record node heartbeat and retrieve node status accurately", () => {
    const monitor = new FleetHealthMonitor();

    const sampleNode: INodeHealthStatus = {
      nodeId: "node-worker-01",
      hostname: "worker-01.local",
      ipAddress: "192.168.1.101",
      port: 24074,
      gpuType: "NVIDIA_CUDA",
      vramTotalMb: 12288,
      vramUsedMb: 4096,
      gpuBusyPercent: 35,
      temperatureCelsius: 58,
      status: "ONLINE",
      activeTasksCount: 1,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "abc123hash",
      activeMemoryUsage: 2048,
      apuThermal: 45,
      gpuThermal: 58,
      currentTaskAssignment: "task-101",
    };

    monitor.recordHeartbeat(sampleNode);

    const retrieved = monitor.getNode("node-worker-01");
    assert.ok(retrieved, "Expected node to be registered");
    assert.equal(retrieved?.nodeId, "node-worker-01");
    assert.equal(retrieved?.status, "ONLINE");
    assert.equal(retrieved?.vramUsedMb, 4096);
    assert.equal(retrieved?.activeTasksCount, 1);
  });

  it("should transition node status to DEGRADED when thermals exceed threshold", () => {
    const monitor = new FleetHealthMonitor({ thermalThresholdCelsius: 75 });

    const hotNode: INodeHealthStatus = {
      nodeId: "node-hot-02",
      hostname: "worker-hot.local",
      ipAddress: "192.168.1.102",
      port: 24074,
      gpuType: "AMD_RDNA",
      vramTotalMb: 16384,
      vramUsedMb: 8192,
      gpuBusyPercent: 95,
      temperatureCelsius: 82,
      status: "ONLINE",
      activeTasksCount: 2,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "hashhot",
      activeMemoryUsage: 4096,
      apuThermal: 84,
      gpuThermal: 82,
      currentTaskAssignment: "task-heavy",
    };

    monitor.recordHeartbeat(hotNode);

    const retrieved = monitor.getNode("node-hot-02");
    assert.ok(retrieved);
    assert.equal(
      retrieved?.status,
      "DEGRADED",
      "Hot node should be classified as DEGRADED",
    );
  });

  it("should mark stale nodes as OFFLINE when heartbeat expires", () => {
    const monitor = new FleetHealthMonitor({ heartbeatTimeoutMs: 50 });

    const staleNode: INodeHealthStatus = {
      nodeId: "node-stale-03",
      hostname: "worker-stale.local",
      ipAddress: "192.168.1.103",
      port: 24074,
      gpuType: "APPLE_SILICON",
      vramTotalMb: 32768,
      vramUsedMb: 1024,
      gpuBusyPercent: 5,
      temperatureCelsius: 40,
      status: "ONLINE",
      activeTasksCount: 1,
      lastHeartbeat: new Date(Date.now() - 100).toISOString(),
      tokenHash: "hashapple",
      activeMemoryUsage: 1024,
      apuThermal: 40,
      gpuThermal: 40,
      currentTaskAssignment: "task-stale",
    };

    monitor.recordHeartbeat(staleNode);
    // Explicitly backdate the heartbeat to simulate expiration
    const registered = monitor.getNode("node-stale-03");
    if (registered) {
      (registered as any).lastHeartbeat = new Date(
        Date.now() - 200,
      ).toISOString();
    }

    monitor.checkNodeLiveness();

    const checked = monitor.getNode("node-stale-03");
    assert.ok(checked);
    assert.equal(
      checked?.status,
      "OFFLINE",
      "Stale node should transition to OFFLINE",
    );
    assert.equal(checked?.activeTasksCount, 0);
    assert.equal(checked?.currentTaskAssignment, null);
  });

  it("should filter available nodes excluding OFFLINE or overloaded nodes", () => {
    const monitor = new FleetHealthMonitor();

    monitor.recordHeartbeat({
      nodeId: "node-avail-1",
      hostname: "avail-1.local",
      ipAddress: "192.168.1.104",
      port: 24074,
      gpuType: "NVIDIA_CUDA",
      vramTotalMb: 24576,
      vramUsedMb: 4096,
      gpuBusyPercent: 20,
      temperatureCelsius: 50,
      status: "ONLINE",
      activeTasksCount: 1,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "hash1",
      activeMemoryUsage: 2048,
      apuThermal: 45,
      gpuThermal: 50,
    });

    monitor.recordHeartbeat({
      nodeId: "node-offline-2",
      hostname: "offline-2.local",
      ipAddress: "192.168.1.105",
      port: 24074,
      gpuType: "CPU_ONLY",
      vramTotalMb: 0,
      vramUsedMb: 0,
      gpuBusyPercent: 0,
      temperatureCelsius: 40,
      status: "OFFLINE",
      activeTasksCount: 0,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "hash2",
      activeMemoryUsage: 512,
      apuThermal: 40,
      gpuThermal: 40,
    });

    const available = monitor.getAvailableNodes();
    assert.equal(available.length, 1);
    assert.equal(available[0]?.nodeId, "node-avail-1");
  });

  it("should remove node cleanly from registry", () => {
    const monitor = new FleetHealthMonitor();
    monitor.recordHeartbeat({
      nodeId: "node-delete",
      hostname: "delete.local",
      ipAddress: "192.168.1.106",
      port: 24074,
      gpuType: "CPU_ONLY",
      vramTotalMb: 0,
      vramUsedMb: 0,
      gpuBusyPercent: 0,
      temperatureCelsius: 35,
      status: "ONLINE",
      activeTasksCount: 0,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "hashdel",
      activeMemoryUsage: 512,
      apuThermal: 35,
      gpuThermal: 35,
    });

    assert.equal(monitor.listNodes().length, 1);
    const removed = monitor.removeNode("node-delete");
    assert.equal(removed, true);
    assert.equal(monitor.listNodes().length, 0);
  });
});
