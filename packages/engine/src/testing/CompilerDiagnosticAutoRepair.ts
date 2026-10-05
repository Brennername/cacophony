import type { CompilerDiagnostic } from "./CompilerDiagnosticParser.js";

export interface CompilerAutoRepairResult {
  readonly repairedCode: string;
  readonly repairsApplied: readonly string[];
}

/**
 * Applies only a semantics-preserving TypeScript ESM import-extension repair.
 * Missing symbols, unused declarations, test-framework APIs, and type errors are
 * returned to the model remediation stage instead of being hidden with shims,
 * `any` fallbacks, or edits that can remove behavior.
 */
export class CompilerDiagnosticAutoRepair {
  public repair(code: string, diagnostics: readonly CompilerDiagnostic[]): CompilerAutoRepairResult {
    if (!diagnostics.length || diagnostics.some((diagnostic) => diagnostic.errorCode !== "TS2834")) {
      return { repairedCode: code, repairsApplied: [] };
    }

    const lines = code.split("\n");
    const repairsApplied: string[] = [];
    for (const diagnostic of diagnostics) {
      const suggestion = diagnostic.message.match(/Did you mean ['"]([^'"]+\.js)['"]\?/i)?.[1];
      const line = lines[diagnostic.lineNumber - 1];
      if (!suggestion || !line) continue;

      const unextended = suggestion.slice(0, -3);
      const quotedImport = new RegExp(`(['"])${unextended.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1`);
      if (quotedImport.test(line)) {
        lines[diagnostic.lineNumber - 1] = line.replace(quotedImport, (_match, quote: string) => `${quote}${suggestion}${quote}`);
        repairsApplied.push(`Added missing .js extension to '${suggestion}'`);
      }
    }

    return { repairedCode: lines.join("\n"), repairsApplied };
  }
}
