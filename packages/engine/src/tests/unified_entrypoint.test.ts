import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

describe("Unified Startup Entrypoint & End-to-End Server Validation", () => {
  let tempDir: string;
  let daemon: CacophonyDaemon;
  const testHttpPort = 24199;
  const testSocket = path.join(os.tmpdir(), `test-e2e-cacophony-${Date.now()}.sock`);

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-e2e-"));
    const distMock = path.join(tempDir, "dist");
    await fs.mkdir(distMock, { recursive: true });
    await fs.writeFile(path.join(distMock, "index.html"), "<html><body>Mock Frontend</body></html>", "utf-8");

    daemon = new CacophonyDaemon({
      dbPath: path.join(tempDir, "cacophony_test_db"),
      socketPath: testSocket,
      httpPort: testHttpPort,
      httpHost: "127.0.0.1",
      frontendDistPath: distMock
    });

    await daemon.start();
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

  it("should serve static Angular frontend at root path", async () => {
    const res = await fetch(`http://127.0.0.1:${testHttpPort}/`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("Mock Frontend"));
  });

  it("should return arena status via REST API", async () => {
    const res = await fetch(`http://127.0.0.1:${testHttpPort}/api/status`);
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { arena: string };
    assert.strictEqual(data.arena, "ONLINE");
  });

  it("should enqueue tasks via REST API and list them", async () => {
    const postRes = await fetch(`http://127.0.0.1:${testHttpPort}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "E2E Automated Task",
        priority: "P0"
      })
    });
    assert.strictEqual(postRes.status, 201);

    const listRes = await fetch(`http://127.0.0.1:${testHttpPort}/api/tasks`);
    assert.strictEqual(listRes.status, 200);
    const tasks = (await listRes.json()) as Array<{ title: string }>;
    assert.ok(tasks.some((t) => t.title === "E2E Automated Task"));
  });
});
