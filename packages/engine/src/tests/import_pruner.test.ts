import { describe, it } from "node:test";
import assert from "node:assert";
import { ImportPruningEngine } from "../context/ImportPruningEngine.js";

describe("ImportPruningEngine Test Suite", () => {
  const pruner = new ImportPruningEngine();

  it("should strip unused external imports like lodash and rxjs", () => {
    const code = `import _ from "lodash";
import { Observable } from "rxjs";
import { LocalUtil } from "./LocalUtil.js";

export function processData(items: string[]): string[] {
  return items.map(LocalUtil.format);
}
`;

    const pruned = pruner.pruneUnusedImports(code);
    assert.ok(!pruned.includes("lodash"), "lodash should be pruned");
    assert.ok(!pruned.includes("rxjs"), "rxjs should be pruned");
    assert.ok(pruned.includes("./LocalUtil.js"), "relative imports should be preserved");
    assert.ok(pruned.includes("export function processData"));
  });

  it("should retain external imports that are referenced in code", () => {
    const code = `import { debounce } from "lodash";
import { Observable } from "rxjs";

export const obs = new Observable();
`;

    const pruned = pruner.pruneUnusedImports(code);
    assert.ok(!pruned.includes("debounce"), "unused debounce should be pruned");
    assert.ok(pruned.includes("rxjs"), "used rxjs should be preserved");
  });

  it("should consolidate duplicate import declarations from the same module", () => {
    const code = `import { a } from "foo";
import { b } from "foo";

export const result = a + b;
`;

    const consolidated = pruner.consolidateImports(code);
    assert.ok(consolidated.includes(`import { a, b } from "foo";`) || consolidated.includes(`import { b, a } from "foo";`));
  });
});
