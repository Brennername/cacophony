import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

describe("T97.2.2: IPv6 Localhost (::1) Dynamic CORS and Loopback Mapping", () => {
  let tempDir: string;
  let daemon: CacophonyDaemon;
  const testHttpPort = 24202;
  const testSocket = path.join(
    os.tmpdir(),
    `test-ipv6-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`,
  );

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-ipv6-"));
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

  it("should correctly identify IPv6 loopback [::1] as loopback in network profile", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/config/network`,
      {
        headers: {
          "X-Forwarded-Host": "[::1]:24161",
          "X-Forwarded-Proto": "http",
          Origin: "http://[::1]:24161",
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

    assert.strictEqual(data.isLoopback, true);
    assert.strictEqual(data.resolvedOrigin, "http://[::1]:24161");
    assert.strictEqual(
      res.headers.get("access-control-allow-origin"),
      "http://[::1]:24161",
    );
  });
});
