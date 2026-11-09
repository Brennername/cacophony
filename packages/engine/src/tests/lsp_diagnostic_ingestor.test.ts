import { LspDiagnosticIngestor } from '../lsp/LspDiagnosticIngestor.js';
import { test, describe, beforeEach, it } from "node:test";
import assert from "node:assert/strict";

import { type LspDiagnostic, DiagnosticSeverity } from "../lsp/ILspClient.js";

describe("LspDiagnosticIngestor", () => {
  let ingestor: LspDiagnosticIngestor;

  beforeEach(() => {
    ingestor = new LspDiagnosticIngestor();
  });

  describe("Ingestion and Severity Normalization", () => {
    test("should ingest diagnostics and map severities correctly", () => {
      const uri = "file:///workspace/src/app.ts";
      const rawDiagnostics: LspDiagnostic[] = [
        {
          uri,
          range: { start: { line: 10, character: 4 }, end: { line: 10, character: 15 } },
          severity: DiagnosticSeverity.Error,
          code: 2322,
          source: "typescript",
          message: "Type 'string' is not assignable to type 'number'.",
        },
        {
          uri,
          range: { start: { line: 20, character: 2 }, end: { line: 20, character: 8 } },
          severity: DiagnosticSeverity.Warning,
          code: "unused-var",
          source: "eslint",
          message: "'unused' is defined but never used.",
        },
        {
          uri,
          range: { start: { line: 30, character: 0 }, end: { line: 30, character: 5 } },
          severity: DiagnosticSeverity.Information,
          source: "ts-perf",
          message: "Function could be inlined.",
        },
        {
          uri,
          range: { start: { line: 40, character: 1 }, end: { line: 40, character: 7 } },
          severity: DiagnosticSeverity.Hint,
          source: "hint-provider",
          message: "Use const instead of let.",
        },
      ];

      const normalized = ingestor.ingest(uri, rawDiagnostics);
      assert.equal(normalized.length, 4);

      assert.equal(normalized[0]!.severity, "ERROR");
      assert.equal(normalized[0]!.line, 10);
      assert.equal(normalized[0]!.character, 4);
      assert.equal(normalized[0]!.code, "2322");
      assert.equal(normalized[0]!.source, "typescript");

      assert.equal(normalized[1]!.severity, "WARNING");
      assert.equal(normalized[1]!.code, "unused-var");

      assert.equal(normalized[2]!.severity, "INFO");
      assert.equal(normalized[3]!.severity, "HINT");
    });

    test("should default missing optional fields cleanly", () => {
      const uri = "file:///workspace/src/unknown.ts";
      const raw: LspDiagnostic[] = [
        {
          uri,
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          severity: DiagnosticSeverity.Error,
          message: "Generic compiler failure",
        },
      ];

      const normalized = ingestor.ingest(uri, raw);
      assert.equal(normalized[0]!.severity, "ERROR");
      assert.equal(normalized[0]!.source, "lsp");
      assert.equal(normalized[0]!.line, 0);
      assert.equal(normalized[0]!.character, 0);
    });
  });

  describe("Querying and Filtering", () => {
    test("should filter errors across specific URIs or the whole workspace", () => {
      const uri1 = "file:///workspace/src/file1.ts";
      const uri2 = "file:///workspace/src/file2.ts";

      ingestor.ingest(uri1, [
        {
          uri: uri1,
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: DiagnosticSeverity.Error,
          message: "Error 1",
        },
        {
          uri: uri1,
          range: { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          message: "Warning 1",
        },
      ]);
      ingestor.ingest(uri2, [
        {
          uri: uri2,
          range: { start: { line: 3, character: 0 }, end: { line: 3, character: 5 } },
          severity: DiagnosticSeverity.Error,
          message: "Error 2",
        },
      ]);

      const allErrors = ingestor.getErrors();
      assert.equal(allErrors.length, 2);

      const file1Errors = ingestor.getErrors(uri1);
      assert.equal(file1Errors.length, 1);
      assert.equal(file1Errors[0]!.message, "Error 1");

      const file2Diagnostics = ingestor.getDiagnostics(uri2);
      assert.equal(file2Diagnostics.length, 1);
    });

    test("should clear diagnostics for a single URI or all URIs", () => {
      const uri1 = "file:///workspace/src/a.ts";
      const uri2 = "file:///workspace/src/b.ts";

      ingestor.ingest(uri1, [
        {
          uri: uri1,
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: DiagnosticSeverity.Error,
          message: "Err A",
        },
      ]);
      ingestor.ingest(uri2, [
        {
          uri: uri2,
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: DiagnosticSeverity.Error,
          message: "Err B",
        },
      ]);

      ingestor.clear(uri1);
      assert.equal(ingestor.getDiagnostics(uri1).length, 0);
      assert.equal(ingestor.getDiagnostics(uri2).length, 1);

      ingestor.clear();
      assert.equal(ingestor.getDiagnostics().length, 0);
    });
  });

  describe("Prompt Feedback Formatting", () => {
    test("should return empty string when no errors exist", () => {
      const uri = "file:///workspace/src/clean.ts";
      ingestor.ingest(uri, [
        {
          uri,
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          message: "Just a warning",
        },
      ]);
      assert.equal(ingestor.formatForFeedback(uri), "");
    });

    test("should format error markdown block with file line and character references", () => {
      const uri = "file:///workspace/src/service.ts";
      ingestor.ingest(uri, [
        {
          uri,
          range: { start: { line: 14, character: 8 }, end: { line: 14, character: 12 } },
          severity: DiagnosticSeverity.Error,
          code: "TS2304",
          source: "typescript",
          message: "Cannot find name 'foo'.",
        },
      ]);

      const feedback = ingestor.formatForFeedback(uri);
      assert.ok(feedback.includes("[LSP COMPILER DIAGNOSTICS DETECTED]:"));
      assert.ok(
        feedback.includes(
          "file:///workspace/src/service.ts:15:9 [typescript (TS2304)] Cannot find name 'foo'.",
        ),
      );
      assert.ok(feedback.includes("Please self-correct your implementation"));
    });
  });

  it('should normalize diagnostics correctly', () => {
    const diagnostics: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 1,
        code: 123,
        source: 'lsp',
        message: 'Error message',
      },
    ];

    const normalized = ingestor.ingest('file:///path/to/file.ts', diagnostics);
    assert.deepStrictEqual(normalized, [
      {
        uri: 'file:///path/to/file.ts',
        line: 0,
        character: 0,
        severity: 'ERROR',
        code: '123',
        source: 'lsp',
        message: 'Error message',
      },
    ]);
  });

  it('should store diagnostics by URI', () => {
    const diagnostics: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 2,
        code: undefined,
        source: 'lsp',
        message: 'Warning message',
      },
    ];

    ingestor.ingest('file:///path/to/file.ts', diagnostics);
    const storedDiagnostics = ingestor.getDiagnostics('file:///path/to/file.ts');
    assert.deepStrictEqual(storedDiagnostics, [
      {
        uri: 'file:///path/to/file.ts',
        line: 0,
        character: 0,
        severity: 'WARNING',
        code: undefined,
        source: 'lsp',
        message: 'Warning message',
      },
    ]);
  });

  it('should return all diagnostics when URI is not provided', () => {
    const diagnostics1: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file1.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 1,
        code: 123,
        source: 'lsp',
        message: 'Error message',
      },
    ];

    const diagnostics2: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file2.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 2,
        code: undefined,
        source: 'lsp',
        message: 'Warning message',
      },
    ];

    ingestor.ingest('file:///path/to/file1.ts', diagnostics1);
    ingestor.ingest('file:///path/to/file2.ts', diagnostics2);

    const allDiagnostics = ingestor.getDiagnostics();
    assert.deepStrictEqual(allDiagnostics, [
      {
        uri: 'file:///path/to/file1.ts',
        line: 0,
        character: 0,
        severity: 'ERROR',
        code: '123',
        source: 'lsp',
        message: 'Error message',
      },
      {
        uri: 'file:///path/to/file2.ts',
        line: 0,
        character: 0,
        severity: 'WARNING',
        code: undefined,
        source: 'lsp',
        message: 'Warning message',
      },
    ]);
  });

  it('should return errors when URI is not provided', () => {
    const diagnostics1: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file1.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 1,
        code: 123,
        source: 'lsp',
        message: 'Error message',
      },
    ];

    const diagnostics2: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file2.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 2,
        code: undefined,
        source: 'lsp',
        message: 'Warning message',
      },
    ];

    ingestor.ingest('file:///path/to/file1.ts', diagnostics1);
    ingestor.ingest('file:///path/to/file2.ts', diagnostics2);

    const errors = ingestor.getErrors();
    assert.deepStrictEqual(errors, [
      {
        uri: 'file:///path/to/file1.ts',
        line: 0,
        character: 0,
        severity: 'ERROR',
        code: '123',
        source: 'lsp',
        message: 'Error message',
      },
    ]);
  });

  it('should clear diagnostics by URI', () => {
    const diagnostics: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 1,
        code: 123,
        source: 'lsp',
        message: 'Error message',
      },
    ];

    ingestor.ingest('file:///path/to/file.ts', diagnostics);
    ingestor.clear('file:///path/to/file.ts');

    const storedDiagnostics = ingestor.getDiagnostics('file:///path/to/file.ts');
    assert.deepStrictEqual(storedDiagnostics, []);
  });

  it('should clear all diagnostics when URI is not provided', () => {
    const diagnostics1: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file1.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 1,
        code: 123,
        source: 'lsp',
        message: 'Error message',
      },
    ];

    const diagnostics2: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file2.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 2,
        code: undefined,
        source: 'lsp',
        message: 'Warning message',
      },
    ];

    ingestor.ingest('file:///path/to/file1.ts', diagnostics1);
    ingestor.ingest('file:///path/to/file2.ts', diagnostics2);

    ingestor.clear();

    const allDiagnostics = ingestor.getDiagnostics();
    assert.deepStrictEqual(allDiagnostics, []);
  });

  it('should format errors for feedback correctly', () => {
    const diagnostics: readonly LspDiagnostic[] = [
      {
        uri: 'file:///path/to/file.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 1,
        code: 123,
        source: 'lsp',
        message: 'Error message',
      },
    ];

    ingestor.ingest('file:///path/to/file.ts', diagnostics);

    const feedback = ingestor.formatForFeedback();
    assert.strictEqual(feedback, '[LSP COMPILER DIAGNOSTICS DETECTED]:\nThe following compiler / type errors were emitted by the language server post-edit:\n- file:///path/to/file.ts:1:1 [lsp (123)] Error message\n\nPlease self-correct your implementation to resolve all compiler errors.');
  });
});
