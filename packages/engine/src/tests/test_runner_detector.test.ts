import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  TestRunnerDetector,
  type DetectedTestSuite,
} from "../testing/TestRunnerDetector.js";

describe("TestRunnerDetector Test Suite", () => {
  let detector: TestRunnerDetector;
  let tempDir: string;

  beforeEach(async () => {
    detector = new TestRunnerDetector();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-detector-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore temporary directory cleanup failures
    }
  });

  it("should detect vitest when present in package.json devDependencies", async () => {
    const pkg = {
      name: "test-pkg",
      devDependencies: {
        vitest: "^2.0.0",
      },
    };
    await fs.writeFile(path.join(tempDir, "package.json"), JSON.stringify(pkg));

    const result = await detector.detect(tempDir);
    assert.strictEqual(result.framework, "vitest");
    assert.strictEqual(result.defaultCommand, "npx vitest run");
    assert.strictEqual(result.confidence, 0.95);
  });

  it("should detect jest when present in package.json dependencies", async () => {
    const pkg = {
      name: "jest-pkg",
      dependencies: {
        jest: "^29.0.0",
      },
    };
    await fs.writeFile(path.join(tempDir, "package.json"), JSON.stringify(pkg));

    const result = await detector.detect(tempDir);
    assert.strictEqual(result.framework, "jest");
    assert.strictEqual(result.defaultCommand, "npx jest");
  });

  it("should detect playwright when @playwright/test is in devDependencies", async () => {
    const pkg = {
      name: "playwright-pkg",
      devDependencies: {
        "@playwright/test": "^1.40.0",
      },
    };
    await fs.writeFile(path.join(tempDir, "package.json"), JSON.stringify(pkg));

    const result = await detector.detect(tempDir);
    assert.strictEqual(result.framework, "playwright");
    assert.strictEqual(result.defaultCommand, "npx playwright test");
  });

  it("should detect node-test when test script specifies node --test", async () => {
    const pkg = {
      name: "node-test-pkg",
      scripts: {
        test: "node --test dist/**/*.test.js",
      },
    };
    await fs.writeFile(path.join(tempDir, "package.json"), JSON.stringify(pkg));

    const result = await detector.detect(tempDir);
    assert.strictEqual(result.framework, "node-test");
    assert.strictEqual(result.defaultCommand, "node --test");
  });

  it("should detect maven when pom.xml is present", async () => {
    await fs.writeFile(path.join(tempDir, "pom.xml"), "<project></project>");

    const result = await detector.detect(tempDir);
    assert.strictEqual(result.framework, "maven");
    assert.strictEqual(result.defaultCommand, "mvn test");
  });

  it("should detect gradle when build.gradle is present", async () => {
    await fs.writeFile(path.join(tempDir, "build.gradle"), "// gradle config");

    const result = await detector.detect(tempDir);
    assert.strictEqual(result.framework, "gradle");
    assert.strictEqual(result.defaultCommand, "gradle test");
  });

  it("should detect go-test when go.mod is present", async () => {
    await fs.writeFile(path.join(tempDir, "go.mod"), "module example.com/pkg");

    const result = await detector.detect(tempDir);
    assert.strictEqual(result.framework, "go-test");
    assert.strictEqual(result.defaultCommand, "go test ./...");
  });

  it("should detect cargo-test when Cargo.toml is present", async () => {
    await fs.writeFile(path.join(tempDir, "Cargo.toml"), "[package]\nname = \"pkg\"");

    const result = await detector.detect(tempDir);
    assert.strictEqual(result.framework, "cargo-test");
    assert.strictEqual(result.defaultCommand, "cargo test");
  });

  it("should fallback to generic npm test when no recognizable test files exist", async () => {
    const result = await detector.detect(tempDir);
    assert.strictEqual(result.framework, "generic");
    assert.strictEqual(result.defaultCommand, "npm test");
    assert.strictEqual(result.confidence, 0.5);
  });

  it("should scope command for changed vitest test files", () => {
    const suite: DetectedTestSuite = {
      framework: "vitest",
      defaultCommand: "npx vitest run",
      confidence: 0.95,
    };
    const scoped = detector.scopeCommand(suite, [
      "src/foo.ts",
      "src/tests/foo.test.ts",
      "src/tests/bar.spec.ts",
    ]);

    assert.strictEqual(
      scoped,
      "npx vitest run src/tests/foo.test.ts src/tests/bar.spec.ts",
    );
  });

  it("should scope command for changed jest test files", () => {
    const suite: DetectedTestSuite = {
      framework: "jest",
      defaultCommand: "npx jest",
      confidence: 0.95,
    };
    const scoped = detector.scopeCommand(suite, ["tests/example.spec.ts"]);
    assert.strictEqual(scoped, "npx jest tests/example.spec.ts");
  });

  it("should return defaultCommand when changedFiles contains no test files", () => {
    const suite: DetectedTestSuite = {
      framework: "vitest",
      defaultCommand: "npx vitest run",
      confidence: 0.95,
    };
    const scoped = detector.scopeCommand(suite, ["src/service.ts", "src/types.ts"]);
    assert.strictEqual(scoped, "npx vitest run");
  });

  it("should return defaultCommand when changedFiles is empty", () => {
    const suite: DetectedTestSuite = {
      framework: "vitest",
      defaultCommand: "npx vitest run",
      confidence: 0.95,
    };
    const scoped = detector.scopeCommand(suite, []);
    assert.strictEqual(scoped, "npx vitest run");
  });
});
