import { type LspDiagnostic, DiagnosticSeverity } from "./ILspClient.js";

export interface NormalizedDiagnostic {
  readonly uri: string;
  readonly line: number;
  readonly character: number;
  readonly severity: "ERROR" | "WARNING" | "INFO" | "HINT";
  readonly code?: string | undefined;
  readonly source: string;
  readonly message: string;
}

/**
 * LspDiagnosticIngestor
 *
 * Ingests, normalizes, stores, and filters compiler diagnostics
 * received from language servers across workspace files.
 */
export class LspDiagnosticIngestor {
  private readonly store = new Map<string, NormalizedDiagnostic[]>();

  public ingest(uri: string, diagnostics: readonly LspDiagnostic[]): readonly NormalizedDiagnostic[] {
    const normalized: NormalizedDiagnostic[] = diagnostics.map((d) => {
      let severity: "ERROR" | "WARNING" | "INFO" | "HINT" = "ERROR";
      switch (d.severity) {
        case DiagnosticSeverity.Warning:
          severity = "WARNING";
          break;
        case DiagnosticSeverity.Information:
          severity = "INFO";
          break;
        case DiagnosticSeverity.Hint:
          severity = "HINT";
          break;
        default:
          severity = "ERROR";
      }

      return {
        uri,
        line: d.range?.start?.line ?? 0,
        character: d.range?.start?.character ?? 0,
        severity,
        code: d.code !== undefined ? String(d.code) : undefined,
        source: d.source || "lsp",
        message: d.message
      };
    });

    this.store.set(uri, normalized);
    return normalized;
  }

  public getDiagnostics(uri?: string): readonly NormalizedDiagnostic[] {
    if (uri) {
      return this.store.get(uri) || [];
    }
    const all: NormalizedDiagnostic[] = [];
    for (const list of this.store.values()) {
      all.push(...list);
    }
    return all;
  }

  public getErrors(uri?: string): readonly NormalizedDiagnostic[] {
    return this.getDiagnostics(uri).filter((d) => d.severity === "ERROR");
  }

  public clear(uri?: string): void {
    if (uri) {
      this.store.delete(uri);
    } else {
      this.store.clear();
    }
  }

  /**
   * Formats diagnostics into a concise markdown snippet suitable for injection into an LLM prompt.
   */
  public formatForFeedback(uri?: string): string {
    const errors = this.getErrors(uri);
    if (errors.length === 0) {
      return "";
    }

    const lines: string[] = [
      "[LSP COMPILER DIAGNOSTICS DETECTED]:",
      "The following compiler / type errors were emitted by the language server post-edit:"
    ];

    for (const err of errors) {
      const codeStr = err.code ? ` (${err.code})` : "";
      lines.push(`- ${err.uri}:${err.line + 1}:${err.character + 1} [${err.source}${codeStr}] ${err.message}`);
    }

    lines.push("");
    lines.push("Please self-correct your implementation to resolve all compiler errors.");
    return lines.join("\n");
  }
}
