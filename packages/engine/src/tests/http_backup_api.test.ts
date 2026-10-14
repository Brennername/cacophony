// packages/engine/src/tests/http_backup_api.test.ts

import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

describe("T74.7.2: HTTP API POST /api/admin/backup On-Demand Snapshot Creation", () => {
  let tempDir: string;
  let daemon: CacophonyDaemon;
  let testHttpPort: number;
  const testSocket = path.join(
    os.tmpdir(),
    `test-bkp-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`,
  );

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-bkp-api-"));
    const distMock = path.join(tempDir, "dist");
    await fs.mkdir(distMock, { recursive: true });
    await fs.writeFile(
      path.join(distMock, "index.html"),
      "<!doctype html><html><body>Cacophony Backup Test</body></html>",
      "utf-8",
    );

    daemon = new CacophonyDaemon({
      dbPath: path.join(tempDir, "test_db"),
      socketPath: testSocket,
      httpPort: 0,
      httpHost: "127.0.0.1",
      frontendDistPath: distMock,
    });

    await daemon.start();
    testHttpPort = daemon.getHttpServer()?.getPort() || 0;
  });

  after(async () => {
    await daemon.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
    try {
      await fs.unlink(testSocket);
    } catch {
      // ignore
    }
  });

  it("should trigger on-demand snapshot via POST /api/admin/backup", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/admin/backup?retentionCount=3`,
      {
        method: "POST",
      },
    );

    if (res.status !== 200) {
      const errText = await res.text();
      assert.fail(`Backup request failed with status ${res.status}: ${errText}`);
    }
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      snapshotPath: string;
      timestamp: string;
      sizeBytes: number;
      prunedSnapshots: string[];
    };

    assert.ok(body.snapshotPath.includes("snapshot-"));
    assert.ok(body.sizeBytes >= 0);
    assert.ok(Array.isArray(body.prunedSnapshots));

    // Verify snapshot exists on filesystem
    const stat = await fs.stat(body.snapshotPath);
    assert.ok(stat.isDirectory());
  });
});
