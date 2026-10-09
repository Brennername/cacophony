import {
  RuleSeverity,
  RuleLifecycleHook,
  RuleEvaluationContext,
  RuleExecutionResult,
  RuleDiagnostic,
  FileMutation,
} from "@cacophony/shared-types";
import { BaseRepairRule } from "../BaseRepairRule.js";

/**
 * BannedImportScrubberRule
 *
 * Scans code for forbidden package imports (e.g. legacy conductor dependencies,
 * unapproved heavyweight libraries) and strips them or triggers rejection/warning.
 */
export class BannedImportScrubberRule extends BaseRepairRule {
  readonly id = "banned_imports";
  readonly name = "Banned Import Scrubber";
  readonly description = "Detects or strips hallucinated or forbidden third-party library imports.";
  readonly defaultSeverity: RuleSeverity = "hard_rejection";
  readonly applicableHooks: readonly RuleLifecycleHook[] = ["post_generation", "pre_test"];

  public async evaluate(
    context: RuleEvaluationContext,
    severity: RuleSeverity,
    options?: { packages?: string[] }
  ): Promise<RuleExecutionResult> {
    const start = performance.now();
    const diagnostics: RuleDiagnostic[] = [];
    const mutations: FileMutation[] = [];
    let passed = true;

    const bannedList = options?.packages ?? [
      "conductor",
      "lodash",
      "python",
      "@jest/globals",
      "jest",
      "vscode",
      "@types/vscode",
      "mocha",
      "chai",
      "sinon",
      "express",
      "koa",
      "fastify"
    ];
    const escapedList = bannedList.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const bannedPattern = new RegExp(
      `(?:import\\s+[\\s\\S]*?from\\s+["'](?:${escapedList.join("|")})(?:\\/[^"']*)?["'];?|import\\s+["'](?:${escapedList.join("|")})(?:\\/[^"']*)?["'];?)`,
      "g"
    );

    for (const filePath of context.modifiedFiles) {
      if (!filePath.endsWith(".ts") && !filePath.endsWith(".js") && !filePath.endsWith(".tsx")) {
        continue;
      }

      const content = context.fileContents.get(filePath);
      if (!content) continue;

      if (bannedPattern.test(content)) {
        bannedPattern.lastIndex = 0;

        if (severity === "silent_repair") {
          let stripped = content.replace(bannedPattern, "");

          // If vscode was stripped and Diagnostic is still referenced, ensure typescript is imported
          if (content.includes("vscode") && /\bDiagnostic\b/.test(stripped) && !stripped.includes("typescript")) {
            stripped = `import * as ts from "typescript";\n${stripped}`;
          }

          // If jest was stripped and jest. is still referenced, inject native node:test compatibility shim
          if ((content.includes("jest") || content.includes("@jest/globals")) && /\bjest\./.test(stripped) && !stripped.includes("const jest =")) {
            const shim = [
              "// Native node:test compatibility shim for jest APIs",
              "const jest = {",
              "  fn: <T extends (...args: any[]) => any>(impl?: T): any => {",
              "    let currentImpl = impl;",
              "    const onceQueue: Array<(...args: any[]) => any> = [];",
              "    const mockFn: any = (...args: any[]) => {",
              "      mockFn.mock.calls.push(args);",
              "      mockFn.called = true;",
              "      mockFn.calledOnce = mockFn.mock.calls.length === 1;",
              "      const effectiveImpl = onceQueue.shift() ?? currentImpl;",
              "      const res = effectiveImpl ? effectiveImpl(...args) : undefined;",
              "      mockFn.mock.results.push({ type: 'return', value: res });",
              "      return res;",
              "    };",
              "    mockFn.mock = {",
              "      calls: [] as any[][],",
              "      results: [] as any[],",
              "      instances: [] as any[],",
              "      lastCall: undefined as any,",
              "      mockClear: () => { mockFn.mock.calls = []; mockFn.mock.results = []; mockFn.mock.instances = []; mockFn.called = false; mockFn.calledOnce = false; },",
              "      mockReset: () => { mockFn.mock.calls = []; mockFn.mock.results = []; mockFn.mock.instances = []; currentImpl = undefined; onceQueue.length = 0; mockFn.called = false; mockFn.calledOnce = false; }",
              "    };",
              "    mockFn.mockReturnValue = (val: any) => { currentImpl = () => val; return mockFn; };",
              "    mockFn.mockReturnValueOnce = (val: any) => { onceQueue.push(() => val); return mockFn; };",
              "    mockFn.mockResolvedValue = (val: any) => { currentImpl = async () => val; return mockFn; };",
              "    mockFn.mockResolvedValueOnce = (val: any) => { onceQueue.push(async () => val); return mockFn; };",
              "    mockFn.mockImplementation = (fnImpl: any) => { currentImpl = fnImpl; return mockFn; };",
              "    mockFn.mockImplementationOnce = (fnImpl: any) => { onceQueue.push(fnImpl); return mockFn; };",
              "    mockFn.mockReset = () => { mockFn.mock.mockReset(); return mockFn; };",
              "    mockFn.mockClear = () => { mockFn.mock.mockClear(); return mockFn; };",
              "    mockFn.mockRejectedValue = (err: any) => { currentImpl = async () => { throw err; }; return mockFn; };",
              "    mockFn.mockRejectedValueOnce = (err: any) => { onceQueue.push(async () => { throw err; }); return mockFn; };",
              "    mockFn.mockReturnThis = () => { currentImpl = function(this: any) { return this; }; return mockFn; };",
              "    mockFn.calledOnceWith = (...args: any[]) => mockFn.mock.calls.length === 1 && JSON.stringify(mockFn.mock.calls[0]) === JSON.stringify(args);",
              "    mockFn.called = false;",
              "    mockFn.calledOnce = false;",
              "    return mockFn;",
              "  },",
              "  spyOn: (obj: any, method: any): any => {",
              "    const original = obj ? obj[method] : undefined;",
              "    const fn = jest.fn(original);",
              "    if (obj) obj[method] = fn;",
              "    return fn;",
              "  },",
              "  mock: (_path: string, _factory?: any) => {},",
              "  clearAllMocks: () => {},",
              "  resetAllMocks: () => {}",
              "};",
              ""
            ].join("\n");
            stripped = `${shim}\n${stripped}`;
          }

          mutations.push({
            filePath,
            originalContent: content,
            updatedContent: stripped,
            description: "Stripped banned package import statements and injected necessary type/runner shims",
          });
        } else if (severity === "hard_rejection") {
          passed = false;
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Banned package import detected in ${filePath}`,
            filePath,
          });
        } else if (severity === "soft_warning") {
          diagnostics.push({
            ruleId: this.id,
            severity,
            message: `Warning: Banned package import present in ${filePath}`,
            filePath,
          });
        }
      }
    }

    const durationMs = performance.now() - start;
    return this.createResult(passed, durationMs, diagnostics, mutations, severity);
  }
}
