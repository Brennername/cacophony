import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CacophonyHttpServer } from "../daemon/CacophonyHttpServer.js";
import { promote } from "../gitea/promoteCli.js";

class MockDaemonForPromotion {
  public taskRepo = {
    listPending: async () => [],
    listRecent: async (_limit: number, _filter?: any) => [
      { id: "task-1", title: "feat: example task", status: "COMPLETED" }
    ]
  };

  public getModelHealthRepository() { return null; }
  public getTenancyGuard() { return null; }
  public getModelManager() { return null; }
  public getBenchmarkRunner() { return null; }
  public getStreamTapManager() { return null; }
  public getTaskRepository() { return this.taskRepo; }
  public getTelemetryPoller() { return null; }
  public getUserSessionRepository() {
    return {
      findSessionByToken: async () => null,
      deleteSession: async () => {}
    };
  }
  public getMaintenanceService() {
    return {
      getStorageMetrics: async () => ({ totalSizeMegabytes: 10, isOverThreshold: false, thresholdBytes: 1000000 })
    };
  }
}

describe("Promotion REST API & CLI Suite (T80.5)", () => {
  let server: CacophonyHttpServer | null = null;
  const testPort = 25166;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  test("GET /api/promotion/status returns staging divergence and pending tasks count", async () => {
    const daemon = new MockDaemonForPromotion();
    server = new CacophonyHttpServer(daemon as any, { httpPort: testPort, httpHost: "127.0.0.1" });
    await server.start();

    const res = await fetch(`${baseUrl}/api/promotion/status`);
    assert.equal(res.status, 200);

    const body = (await res.json()) as any;
    assert.ok(body.stagingBranch);
    assert.equal(typeof body.aheadCount, "number");
    assert.equal(typeof body.behindCount, "number");
    assert.equal(body.pendingTasksCount, 1);
    assert.equal(typeof body.readyForPromotion, "boolean");
  });

  test("POST /api/promotion/release with dryRun passes quarantine gauntlet and returns HTTP 200", async () => {
    const daemon = new MockDaemonForPromotion();
    server = new CacophonyHttpServer(daemon as any, { httpPort: testPort, httpHost: "127.0.0.1" });
    await server.start();

    const cleanDiff = `
--- a/clean.ts
+++ b/clean.ts
@@ -1,1 +1,2 @@
+export const cleanFeature = true;
`;

    const res = await fetch(`${baseUrl}/api/promotion/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestoneTitle: "Sprint 48 Release",
        dryRun: true,
        diff: cleanDiff,
        workspacePath: undefined
      })
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.dryRun, true);
    assert.equal(body.quarantinePassed, true);
  });

  test("POST /api/promotion/release rejects secret leaks with HTTP 422", async () => {
    const daemon = new MockDaemonForPromotion();
    server = new CacophonyHttpServer(daemon as any, { httpPort: testPort, httpHost: "127.0.0.1" });
    await server.start();

    const sampleGh = ["ghp", "_1234567890abcdefghijklmnopqrstuvwxyz"].join("");
    const dirtyDiff = `
--- a/config.ts
+++ b/config.ts
@@ -1,1 +1,2 @@
+const key = "${sampleGh}";
`;

    const res = await fetch(`${baseUrl}/api/promotion/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestoneTitle: "Compromised Release",
        diff: dirtyDiff
      })
    });

    assert.equal(res.status, 422);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.quarantinePassed, false);
    assert.match(body.error, /secret leak/i);
  });

  test("CLI promote function completes in dry-run mode", async () => {
    const success = await promote({ dryRun: true, target: "github", testCommand: "node -e 'process.exit(0)'" });
    assert.equal(success, true);
  });
});
