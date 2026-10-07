import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicImportInjector } from "../context/DeterministicImportInjector.js";

test("DeterministicImportInjector Suite (T93.2.2)", async (t) => {
  const injector = new DeterministicImportInjector();

  await t.test("injects missing Angular core symbols when referenced without import", () => {
    const code = `export class CounterComponent {
  public count = signal(0);
  public double = computed(() => this.count() * 2);
}
`;

    const result = injector.injectMissingImports(code);
    assert.ok(result.injectedSymbols.includes("signal"));
    assert.ok(result.injectedSymbols.includes("computed"));
    assert.ok(result.updatedCode.includes('import { computed, signal } from "@angular/core";'));
    assert.ok(result.updatedCode.includes("export class CounterComponent"));
  });

  await t.test("does not inject symbols that are already imported", () => {
    const code = `import { signal } from "@angular/core";

export class CounterComponent {
  public count = signal(0);
}
`;

    const result = injector.injectMissingImports(code);
    assert.equal(result.injectedSymbols.length, 0);
    assert.equal(result.updatedCode, code);
  });

  await t.test("supports custom symbol mappings", () => {
    const customInjector = new DeterministicImportInjector({
      RiskCalculator: "./risk/calculator.js",
    });

    const code = `export class AuditService {
  public check(): void {
    const calc = new RiskCalculator();
  }
}
`;

    const result = customInjector.injectMissingImports(code);
    assert.deepEqual(result.injectedSymbols, ["RiskCalculator"]);
    assert.ok(result.updatedCode.includes('import { RiskCalculator } from "./risk/calculator.js";'));
  });
});
