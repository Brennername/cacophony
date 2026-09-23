import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { McpClientManager } from "../mcp/McpClientManager.js";
import { ToolRegistry } from "../ToolRegistry.js";
import { McpServer } from "../mcp/McpServer.js";

describe("MCP Client & Tool Discovery Subsystem", () => {
  it("should connect to an internal or remote MCP HTTP endpoint and discover tools", async () => {
    const registry = new ToolRegistry();
    const serverPort = 21990;
    const server = new McpServer(registry, {
      port: serverPort,
      workspaceRoot: process.cwd(),
      enableStdio: false
    });

    await server.start();

    try {
      const clientRegistry = new ToolRegistry();
      const client = new McpClientManager(clientRegistry);

      const discovered = await client.connectServer({
        serverName: "remote-cacophony",
        transport: "sse",
        url: `http://localhost:${serverPort}`
      });

      assert.ok(discovered.length >= 10);
      assert.ok(discovered.some((t) => t.name === "view_file"));

      // Verify namespaced tool registration into client registry
      const namespacedTool = clientRegistry.getTool("remote-cacophony:view_file");
      assert.ok(namespacedTool);
      assert.equal(namespacedTool.definition.name, "remote-cacophony:view_file");

      await client.disconnectServer("remote-cacophony");
    } finally {
      await server.stop();
    }
  });
});
