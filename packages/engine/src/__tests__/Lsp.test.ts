import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LspDiagnosticIngestor } from "../lsp/LspDiagnosticIngestor.js";
import { LspDetector } from "../lsp/LspDetector.js";
import { DiagnosticSeverity } from "../lsp/ILspClient.js";

describe("LSP Client & Diagnostic Subsystem", () => {
  describe("LspDetector Workspace Probing", () => {
    test("should detect typescript-language-server for node workspace", () => {
      const server = LspDetector.detectServer(process.cwd());
      assert.ok(server !== null);
      assert.equal(server?.name, "typescript-language-server");
      assert.equal(server?.command, "npx");
    });

    test("should instantiate an ILspClient via createClient factory", () => {
      const client = LspDetector.createClient(process.cwd());
      assert.ok(client);
      assert.equal(client.serverName, "typescript-language-server");
      assert.equal(client.isRunning, false);
    });
  });

  describe("LspDiagnosticIngestor Normalization & Feedback", () => {
    const ingestor = new LspDiagnosticIngestor();

    test("should normalize diagnostics and categorize severity", () => {
      const diagnostics = [
        {
          uri: "file:///workspace/src/app.ts",
          range: { start: { line: 10, character: 4 }, end: { line: 10, character: 15 } },
          severity: DiagnosticSeverity.Error,
          code: 2304,
          source: "typescript",
          message: "Cannot find name 'foo'."
        },
        {
          uri: "file:///workspace/src/app.ts",
          range: { start: { line: 20, character: 2 }, end: { line: 20, character: 10 } },
          severity: DiagnosticSeverity.Warning,
          code: 6133,
          source: "typescript",
          message: "'bar' is declared but never read."
        }
      ];

      const normalized = ingestor.ingest("file:///workspace/src/app.ts", diagnostics);
      assert.equal(normalized.length, 2);
      assert.equal(normalized[0]?.severity, "ERROR");
      assert.equal(normalized[0]?.code, "2304");
      assert.equal(normalized[1]?.severity, "WARNING");
    });

    test("should filter errors and format LLM feedback prompt snippet", () => {
      const errors = ingestor.getErrors("file:///workspace/src/app.ts");
      assert.equal(errors.length, 1);
      assert.equal(errors[0]?.message, "Cannot find name 'foo'.");

      const feedback = ingestor.formatForFeedback("file:///workspace/src/app.ts");
      assert.ok(feedback.includes("[LSP COMPILER DIAGNOSTICS DETECTED]"));
      assert.ok(feedback.includes("Cannot find name 'foo'."));
      assert.ok(feedback.includes(":11:5"));
    });

    test("should return empty feedback string when no errors exist", () => {
      ingestor.clear("file:///workspace/src/app.ts");
      const emptyFeedback = ingestor.formatForFeedback("file:///workspace/src/app.ts");
      assert.equal(emptyFeedback, "");
    });
  });
});
