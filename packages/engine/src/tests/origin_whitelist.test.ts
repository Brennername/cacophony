import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

describe("T97.2.4: Dynamic Origin Whitelist Rejects External Non-Local Domains", () => {
  let tempDir: string;
  let daemon: CacophonyDaemon;
  const testHttpPort = 24204;
  const testSocket = path.join(
    os.tmpdir(),
    `test-origin-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`,
  );

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-origin-"));
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

  it("should classify external public domains as neither loopback nor LAN", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/config/network`,
      {
        headers: {
          "X-Forwarded-Host": "evil.external-domain.com",
          "X-Forwarded-Proto": "https",
          Origin: "https://evil.external-domain.com",
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

    assert.strictEqual(data.isLoopback, false);
    assert.strictEqual(data.isLan, false);
    assert.strictEqual(data.forwardedHost, "evil.external-domain.com");
  });
});
