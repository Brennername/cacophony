import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { LspProcessSupervisor } from "../lsp/LspProcessSupervisor.js";
import { DiagnosticSeverity } from "../lsp/ILspClient.js";

describe("LspProcessSupervisor", () => {
  let tempDir: string;
  let mockServerScript: string;
  let supervisor: LspProcessSupervisor | null = null;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-lsp-sup-"));
    mockServerScript = path.join(tempDir, "mock_server.cjs");

    // Write a lightweight Node.js JSON-RPC echo server for stdio communication
    const scriptCode = `
      let buffer = Buffer.alloc(0);

      function send(msg) {
        const body = Buffer.from(JSON.stringify(msg), "utf-8");
        process.stdout.write("Content-Length: " + body.length + "\\r\\n\\r\\n");
        process.stdout.write(body);
      }

      process.stdin.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length > 0) {
          const headerEnd = buffer.indexOf("\\r\\n\\r\\n");
          if (headerEnd === -1) break;
          const header = buffer.subarray(0, headerEnd).toString("utf-8");
          const match = /Content-Length:\\s*(\\d+)/i.exec(header);
          if (!match) {
            buffer = buffer.subarray(headerEnd + 4);
            continue;
          }
          const length = parseInt(match[1], 10);
          const start = headerEnd + 4;
          const end = start + length;
          if (buffer.length < end) break;
          const payload = JSON.parse(buffer.subarray(start, end).toString("utf-8"));
          buffer = buffer.subarray(end);

          if (payload.method === "initialize") {
            send({ jsonrpc: "2.0", id: payload.id, result: { capabilities: {} } });
            // Emit a sample diagnostic notification post-initialize
            send({
              jsonrpc: "2.0",
              method: "textDocument/publishDiagnostics",
              params: {
                uri: "file:///test.ts",
                diagnostics: [{ message: "Syntax error", severity: 1, range: { start: { line: 0, character: 0 } } }]
              }
            });
          } else if (payload.method === "textDocument/definition") {
            send({
              jsonrpc: "2.0",
              id: payload.id,
              result: [{ uri: "file:///target.ts", range: { start: { line: 5, character: 2 } } }]
            });
          } else if (payload.method === "textDocument/documentSymbol") {
            send({
              jsonrpc: "2.0",
              id: payload.id,
              result: [{ name: "MyClass", kind: 5, location: { uri: "file:///test.ts" } }]
            });
          } else if (payload.method === "shutdown") {
            send({ jsonrpc: "2.0", id: payload.id, result: null });
          } else if (payload.method === "exit") {
            process.exit(0);
          }
        }
      });
    `;
    fs.writeFileSync(mockServerScript, scriptCode);
  });

  afterEach(async () => {
    if (supervisor && supervisor.isRunning) {
      await supervisor.stop();
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("should start language server, perform handshake, and report running state", async () => {
    supervisor = new LspProcessSupervisor("test-lsp", {
      workspaceRoot: tempDir,
      serverCommand: "node",
      serverArgs: [mockServerScript],
    });

    assert.equal(supervisor.isRunning, false);
    await supervisor.start();
    assert.equal(supervisor.isRunning, true);
  });

  test("should handle JSON-RPC requests and responses with correlated ID", async () => {
    supervisor = new LspProcessSupervisor("test-lsp", {
      workspaceRoot: tempDir,
      serverCommand: "node",
      serverArgs: [mockServerScript],
    });

    await supervisor.start();

    const defs = await supervisor.findDefinition("file:///test.ts", { line: 1, character: 1 });
    assert.equal(defs.length, 1);
    assert.equal(defs[0]!.uri, "file:///target.ts");

    const symbols = await supervisor.documentSymbols("file:///test.ts");
    assert.equal(symbols.length, 1);
    assert.equal(symbols[0]!.name, "MyClass");
  });

  test("should capture publishDiagnostics notifications into diagnostic store", async () => {
    supervisor = new LspProcessSupervisor("test-lsp", {
      workspaceRoot: tempDir,
      serverCommand: "node",
      serverArgs: [mockServerScript],
    });

    let receivedDiagnostics = false;
    supervisor.onDiagnostics((diags) => {
      if (diags.length > 0) {
        receivedDiagnostics = true;
      }
    });

    await supervisor.start();

    // Wait briefly for notification message to be dispatched from child process
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.equal(receivedDiagnostics, true);
    const stored = supervisor.getDiagnostics("file:///test.ts");
    assert.equal(stored.length, 1);
    assert.equal(stored[0]!.message, "Syntax error");
    assert.equal(stored[0]!.severity, DiagnosticSeverity.Error);
  });

  test("should shut down gracefully on stop", async () => {
    supervisor = new LspProcessSupervisor("test-lsp", {
      workspaceRoot: tempDir,
      serverCommand: "node",
      serverArgs: [mockServerScript],
    });

    await supervisor.start();
    assert.equal(supervisor.isRunning, true);

    await supervisor.stop();
    assert.equal(supervisor.isRunning, false);
  });
});
