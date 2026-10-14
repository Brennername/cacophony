import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

describe("T97.2.3: Local Bridge IP Resolution Detects Docker Gateway (172.17.0.1)", () => {
  let tempDir: string;
  let daemon: CacophonyDaemon;
  const testHttpPort = 24203;
  const testSocket = path.join(
    os.tmpdir(),
    `test-bridge-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`,
  );

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-bridge-"));
    const distMock = path.join(tempDir, "dist");
    await fs.mkdir(distMock, { recursive: true });
    await fs.writeFile(
      path.join(distMock, "index.html"),
      "<html><body>Mock Frontend</body></html>",
      "utf-8",
    );

    daemon = new CacophonyDaemon({
      dbPath: path.join(tempDir, "test_db"),
      socketPath: testSocket,
      httpPort: testHttpPort,
      httpHost: "127.0.0.1",
      frontendDistPath: distMock,
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

  it("should classify 172.17.0.1 Docker bridge gateway as LAN network environment", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/config/network`,
      {
        headers: {
          "X-Forwarded-Host": "172.17.0.1:24161",
          "X-Forwarded-Proto": "http",
          Origin: "http://172.17.0.1:24161",
        },
      },
    );

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as {
      resolvedOrigin: string;
      forwardedHost: string;
      isLoopback: boolean;
      isLan: boolean;
    };

    assert.strictEqual(data.isLan, true);
    assert.strictEqual(data.isLoopback, false);
    assert.strictEqual(data.resolvedOrigin, "http://172.17.0.1:24161");
  });
});
