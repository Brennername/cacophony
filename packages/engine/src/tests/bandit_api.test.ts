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
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers: body
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body),
            }
          : {},
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
              data: raw ? JSON.parse(raw) : null,
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              data: raw,
            });
          }
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

describe("Bandit Policy API Integration Suite (T55.2, T60.5)", () => {
  it("should get model arms and dynamically update policy via PUT /api/bandit/policy", async () => {
    const tmpDir = path.resolve(
      process.cwd(),
      "workspaces",
      "test-bandit-api-" + Date.now(),
    );
    await fs.mkdir(tmpDir, { recursive: true });
    const port = 24190;

    const daemon = new CacophonyDaemon({
      dbPath: path.join(tmpDir, "bandit.db"),
      socketPath: path.join(tmpDir, "bandit.sock"),
      httpPort: port,
    });

    try {
      await daemon.start();

      // 1. GET /api/bandit/arms
      const getRes = await httpRequest(
        `http://127.0.0.1:${port}/api/bandit/arms`,
      );
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.data.success, true);
      assert.ok(Array.isArray(getRes.data.arms));
      assert.ok(getRes.data.arms.length > 0, "Should have registered arms");

      // 2. PUT /api/bandit/policy to update policy to thompson sampling
      const updateRes = await httpRequest(
        `http://127.0.0.1:${port}/api/bandit/policy`,
        "PUT",
        JSON.stringify({
          policy: "thompson_sampling",
          explorationRate: 0.22,
          ucbConstant: 1.5,
        }),
      );
      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.data.policy, "thompson_sampling");
      assert.strictEqual(updateRes.data.explorationRate, 0.22);

      // Verify scheduler state in daemon
      const banditScheduler = daemon.getBanditScheduler();
      assert.ok(banditScheduler);
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
