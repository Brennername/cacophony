import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GeneratedChangeGuard } from "../testing/GeneratedChangeGuard.js";

describe("GeneratedChangeGuard", () => {
  it("rejects removal of existing declarations and large accidental shrinkage", () => {
    const original = [
      "export class Service {",
      "  public keep(): void {}",
      "  public existing(): void {}",
      ...Array.from({ length: 100 }, (_, index) => `  // preserve context ${index}`),
      "}"
    ].join("\n");
    const replacement = "export class Service { public keep(): void {} }";

    const issues = GeneratedChangeGuard.inspectReplacement("Service.ts", original, replacement, "Add a new capability");
    assert.ok(issues.some((issue) => issue.includes("shrinks Service.ts")));
    assert.ok(issues.some((issue) => issue.includes("Service.existing")));
  });

  it("allows explicitly requested removal while preserving unrelated declarations", () => {
    const original = "export class Service { public keep(): void {} public obsolete(): void {} }";
    const replacement = "export class Service { public keep(): void {} }";

    assert.deepEqual(
      GeneratedChangeGuard.inspectReplacement("Service.ts", original, replacement, "Remove the existing method obsolete"),
      []
    );
  });
});
