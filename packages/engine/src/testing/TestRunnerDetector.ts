import * as fs from "node:fs/promises";
import * as path from "node:path";

export type TestFrameworkType =
  | "vitest"
  | "jest"
  | "mocha"
  | "playwright"
  | "node-test"
  | "maven"
  | "gradle"
  | "go-test"
  | "cargo-test"
  | "generic";

export interface DetectedTestSuite {
  readonly framework: TestFrameworkType;
  readonly defaultCommand: string;
  readonly configFilePath?: string | undefined;
  readonly confidence: number;
}

/**
 * TestRunnerDetector
 *
 * Automatically detects test frameworks and commands across workspaces:
 * - JavaScript/TypeScript (Vitest, Jest, Mocha, Playwright, Node:test)
 * - Java (Maven Surefire, Gradle)
 * - Go (go test)
 * - Rust (cargo test)
 */
export class TestRunnerDetector {
  public async detect(workspaceRoot: string): Promise<DetectedTestSuite> {
    // 1. Check Node package.json scripts and dependencies
    try {
      const pkgPath = path.resolve(workspaceRoot, "package.json");
      const pkgRaw = await fs.readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(pkgRaw);

      const devDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (devDeps.vitest) {
        return { framework: "vitest", defaultCommand: "npx vitest run", confidence: 0.95 };
      }
      if (devDeps.jest) {
        return { framework: "jest", defaultCommand: "npx jest", confidence: 0.95 };
      }
      if (devDeps["@playwright/test"]) {
        return { framework: "playwright", defaultCommand: "npx playwright test", confidence: 0.95 };
      }
      if (devDeps.mocha) {
        return { framework: "mocha", defaultCommand: "npx mocha", confidence: 0.90 };
      }
      if (pkg.scripts?.test && pkg.scripts.test.includes("node --test")) {
        return { framework: "node-test", defaultCommand: "node --test", confidence: 0.90 };
      }
      if (pkg.scripts?.test) {
        return { framework: "node-test", defaultCommand: "npm test", confidence: 0.85 };
      }
    } catch {
      // Not a standard node root
    }

    // 2. Check Java (Maven / Gradle)
    try {
      await fs.stat(path.resolve(workspaceRoot, "pom.xml"));
      return { framework: "maven", defaultCommand: "mvn test", confidence: 0.95 };
    } catch {}

    try {
      await fs.stat(path.resolve(workspaceRoot, "build.gradle"));
      return { framework: "gradle", defaultCommand: "gradle test", confidence: 0.95 };
    } catch {}

    // 3. Check Go
    try {
      await fs.stat(path.resolve(workspaceRoot, "go.mod"));
      return { framework: "go-test", defaultCommand: "go test ./...", confidence: 0.95 };
    } catch {}

    // 4. Check Rust
    try {
      await fs.stat(path.resolve(workspaceRoot, "Cargo.toml"));
      return { framework: "cargo-test", defaultCommand: "cargo test", confidence: 0.95 };
    } catch {}

    return { framework: "generic", defaultCommand: "npm test", confidence: 0.5 };
  }

  /**
   * Scopes test command to only affected files based on changed file list.
   */
  public scopeCommand(
    base: DetectedTestSuite,
    changedFiles: readonly string[]
  ): string {
    if (changedFiles.length === 0) return base.defaultCommand;

    const testFiles = changedFiles.filter((f) =>
      f.includes(".test.") || f.includes(".spec.") || f.includes("Test.java") || f.includes("_test.go")
    );

    if (testFiles.length === 0) return base.defaultCommand;

    switch (base.framework) {
      case "vitest":
        return `npx vitest run ${testFiles.join(" ")}`;
      case "jest":
        return `npx jest ${testFiles.join(" ")}`;
      case "node-test":
        return `node --test ${testFiles.join(" ")}`;
      case "mocha":
        return `npx mocha ${testFiles.join(" ")}`;
      default:
        return base.defaultCommand;
    }
  }
}
