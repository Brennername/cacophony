import test from "node:test";
import assert from "node:assert/strict";
import { GeneratedChangeGuard } from "../testing/GeneratedChangeGuard.js";

const original = `export class Service {
  public calculate(input: number): number {
    return input + 1;
  }

  public preserveThis(): string {
    return "real behavior";
  }
}
`;

test("GeneratedChangeGuard rejects removal of existing declarations and large accidental shrinkage", () => {
  const source = [
    "export class Service {",
    "  public keep(): void {}",
    "  public existing(): void {}",
    ...Array.from(
      { length: 100 },
      (_, index) => `  // preserve context ${index}`,
    ),
    "}",
  ].join("\n");
  const replacement = "export class Service { public keep(): void {} }";

  const issues = GeneratedChangeGuard.inspectReplacement(
    "Service.ts",
    source,
    replacement,
    "Add a new capability",
  );
  assert.ok(issues.some((issue) => issue.includes("shrinks Service.ts")));
  assert.ok(issues.some((issue) => issue.includes("Service.existing")));
});

test("GeneratedChangeGuard allows explicitly requested removal while preserving unrelated declarations", () => {
  const source =
    "export class Service { public keep(): void {} public obsolete(): void {} }";
  const replacement = "export class Service { public keep(): void {} }";

  assert.deepEqual(
    GeneratedChangeGuard.inspectReplacement(
      "Service.ts",
      source,
      replacement,
      "Remove the existing method obsolete",
    ),
    [],
  );
});

test("GeneratedChangeGuard rejects sibling method replacement even when declarations remain", () => {
  const replacement = `export class Service {
  public calculate(input: number): number {
    return input + 2;
  }

  public preserveThis(): string {
    // previous code goes here
    return "stub";
  }
}
`;

  const issues = GeneratedChangeGuard.inspectReplacement(
    "Service.ts",
    original,
    replacement,
    "Update method calculate",
  );

  assert.ok(
    issues.some((issue) =>
      issue.includes("non-target member Service.preserveThis"),
    ),
  );
  assert.ok(issues.some((issue) => issue.includes("placeholder code")));
});

test("GeneratedChangeGuard allows one targeted method body change", () => {
  const replacement = original.replace(
    "return input + 1;",
    "return Math.max(0, input + 1);",
  );
  const issues = GeneratedChangeGuard.inspectReplacement(
    "Service.ts",
    original,
    replacement,
    "Update method calculate to clamp the result",
  );

  assert.deepEqual(issues, []);
});

test("GeneratedChangeGuard rejects signature changes to the targeted method", () => {
  const replacement = original.replace(
    "calculate(input: number): number",
    "calculate(input: number, offset = 0): number",
  );
  const issues = GeneratedChangeGuard.inspectReplacement(
    "Service.ts",
    original,
    replacement,
    "Update method calculate",
  );

  assert.ok(
    issues.some((issue) =>
      issue.includes("changed the signature of Service.calculate"),
    ),
  );
});

test("GeneratedChangeGuard permits valid full-file edits when not targeting a single method", () => {
  const replacement = `export class Service {
  public calculate(input: number): number {
    return input + 10;
  }

  public preserveThis(): string {
    return "updated behavior";
  }

  public newFeature(): boolean {
    return true;
  }
}
`;
  const issues = GeneratedChangeGuard.inspectReplacement(
    "Service.ts",
    original,
    replacement,
    "Refactor service calculations and enhance features",
  );

  assert.deepEqual(issues, []);
});

test("GeneratedChangeGuard rejects stub replacement on general full-file edits", () => {
  const replacement = `export class Service {
  public calculate(input: number): number {
    throw new Error("not implemented");
  }

  public preserveThis(): string {
    return "real behavior";
  }
}
`;
  const issues = GeneratedChangeGuard.inspectReplacement(
    "Service.ts",
    original,
    replacement,
    "Refactor calculation logic across service",
  );

  assert.ok(issues.some((issue) => issue.includes("left a stub in Service.calculate")));
});

test("T93.3.2: GeneratedChangeGuard rejects replacements containing residual hash stub comments", () => {
  const replacement = `export class Service {
  public calculate(input: number): number {
    /* [CACOPHONY_HASH_STUB:99aabbcc:calculate] */
    return input + 1;
  }

  public preserveThis(): string {
    return "real behavior";
  }
}
`;
  const issues = GeneratedChangeGuard.inspectReplacement(
    "Service.ts",
    original,
    replacement,
    "Refactor calculation logic across service",
  );

  assert.ok(
    issues.some((issue) => issue.includes("residual stub comments")),
    `Expected issue mentioning residual stub comments, got: ${JSON.stringify(issues)}`
  );
});


