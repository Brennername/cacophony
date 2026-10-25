import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FleetMasterCoordinator } from "../fleet/FleetMasterCoordinator.js";
import type { FleetNodeRegistration } from "@cacophony/shared-types";

describe("FleetMasterCoordinator Unit Test Suite (T102.16.1)", () => {
  const sampleRegistration: FleetNodeRegistration = {
    nodeId: "node-apu-01",
    hostname: "vega-rig.local",
    ipAddress: "192.168.1.101",
    port: 24072,
    gpuType: "AMD_VEGA",
    vramTotalMb: 16384,
    authSecret: "cluster-secret-key-1234",
  };

  it("should register a remote worker node and list active nodes", () => {
    const coordinator = new FleetMasterCoordinator();
    const node = coordinator.registerNode(sampleRegistration);

    assert.equal(node.nodeId, "node-apu-01");
    assert.equal(node.gpuType, "AMD_VEGA");
    assert.equal(node.status, "ONLINE");
    assert.equal(node.vramTotalMb, 16384);

    const allNodes = coordinator.listNodes();
    assert.equal(allNodes.length, 1);
    assert.equal(allNodes[0]?.nodeId, "node-apu-01");
  });

  it("should update worker telemetry metrics on heartbeat", () => {
    const coordinator = new FleetMasterCoordinator();
    coordinator.registerNode(sampleRegistration);

    const updated = coordinator.recordHeartbeat("node-apu-01", {
      vramUsedMb: 4096,
      gpuBusyPercent: 65,
      temperatureCelsius: 62,
    });

    assert.equal(updated, true);
    const node = coordinator.listNodes().find((n) => n.nodeId === "node-apu-01");
    assert.ok(node);
    assert.equal(node.vramUsedMb, 4096);
    assert.equal(node.gpuBusyPercent, 65);
    assert.equal(node.temperatureCelsius, 62);
    assert.equal(node.status, "ONLINE");
  });

  it("should flag node status as DEGRADED when temperature exceeds 90C", () => {
    const coordinator = new FleetMasterCoordinator();
    coordinator.registerNode(sampleRegistration);

    coordinator.recordHeartbeat("node-apu-01", {
      vramUsedMb: 8192,
      gpuBusyPercent: 99,
      temperatureCelsius: 92,
    });

    const node = coordinator.listNodes().find((n) => n.nodeId === "node-apu-01");
    assert.ok(node);
    assert.equal(node.status, "DEGRADED");
  });

  it("should return false when recording heartbeat for an unknown node ID", () => {
    const coordinator = new FleetMasterCoordinator();
    const result = coordinator.recordHeartbeat("unknown-node", {
      vramUsedMb: 0,
      gpuBusyPercent: 0,
      temperatureCelsius: 40,
    });

    assert.equal(result, false);
  });

  it("should balance VRAM allocation and select the best node for task dispatch", () => {
    const coordinator = new FleetMasterCoordinator();

    // Node 1: AMD_VEGA with 4GB free VRAM
    coordinator.registerNode({
      ...sampleRegistration,
      nodeId: "node-vega",
      gpuType: "AMD_VEGA",
      vramTotalMb: 8192,
    });
    coordinator.recordHeartbeat("node-vega", {
      vramUsedMb: 4096, // 4096MB free
      gpuBusyPercent: 50,
      temperatureCelsius: 50,
    });

    // Node 2: NVIDIA_CUDA with 12GB free VRAM
    coordinator.registerNode({
      ...sampleRegistration,
      nodeId: "node-cuda",
      hostname: "cuda-rig.local",
      gpuType: "NVIDIA_CUDA",
      vramTotalMb: 16384,
    });
    coordinator.recordHeartbeat("node-cuda", {
      vramUsedMb: 4096, // 12288MB free
      gpuBusyPercent: 20,
      temperatureCelsius: 45,
    });

    // Request requires 8GB VRAM -> should select NVIDIA node because Vega only has 4GB free
    const selected = coordinator.selectBestNode(8192);
    assert.ok(selected);
    assert.equal(selected.nodeId, "node-cuda");

    // Request requires preferred GPU
    const preferredSelected = coordinator.selectBestNode(2048, "AMD_VEGA");
    assert.ok(preferredSelected);
    assert.equal(preferredSelected.nodeId, "node-vega");
  });

  it("should return null if no nodes satisfy required VRAM or thermal limits", () => {
    const coordinator = new FleetMasterCoordinator();
    coordinator.registerNode(sampleRegistration);
    coordinator.recordHeartbeat("node-apu-01", {
      vramUsedMb: 14000,
      gpuBusyPercent: 95,
      temperatureCelsius: 88, // Over 85C threshold
    });

    // Requires 4GB free, but only ~2GB free and overheating
    const selected = coordinator.selectBestNode(4096);
    assert.equal(selected, null);
  });

  it("should evict node explicitly and prune stale nodes that stopped sending heartbeats", () => {
    const coordinator = new FleetMasterCoordinator();
    coordinator.registerNode(sampleRegistration);
    assert.equal(coordinator.listNodes().length, 1);

    const evicted = coordinator.evictNode("node-apu-01");
    assert.equal(evicted, true);
    assert.equal(coordinator.listNodes().length, 0);

    // Register node with simulated older timestamp
    coordinator.registerNode(sampleRegistration);
    const node = coordinator.listNodes()[0]!;
    // Set lastHeartbeat to 60 seconds ago
    (node as any).lastHeartbeat = new Date(Date.now() - 60000).toISOString();

    const prunedCount = coordinator.pruneStaleNodes(30000); // 30s timeout
    assert.equal(prunedCount, 1);
    assert.equal(coordinator.listNodes().length, 0);
  });

  it("should register heterogeneous GPU hardware profiles", () => {
    const coordinator = new FleetMasterCoordinator();

    const vegaProfile = coordinator.getHardwareProfile("AMD_VEGA");
    assert.ok(vegaProfile);
    assert.equal(vegaProfile.gpuType, "AMD_VEGA");
    assert.ok(vegaProfile.evalTokensPerSec > 0);

    const cudaProfile = coordinator.getHardwareProfile("NVIDIA_CUDA");
    assert.ok(cudaProfile);
    assert.equal(cudaProfile.gpuType, "NVIDIA_CUDA");
    assert.ok(cudaProfile.evalTokensPerSec > vegaProfile.evalTokensPerSec);

    const appleProfile = coordinator.getHardwareProfile("APPLE_SILICON");
    assert.ok(appleProfile);
    assert.equal(appleProfile.gpuType, "APPLE_SILICON");
  });
});
