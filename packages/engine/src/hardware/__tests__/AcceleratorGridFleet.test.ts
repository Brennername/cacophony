import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { GpuDeviceManager } from "../GpuDeviceManager.js";
import { FleetWebSocketClient, type FleetMessage } from "../../fleet/FleetWebSocketClient.js";

describe("Phase 36: Heterogeneous Multi-Device Accelerator Grid & Remote Fleet Discovery", () => {
  it("T36.1: GpuDeviceManager should enumerate accelerators and identify primary APU", async () => {
    const manager = new GpuDeviceManager();
    const devices = await manager.discoverDevices();

    assert.ok(devices.length >= 1);
    assert.equal(devices[0]?.isPrimaryApu, true);
    assert.ok(devices[0]?.name.includes("AMD"));
  });

  it("T36.2: FleetWebSocketClient should manage connections, heartbeats, and health timeouts", async () => {
    const client = new FleetWebSocketClient({
      nodeId: "worker-node-alpha",
      orchestratorUrl: "ws://cacophony-master:24161/ws/fleet"
    });

    assert.equal(client.isHealthy(), false);
    const connected = await client.connect();
    assert.equal(connected, true);
    assert.equal(client.isHealthy(), true);

    let receivedMsg: FleetMessage | null = null;
    client.onMessage((msg: FleetMessage) => {
      receivedMsg = msg;
    });

    await client.sendHeartbeat({
      vramUsedMb: 3500,
      gpuBusyPercent: 12,
      temperatureCelsius: 52,
      pendingTasksCount: 1,
      activeModel: "qwen2.5-coder:3b"
    });

    assert.ok(receivedMsg !== null);
    const msg = receivedMsg as FleetMessage;
    assert.equal(msg.type, "heartbeat");
    assert.equal(msg.nodeId, "worker-node-alpha");
    assert.equal(msg.payload["vramUsedMb"], 3500);

    client.disconnect();
    assert.equal(client.isHealthy(), false);
  });
});
