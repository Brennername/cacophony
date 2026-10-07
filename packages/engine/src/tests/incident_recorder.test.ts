import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { IncidentBundleRecorder } from "../analytics/IncidentBundleRecorder.js";
import type { RegressionBurstAlert } from "../analytics/FailureClusterDetector.js";

test("IncidentBundleRecorder Suite (T91.1.2)", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "incident-rec-test-"));

  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test("should capture and persist incident bundle with git commits and system diagnostics", async () => {
    const recorder = new IncidentBundleRecorder({ storageDir: tmpDir });

    const mockAlert: RegressionBurstAlert = {
      alertId: "burst-12345",
      windowSize: 10,
      totalTasksInWindow: 10,
      failureCount: 4,
      distinctModels: ["qwen2.5-coder:7b", "deepseek-r1:8b"],
      failingTasks: [
        { taskId: "task-f1", modelId: "qwen2.5-coder:7b", status: "FAILED", timestamp: 100, errorDetails: "TS2339: Property not found" },
        { taskId: "task-f2", modelId: "deepseek-r1:8b", status: "FAILED", timestamp: 200, errorDetails: "TS2304: Cannot find name" },
      ],
      timestamp: Date.now(),
      reason: "High failure density",
    };

    const { bundlePath, bundle } = await recorder.captureBundle(mockAlert);

    assert.ok(bundlePath.endsWith(".json"));
    const exists = await fs.stat(bundlePath);
    assert.ok(exists.isFile());

    const readBack = JSON.parse(await fs.readFile(bundlePath, "utf-8"));
    assert.strictEqual(readBack.bundleId, bundle.bundleId);
    assert.strictEqual(readBack.alert.alertId, "burst-12345");
    assert.strictEqual(readBack.failingTasks.length, 2);
    assert.ok(readBack.systemInfo.nodeVersion);

    const bundles = await recorder.listBundles();
    assert.strictEqual(bundles.length, 1);
    assert.strictEqual(bundles[0]?.bundleId, bundle.bundleId);
  });
});
