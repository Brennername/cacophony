import test, { describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CacophonyHttpServer } from "../daemon/CacophonyHttpServer.js";

describe("GET /api/repomap Integration Suite", () => {
  let server: CacophonyHttpServer;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  test("GET /api/repomap returns 200 with complete architectural symbol inventory", async () => {
    const mockDaemon: any = {
      getModelHealthRepository: () => null,
      getTenancyGuard: () => null,
      getModelManager: () => null,
      getBenchmarkRunner: () => null,
      getStreamTapManager: () => null,
      getTaskRepository: () => ({ listPending: async () => [] }),
      getTelemetryPoller: () => null,
      getUserSessionRepository: () => null
    };

    server = new CacophonyHttpServer(mockDaemon, { httpPort: 0, httpHost: "127.0.0.1" });
    await server.start();
    const address = (server as any).server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const res = await fetch(`${baseUrl}/api/repomap`);
    assert.equal(res.status, 200);

    const symbols = (await res.json()) as any[];
    assert.ok(Array.isArray(symbols));
    assert.ok(symbols.length > 0);
    assert.ok(symbols.some((s) => s.name === "TaskScheduler"));
    assert.ok(symbols.some((s) => s.filePath.includes("packages/engine")));
  });
});