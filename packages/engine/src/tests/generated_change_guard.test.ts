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

  assert.ok(
    issues.some((issue) => issue.includes("left a stub in Service.calculate")),
  );
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
    `Expected issue mentioning residual stub comments, got: ${JSON.stringify(issues)}`,
  );
});

test("GeneratedChangeGuard permits legitimate comments and docstrings mentioning existing code or using ellipsis", () => {
  const replacement = `export class Service {
  /**
   * Helper method that extends the existing implementation with custom parameters...
   */
  public calculate(input: number): number {
    // Preserving calculation logic while applying new offset...
    return input + 5;
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
    "Refactor calculation logic with documentation",
  );

  assert.deepEqual(issues, []);
});

test("GeneratedChangeGuard rejects new Angular component with placeholder template", () => {
  const newComponent = `import { Component } from '@angular/core';

@Component({
  selector: 'app-test-modal',
  template: '<div class="component-container"></div>',
  styles: []
})
export class TestModalComponent {}
`;
  const issues = GeneratedChangeGuard.inspectReplacement(
    "TestModalComponent.ts",
    "",
    newComponent,
    "Render test modal with detailed tabs",
  );

  assert.ok(
    issues.some((i) => i.includes("empty or placeholder template")),
    `Expected placeholder template issue, got: ${JSON.stringify(issues)}`,
  );
});

test("GeneratedChangeGuard rejects naked function execution at module root in library files", () => {
  const libraryFile = `export function migrate(from: string, to: string): void {}

migrate("/path/a", "/path/b");
`;
  const issues = GeneratedChangeGuard.inspectReplacement(
    "MigrationService.ts",
    "",
    libraryFile,
    "Implement migration service",
  );

  assert.ok(
    issues.some((i) => i.includes("executes 'migrate(...)' at module root")),
    `Expected module root execution issue, got: ${JSON.stringify(issues)}`,
  );
});

test("GeneratedChangeGuard rejects stripping existing JSDoc documentation comment blocks", () => {
  const docSource = `/**
 * Service calculating business metrics.
 */
export class MetricService {
  /**
   * Computes aggregate total.
   */
  public compute(val: number): number {
    return val * 2;
  }
}
`;
  const stripped = `export class MetricService {
  public compute(val: number): number {
    return val * 2;
  }
}
`;
  const issues = GeneratedChangeGuard.inspectReplacement(
    "MetricService.ts",
    docSource,
    stripped,
    "Update compute logic",
  );

  assert.ok(
    issues.some((i) =>
      i.includes("stripped 2 JSDoc documentation comment block(s)"),
    ),
    `Expected JSDoc stripped issue, got: ${JSON.stringify(issues)}`,
  );
});

test("GeneratedChangeGuard accepts valid markdown documentation prose without TypeScript parse errors", () => {
  const originalMd = "# Architecture Documentation\n\nInitial overview.";
  const replacementMd = `# Architecture Documentation

## Overview
This specification details the task directive schema:
- [Role: type_specialist]
- [Model: qwen2.5-coder:7b]
- [Temp: 0.2]

### Details
All models operate under strict AST scrubbing guardrails.
`;

  const issues = GeneratedChangeGuard.inspectReplacement(
    "docs/taskcade_metadata_spec.md",
    originalMd,
    replacementMd,
    "Document taskcade metadata syntax and hint conventions",
  );

  assert.deepEqual(
    issues,
    [],
    `Expected no issues for valid markdown prose, got: ${JSON.stringify(issues)}`,
  );
});

test("GeneratedChangeGuard validates JSON files and rejects malformed syntax", () => {
  const validJson = JSON.stringify({ name: "cacophony", version: "1.0.0" }, null, 2);
  const invalidJson = `{ name: "cacophony", invalid: `;

  const validIssues = GeneratedChangeGuard.inspectReplacement(
    "config.json",
    "",
    validJson,
    "Update configuration",
  );
  assert.deepEqual(validIssues, []);

  const invalidIssues = GeneratedChangeGuard.inspectReplacement(
    "config.json",
    "",
    invalidJson,
    "Update configuration",
  );
  assert.ok(
    invalidIssues.some((i) => i.includes("Generated JSON replacement is not valid")),
  );
});

test("GeneratedChangeGuard rejects inline template and inline styles enforcing Angular companion file decomposition", () => {
  const inlineTemplateComponent = `@Component({
  selector: 'app-user-badge',
  template: '<div class="badge"><span>Badge</span></div>'
})
export class UserBadgeComponent {}`;

  const inlineStylesComponent = `@Component({
  selector: 'app-user-badge',
  templateUrl: './user-badge.component.html',
  styles: ['.badge { color: red; }']
})
export class UserBadgeComponent {}`;

  const validDecomposedComponent = `@Component({
  selector: 'app-user-badge',
  templateUrl: './user-badge.component.html',
  styleUrl: './user-badge.component.css'
})
export class UserBadgeComponent {}`;

  const tplIssues = GeneratedChangeGuard.inspectReplacement(
    "src/app/user-badge.component.ts",
    "",
    inlineTemplateComponent,
    "Add user badge component",
  );
  assert.ok(
    tplIssues.some((i) =>
      i.includes("has an inline template; Angular standards require decomposing"),
    ),
  );

  const styleIssues = GeneratedChangeGuard.inspectReplacement(
    "src/app/user-badge.component.ts",
    "",
    inlineStylesComponent,
    "Add user badge component",
  );
  assert.ok(
    styleIssues.some((i) =>
      i.includes("has inline styles; Angular standards require decomposing"),
    ),
  );

  const validIssues = GeneratedChangeGuard.inspectReplacement(
    "src/app/user-badge.component.ts",
    "",
    validDecomposedComponent,
    "Add user badge component",
  );
  assert.deepEqual(validIssues, []);
});

test("GeneratedChangeGuard rejects removal of existing test cases in test files", () => {
  const originalTestFile = `
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("MathService", () => {
  it("should add two numbers correctly", () => {
    assert.equal(1 + 1, 2);
  });

  it("should subtract two numbers correctly", () => {
    assert.equal(5 - 3, 2);
  });
});
`;

  // Replacement drops the subtract test case
  const modifiedTestFile = `
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("MathService", () => {
  it("should add two numbers correctly", () => {
    assert.equal(1 + 1, 2);
  });
});
`;

  const issues = GeneratedChangeGuard.inspectReplacement(
    "packages/engine/src/tests/math.test.ts",
    originalTestFile,
    modifiedTestFile,
    "Refactor math service tests",
  );

  assert.ok(
    issues.some((i) =>
      i.includes('removes existing test case: "should subtract two numbers correctly"'),
    ),
  );
});

