import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as http from "node:http";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

function httpRequest(
  url: string,
  method = "GET",
  body?: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers: {
          ...(body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
              }
            : {}),
          ...headers
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 500,
              data: raw ? JSON.parse(raw) : null
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              data: raw
            });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

describe("Fleet API & Node Registration Suite (T56.1.3, T56.5.1)", () => {
  it("should list fleet nodes and register worker nodes with valid token", async () => {
    const tmpDir = path.resolve(process.cwd(), "workspaces", "test-fleet-api-" + Date.now());
    await fs.mkdir(tmpDir, { recursive: true });
    const port = 24195;

    process.env.FLEET_CLUSTER_SECRET = "test-cluster-secret";

    const daemon = new CacophonyDaemon({
      dbPath: path.join(tmpDir, "fleet.db"),
      socketPath: path.join(tmpDir, "fleet.sock"),
      httpPort: port
    });

    try {
      await daemon.start();

      // 1. GET /api/fleet/nodes before registration includes local node
      const listRes1 = await httpRequest(`http://127.0.0.1:${port}/api/fleet/nodes`);
      assert.strictEqual(listRes1.status, 200);
      assert.ok(Array.isArray(listRes1.data));
      assert.ok(listRes1.data.length >= 1, "Should include local node metrics");
      const local = listRes1.data.find((n: any) => n.nodeId.includes("local") || n.nodeId.includes("master"));
      assert.ok(local, "Local node should be present in fleet nodes response");
      assert.strictEqual(local.status, "ONLINE");

      // 2. POST /api/fleet/register with invalid token -> 401
      const failRegister = await httpRequest(
        `http://127.0.0.1:${port}/api/fleet/register`,
        "POST",
        JSON.stringify({
          nodeId: "worker-node-1",
          hostname: "remote-worker-1",
          ipAddress: "192.168.1.50",
          port: 24075,
          gpuType: "NVIDIA_CUDA",
          vramTotalMb: 24576,
          token: "invalid-token"
        })
      );
      assert.strictEqual(failRegister.status, 401);

      // 3. POST /api/fleet/register with valid token -> 201
      const registerRes = await httpRequest(
        `http://127.0.0.1:${port}/api/fleet/register`,
        "POST",
        JSON.stringify({
          nodeId: "worker-node-1",
          hostname: "remote-worker-1",
          ipAddress: "192.168.1.50",
          port: 24075,
          gpuType: "NVIDIA_CUDA",
          vramTotalMb: 24576,
          token: "test-cluster-secret"
        })
      );
      assert.strictEqual(registerRes.status, 201);
      assert.strictEqual(registerRes.data.nodeId, "worker-node-1");
      assert.strictEqual(registerRes.data.gpuType, "NVIDIA_CUDA");

      // 4. GET /api/fleet/nodes after registration includes registered worker node
      const listRes2 = await httpRequest(`http://127.0.0.1:${port}/api/fleet/nodes`);
      assert.strictEqual(listRes2.status, 200);
      const registered = listRes2.data.find((n: any) => n.nodeId === "worker-node-1");
      assert.ok(registered, "Registered worker node should now appear in /api/fleet/nodes");
      assert.strictEqual(registered.gpuType, "NVIDIA_CUDA");
    } finally {
      await daemon.stop();
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // non-fatal
      }
    }
  });
});
