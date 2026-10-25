import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LooseRootFileGuardRule } from "../rules/catalog/LooseRootFileGuardRule.js";
import type { RuleEvaluationContext } from "@cacophony/shared-types";

describe("Loose Root File Guard Rule", () => {
  const rule = new LooseRootFileGuardRule();

  it("should reject subfolders containing unauthorized files", () => {
    const file1 = "src/main.ts";
    const file2 = "src/unauthorized/subfolder/file.ts";

    assert.equal(rule.validate(file1), true, "File should be allowed");
    assert.equal(
      rule.validate(file2),
      false,
      "Subfolder with unauthorized file should be rejected",
    );
  });

  it("should reject files with different unauthorized paths", () => {
    const unauthorizedPaths = [
      "unauthorized/test.ts",
      "packages/engine/unauthorized/secret.key",
      "nested/path/to/unauthorized/leak.json",
      "tmp/unauthorized/cache.bin",
    ];

    for (const testPath of unauthorizedPaths) {
      assert.equal(
        rule.validate(testPath),
        false,
        `Expected ${testPath} to be rejected as unauthorized`,
      );
    }
  });

  it("should reject files in unauthorized subfolders with different paths", () => {
    const subfolderVariants = [
      "packages/frontend/src/unauthorized/sub1/component.ts",
      "packages/tools/dist/unauthorized/sub2/runner.js",
      "docs/wiki/unauthorized/drafts/spec.md",
      "unauthorized/nested/deeply/script.sh",
    ];

    for (const variant of subfolderVariants) {
      assert.equal(
        rule.validate(variant),
        false,
        `Expected ${variant} in unauthorized subfolder to be rejected`,
      );
    }
  });

  it("should allow legitimate package files and allowed root configuration files", () => {
    const legitimatePaths = [
      "package.json",
      "tsconfig.json",
      "README.md",
      ".gitignore",
      "packages/engine/src/index.ts",
      "packages/frontend/src/app/app.component.ts",
    ];

    for (const path of legitimatePaths) {
      assert.equal(
        rule.validate(path),
        true,
        `Expected legitimate path ${path} to be allowed`,
      );
    }
  });

  it("should reject loose root files that are not in the permitted allowlist", () => {
    const looseRootFiles = [
      "temp.ts",
      "scratchpad.js",
      "test_script.py",
      "dump.sql",
    ];

    for (const file of looseRootFiles) {
      assert.equal(
        rule.validate(file),
        false,
        `Expected loose root file ${file} to be rejected`,
      );
    }
  });

  it("should evaluate RuleEvaluationContext and flag diagnostics for unauthorized paths", async () => {
    const context: RuleEvaluationContext = {
      projectRoot: "/workspace/project",
      hook: "post_generation",
      modifiedFiles: [
        "packages/engine/src/index.ts",
        "unauthorized/exploit.ts",
        "illegal_root_file.ts",
      ],
      fileContents: new Map<string, string>(),
    };

    const result = await rule.evaluate(context, "hard_rejection");
    assert.equal(result.passed, false);
    assert.equal(result.diagnostics.length, 2);
    assert.ok(
      result.diagnostics.some((d) => d.filePath?.includes("unauthorized/exploit.ts")),
    );
    assert.ok(
      result.diagnostics.some((d) => d.filePath?.includes("illegal_root_file.ts")),
    );
  });
});
