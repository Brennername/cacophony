import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

import { ToolRegistry } from "../ToolRegistry.js";
import { LocateFeatureTool } from "../implementations/LocateFeatureTool.js";
import { AstInspectTool } from "../implementations/AstInspectTool.js";
import { RegexTool } from "../implementations/RegexTool.js";
import { McpServer } from "../mcp/McpServer.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

describe("Advanced Code Analysis & MCP Server Tests", () => {
  let tempDir: string;
  let context: ToolExecutionContext;
  let mcpServer: McpServer;
  const testPort = 21299;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-advanced-tools-"));
    context = { workspaceRoot: tempDir };

    const sampleCode = `
import { z } from "zod";

export interface UserSession {
  id: string;
  expiresAt: number;
}

export class AuthenticationManager {
  public verifyToken(token: string): boolean {
    return token.length > 0;
  }
}

export function generateToken(id: string): string {
  return "token-" + id;
}
`;
    await fs.writeFile(path.join(tempDir, "auth.ts"), sampleCode, "utf-8");

    const registry = new ToolRegistry();
    mcpServer = new McpServer(registry, {
      workspaceRoot: tempDir,
      port: testPort,
      host: "127.0.0.1"
    });
    await mcpServer.start();
  });

  after(async () => {
    await mcpServer.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should locate class, interface, and function symbols with LocateFeatureTool", async () => {
    const locateTool = new LocateFeatureTool();
    const classResult = await locateTool.execute(
      { path: ".", symbolName: "AuthenticationManager", kind: "class" },
      context
    );
    assert.strictEqual(classResult.success, true);
    assert.ok(classResult.output.includes("AuthenticationManager"));

    const fnResult = await locateTool.execute(
      { path: ".", symbolName: "generateToken", kind: "function" },
      context
    );
    assert.strictEqual(fnResult.success, true);
    assert.ok(fnResult.output.includes("generateToken"));
  });

  it("should inspect structural syntax tree with AstInspectTool", async () => {
    const astTool = new AstInspectTool();
    const result = await astTool.execute(
      { path: "auth.ts", extractTypes: true },
      context
    );
    assert.strictEqual(result.success, true);
    assert.ok(result.output.includes("UserSession"));
    assert.ok(result.output.includes("AuthenticationManager"));
    assert.ok(result.output.includes("verifyToken"));
  });

  it("should perform regex dry run and substitutions with RegexTool", async () => {
    const regexTool = new RegexTool();
    const dryRunResult = await regexTool.execute(
      {
        path: "auth.ts",
        pattern: "token-",
        replacement: "jwt-",
        dryRun: true
      },
      context
    );
    assert.strictEqual(dryRunResult.success, true);
    assert.ok(dryRunResult.output.includes("[Dry Run]"));

    const realResult = await regexTool.execute(
      {
        path: "auth.ts",
        pattern: "token-",
        replacement: "jwt-",
        dryRun: false
      },
      context
    );
    assert.strictEqual(realResult.success, true);
    const content = await fs.readFile(path.join(tempDir, "auth.ts"), "utf-8");
    assert.ok(content.includes("jwt-"));
  });

  it("should serve MCP discovery and tool execution over HTTP", async () => {
    const toolsResponse = await fetch(`http://127.0.0.1:${testPort}/tools`);
    assert.strictEqual(toolsResponse.status, 200);
    const toolsData = (await toolsResponse.json()) as { tools: Array<{ name: string }> };
    assert.ok(toolsData.tools.length >= 10);

    const callResponse = await fetch(`http://127.0.0.1:${testPort}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolName: "view_file",
        parameters: { path: "auth.ts", startLine: 1, endLine: 5 }
      })
    });
    assert.strictEqual(callResponse.status, 200);
    const callResult = (await callResponse.json()) as { success: boolean; output: string };
    assert.strictEqual(callResult.success, true);
    assert.ok(callResult.output.includes("UserSession"));
  });
});
