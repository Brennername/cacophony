import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { IncrementalClassMerger } from "../context/IncrementalClassMerger.js";

describe("IncrementalClassMerger Test Suite", () => {
  test("should preserve existing methods when newly generated code only contains new method", () => {
    const original = `import { A } from "./A.js";

export class WorkerPipeline {
  constructor(private readonly config: any) {}

  public executeTask(): boolean {
    return true;
  }

  public existingMethod(): string {
    return "original";
  }
}
`;

    const generated = `import { B } from "./B.js";

export class WorkerPipeline {
  public newFeature(): number {
    return 42;
  }
}
`;

    const merged = IncrementalClassMerger.merge(original, generated);
    assert.ok(merged.includes("public executeTask(): boolean"));
    assert.ok(merged.includes("public existingMethod(): string"));
    assert.ok(merged.includes("public newFeature(): number"));
    assert.ok(merged.includes('import { B } from "./B.js"'));
    assert.ok(merged.includes('import { A } from "./A.js"'));
  });

  test("should ignore placeholder stubs and preserve existing implementation", () => {
    const original = `export class Service {
  public computeValue(): number {
    const a = 10;
    const b = 20;
    return a + b;
  }
}
`;

    const generated = `export class Service {
  public computeValue(): number {
    /* existing implementation */
  }

  public helper(): boolean {
    return true;
  }
}
`;

    const merged = IncrementalClassMerger.merge(original, generated);
    assert.ok(merged.includes("const a = 10;"));
    assert.ok(merged.includes("public helper(): boolean"));
  });

  test("should return newCode directly when originalCode is empty", () => {
    const generated = `export class NewService {\n  public run() { return true; }\n}`;
    const merged = IncrementalClassMerger.merge("", generated);
    assert.strictEqual(merged, generated);
  });
});
