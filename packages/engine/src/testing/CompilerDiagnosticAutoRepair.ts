import { CompilerDiagnostic } from "./CompilerDiagnosticParser.js";

/**
 * Result of executing deterministic compiler diagnostic auto-repairs.
 */
export interface CompilerAutoRepairResult {
  readonly repairedCode: string;
  readonly repairsApplied: readonly string[];
}

/**
 * CompilerDiagnosticAutoRepair
 *
 * Implements deterministic, zero-hallucination auto-repairs for common TypeScript
 * compiler errors emitted during package compilation verification (Phase 63).
 *
 * Handles:
 * - TS6133 / TS6138: Unused local variables and parameters (prefixes with underscore '_')
 * - TS2304: Missing 'jest' / 'expect' test runner globals (injects native node:test compatibility shims)
 * - TS2307: Hallucinated 'vscode' imports (replaces with TypeScript compiler API 'typescript')
 * - TS2307: Hallucinated 'express' imports (strips uninstalled express module)
 * - TS2834: Missing explicit '.js' file extensions in ECMAScript relative imports
 * - TS2345 / TS2322: 'ScriptTarget | undefined' not assignable to 'ScriptTarget' (adds nullish coalescing)
 */
export class CompilerDiagnosticAutoRepair {
  /**
   * Applies deterministic surgical repairs to source code based on parsed compiler diagnostics.
   *
   * @param code The original TypeScript source code.
   * @param diagnostics List of compiler diagnostics parsed from tsc output.
   * @returns Repaired source code and list of descriptions of applied repairs.
   */
  public repair(code: string, diagnostics: readonly CompilerDiagnostic[]): CompilerAutoRepairResult {
    if (!diagnostics || diagnostics.length === 0) {
      return { repairedCode: code, repairsApplied: [] };
    }

    let currentCode = code;
    const repairsApplied: string[] = [];

    // 1. Repair TS2304: Missing 'jest' test runner global
    const hasJestMissing = diagnostics.some(
      (d) => d.errorCode === "TS2304" && /Cannot find name 'jest'/i.test(d.message)
    );
    if (hasJestMissing && !currentCode.includes("const jest =") && !currentCode.includes("var jest =")) {
      const jestShim = [
        "// Native node:test compatibility shim for jest APIs",
        "const jest = {",
        "  fn: <T extends (...args: any[]) => any>(impl?: T) => {",
        "    const fn = (...args: any[]) => (impl ? impl(...args) : undefined);",
        "    fn.mockReturnValue = (val: any) => jest.fn(() => val);",
        "    fn.mockResolvedValue = (val: any) => jest.fn(async () => val);",
        "    fn.mockImplementation = (fnImpl: any) => jest.fn(fnImpl);",
        "    return fn;",
        "  },",
        "  spyOn: (_obj: any, _method: any) => jest.fn(),",
        "  clearAllMocks: () => {},",
        "  resetAllMocks: () => {}",
        "};",
        ""
      ].join("\n");
      currentCode = jestShim + currentCode;
      repairsApplied.push("Injected native node:test compatibility shim for 'jest'");
    }

    // 2. Repair TS2304: Missing 'expect' assertion global
    const hasExpectMissing = diagnostics.some(
      (d) => d.errorCode === "TS2304" && /Cannot find name 'expect'/i.test(d.message)
    );
    if (hasExpectMissing && !currentCode.includes("const expect =")) {
      const expectShim = [
        "// Native node:assert compatibility shim for expect assertions",
        "import assert from 'node:assert/strict';",
        "const expect = (actual: any) => ({",
        "  toBe: (expected: any) => assert.strictEqual(actual, expected),",
        "  toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),",
        "  toBeTruthy: () => assert.ok(actual),",
        "  toBeFalsy: () => assert.ok(!actual),",
        "  toBeDefined: () => assert.notStrictEqual(actual, undefined),",
        "  toBeUndefined: () => assert.strictEqual(actual, undefined),",
        "  toBeNull: () => assert.strictEqual(actual, null),",
        "  toContain: (item: any) => assert.ok(actual && actual.includes ? actual.includes(item) : false),",
        "  toThrow: () => assert.throws(() => { if (typeof actual === 'function') actual(); })",
        "});",
        ""
      ].join("\n");
      currentCode = expectShim + currentCode;
      repairsApplied.push("Injected native node:assert compatibility shim for 'expect'");
    }

    // 3. Repair TS2307: Missing module 'vscode' -> replace with 'typescript'
    const hasVscodeMissing = diagnostics.some(
      (d) => d.errorCode === "TS2307" && /Cannot find module 'vscode'/i.test(d.message)
    );
    if (hasVscodeMissing) {
      const updated = currentCode.replace(
        /import\s+[\s\S]*?from\s+['"]vscode['"];?/g,
        "import * as ts from 'typescript';"
      );
      if (updated !== currentCode) {
        currentCode = updated;
        repairsApplied.push("Replaced hallucinated 'vscode' import with 'typescript'");
      }
    }

    // 4. Repair TS2307: Missing module 'express' -> strip import
    const hasExpressMissing = diagnostics.some(
      (d) => d.errorCode === "TS2307" && /Cannot find module 'express'/i.test(d.message)
    );
    if (hasExpressMissing) {
      const updated = currentCode.replace(/import\s+[\s\S]*?from\s+['"]express['"];?/g, "");
      if (updated !== currentCode) {
        currentCode = updated;
        repairsApplied.push("Removed hallucinated 'express' import statement");
      }
    }

    // 5. Repair TS2834: Explicit .js file extensions in relative imports
    for (const diag of diagnostics) {
      if (diag.errorCode === "TS2834" || /Relative import paths need explicit file extensions/i.test(diag.message)) {
        const suggestionMatch = diag.message.match(/Did you mean '([^']+)'\?/i);
        if (suggestionMatch && suggestionMatch[1]) {
          const suggestedPath = suggestionMatch[1];
          const unextendedPath = suggestedPath.replace(/\.js$/, "");
          const escaped = unextendedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`(['"])${escaped}(['"])`, "g");
          const updated = currentCode.replace(regex, `$1${suggestedPath}$2`);
          if (updated !== currentCode) {
            currentCode = updated;
            repairsApplied.push(`Added missing .js extension to '${suggestedPath}'`);
          }
        }
      }
    }

    // Fallback pass: ensure all relative imports ending without an extension get .js
    const relativeImportRegex = /(from\s+['"])((\.\.?\/)[^'"\n]+)(['"])/g;
    const extendedCode = currentCode.replace(relativeImportRegex, (match, prefix, importPath, _relPrefix, suffix) => {
      if (/\.[a-zA-Z0-9]+$/.test(importPath)) {
        return match;
      }
      repairsApplied.push(`Appended .js extension to '${importPath}'`);
      return `${prefix}${importPath}.js${suffix}`;
    });
    currentCode = extendedCode;

    // 6. Repair TS6133 / TS6138: Unused variable or parameter
    const lines = currentCode.split("\n");
    for (const diag of diagnostics) {
      if (diag.errorCode === "TS6133" || diag.errorCode === "TS6138" || /is declared but (?:its value is never read|never used)/i.test(diag.message)) {
        const varMatch = diag.message.match(/'([^']+)' is declared but/i);
        if (varMatch && varMatch[1]) {
          const varName = varMatch[1];
          if (!varName.startsWith("_") && diag.lineNumber > 0 && diag.lineNumber <= lines.length) {
            const lineIdx = diag.lineNumber - 1;
            const targetLine = lines[lineIdx];
            if (targetLine) {
              // Replace declaration of varName with _varName on this exact line
              const varRegex = new RegExp(`\\b${varName}\\b`, "g");
              lines[lineIdx] = targetLine.replace(varRegex, `_${varName}`);
              repairsApplied.push(`Prefixed unused symbol '${varName}' with '_' at line ${diag.lineNumber}`);
            }
          }
        }
      }
    }
    currentCode = lines.join("\n");

    // 7. Repair TS2345 / TS2322: 'ScriptTarget | undefined' not assignable to 'ScriptTarget'
    for (const diag of diagnostics) {
      if ((diag.errorCode === "TS2345" || diag.errorCode === "TS2322") && /ScriptTarget \| undefined/i.test(diag.message)) {
        if (diag.lineNumber > 0 && diag.lineNumber <= lines.length) {
          const lineIdx = diag.lineNumber - 1;
          const targetLine = lines[lineIdx];
          if (targetLine && targetLine.includes(".target") && !targetLine.includes(".target ??")) {
            lines[lineIdx] = targetLine.replace(/\.target\b/g, ".target ?? ts.ScriptTarget.ES2022");
            repairsApplied.push(`Added nullish fallback for ScriptTarget at line ${diag.lineNumber}`);
          }
        }
      }
    }
    currentCode = lines.join("\n");

    return {
      repairedCode: currentCode,
      repairsApplied
    };
  }
}
