import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

describe("T97.2.1: Dynamic Host Header Resolver with Custom Port Numbers", () => {
  let tempDir: string;
  let daemon: CacophonyDaemon;
  const testHttpPort = 24201;
  const testSocket = path.join(
    os.tmpdir(),
    `test-host-port-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`,
  );

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-host-port-"));
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

  it("should resolve dynamic host and port when X-Forwarded-Host contains custom port", async () => {
    const customHost = "dashboard.internal.lan:8443";
    const res = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/config/network`,
      {
        headers: {
          "X-Forwarded-Host": customHost,
          "X-Forwarded-Proto": "https",
          Origin: `https://${customHost}`,
        },
      },
    );

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as {
      resolvedOrigin: string;
      forwardedHost: string;
      forwardedProto: string;
      isLoopback: boolean;
      isLan: boolean;
    };

    assert.strictEqual(data.forwardedHost, customHost);
    assert.strictEqual(data.forwardedProto, "https");
    assert.strictEqual(data.resolvedOrigin, `https://${customHost}`);
    assert.strictEqual(
      res.headers.get("access-control-allow-origin"),
      `https://${customHost}`,
    );
  });
});
