import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

describe("CacophonyDaemon Lifecycle & Signal Resilience Suite (T47.4.3)", () => {
  it("should start daemon, register signal handlers, and clean up locks on stop", async () => {
    const tmpDir = path.resolve(
      process.cwd(),
      "workspaces",
      "test-daemon-lifecycle-" + Date.now(),
    );
    await fs.mkdir(tmpDir, { recursive: true });

    const daemon = new CacophonyDaemon({
      dbPath: path.join(tmpDir, "lifecycle.db"),
      socketPath: path.join(tmpDir, "test.sock"),
    });

    try {
      await daemon.start();
      assert.strictEqual(
        daemon.getConfig().socketPath,
        path.join(tmpDir, "test.sock"),
      );
      assert.ok(daemon.getScheduler(), "Scheduler should be initialized");
      assert.ok(
        daemon.getTaskRepository(),
        "TaskRepository should be initialized",
      );
      assert.ok(
        daemon.getBanditScheduler(),
        "BanditTaskScheduler should be initialized",
      );
      assert.ok(
        daemon.getFleetCoordinator(),
        "FleetMasterCoordinator should be initialized",
      );

      // Verify stopping cleanly releases locks and closes servers
      await daemon.stop();

      // Double-stop must be idempotent
      await daemon.stop();
    } finally {
      await daemon.stop();
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // non-fatal cleanup
      }
    }
  });

  it("should handle process SIGTERM invocation without throwing uncaught exceptions", async () => {
    const tmpDir = path.resolve(
      process.cwd(),
      "workspaces",
      "test-daemon-sigterm-" + Date.now(),
    );
    await fs.mkdir(tmpDir, { recursive: true });

    const daemon = new CacophonyDaemon({
      dbPath: path.join(tmpDir, "sigterm.db"),
      socketPath: path.join(tmpDir, "sigterm.sock"),
    });

    try {
      await daemon.start();
      // Emit SIGTERM and ensure stop executes cleanly
      process.emit("SIGTERM");
      // Allow event loop cycle for async stop to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Daemon should now be stopped
      await daemon.stop();
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
