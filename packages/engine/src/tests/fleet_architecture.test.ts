import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { FleetMasterCoordinator } from "../fleet/FleetMasterCoordinator.js";
import { NvidiaTelemetryProvider, AmdRDNAProvider, AppleSiliconProvider } from "../telemetry/FleetTelemetryProviders.js";

describe("Phase 24: Distributed Multi-Node Fleet Architecture & Hardware Profiling", () => {
  describe("T24.1: FleetMasterCoordinator Node Registration & Dynamic Dispatch", () => {
    test("should register heterogeneous worker nodes and track heartbeats", () => {
      const coordinator = new FleetMasterCoordinator();

      const vegaNode = coordinator.registerNode({
        nodeId: "node-vega-01",
        hostname: "worker-vega",
        ipAddress: "192.168.1.101",
        port: 24074,
        gpuType: "AMD_VEGA",
        vramTotalMb: 16384,
        authSecret: "secret-token-1"
      });

      const cudaNode = coordinator.registerNode({
        nodeId: "node-cuda-01",
        hostname: "worker-cuda",
        ipAddress: "192.168.1.102",
        port: 24074,
        gpuType: "NVIDIA_CUDA",
        vramTotalMb: 24576,
        authSecret: "secret-token-2"
      });

      assert.equal(coordinator.listNodes().length, 2);
      assert.equal(vegaNode.status, "ONLINE");
      assert.equal(cudaNode.gpuType, "NVIDIA_CUDA");

      // Record heartbeat
      const heartbeatOk = coordinator.recordHeartbeat("node-vega-01", {
        vramUsedMb: 4096,
        gpuBusyPercent: 30,
        temperatureCelsius: 60
      });
      assert.equal(heartbeatOk, true);

      // Verify node selection matches requirements
      const bestForBigModel = coordinator.selectBestNode(20000, "NVIDIA_CUDA");
      assert.equal(bestForBigModel?.nodeId, "node-cuda-01");

      const bestForApu = coordinator.selectBestNode(4000, "AMD_VEGA");
      assert.equal(bestForApu?.nodeId, "node-vega-01");
    });
  });

  describe("T24.2: Hardware Telemetry Providers & Benchmark Profiles", () => {
    test("should emit valid normalized telemetry from Nvidia, AMD RDNA, and Apple Silicon drivers", async () => {
      const nvidia = new NvidiaTelemetryProvider();
      const rdna = new AmdRDNAProvider();
      const apple = new AppleSiliconProvider();

      const nvSnap = await nvidia.sample();
      assert.equal(nvidia.getName(), "NvidiaTelemetryProvider");
      assert.ok(nvSnap.vramTotalBytes > 0);

      const rdnaSnap = await rdna.sample();
      assert.equal(rdna.getName(), "AmdRDNAProvider");
      assert.ok(rdnaSnap.gpuBusyPercent >= 0);

      const appleSnap = await apple.sample();
      assert.equal(apple.getName(), "AppleSiliconProvider");
      assert.ok(appleSnap.edgeTempCelsius > 0);
    });

    test("should retrieve calibrated hardware profiles for all architectures", () => {
      const coordinator = new FleetMasterCoordinator();
      const vegaProfile = coordinator.getHardwareProfile("AMD_VEGA");
      assert.ok(vegaProfile);
      assert.equal(vegaProfile.optimalBatchSize, 1);
      assert.equal(vegaProfile.maxContextTokens, 8192);

      const cudaProfile = coordinator.getHardwareProfile("NVIDIA_CUDA");
      assert.ok(cudaProfile);
      assert.equal(cudaProfile.optimalBatchSize, 4);
      assert.equal(cudaProfile.maxContextTokens, 32768);
    });
  });
});
