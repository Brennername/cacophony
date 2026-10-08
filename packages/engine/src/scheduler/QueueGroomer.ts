import * as path from "node:path";
import * as fs from "node:fs";
import type { TaskRecord } from "@cacophony/shared-types";
import { StackDetector } from "./stack/StackDetector.js";
import type { IStackProfile } from "./stack/IStackProfile.js";

export interface GroomedTask {
  readonly task: TaskRecord;
  readonly enrichedPrompt: string;
  readonly focusFiles: readonly string[];
  readonly scopedTestCommand: string;
  readonly modified: boolean;
  readonly groomNotes: readonly string[];
  readonly preflightIssues?: readonly string[];
  readonly stackProfile: IStackProfile;
}

/**
 * QueueGroomer
 *
 * Enriches, validates, and scopes pending tasks before dispatch:
 * 1. Resolves missing target focus files.
 * 2. Scopes workspace-level test commands to target packages based on detected stack.
 * 3. Injects architectural directives dynamically resolved from the target stack profile.
 * 4. Enforces Context Minimization: restricts payload to essential file dependencies.
 */
export class QueueGroomer {
  private readonly projectDir: string;
  private readonly defaultDirectives: readonly string[];
  private readonly stackDetector: StackDetector;

  constructor(
    projectDir: string = process.cwd(),
    defaultDirectives?: readonly string[],
    stackDetector?: StackDetector
  ) {
    this.projectDir = QueueGroomer.findRepositoryRoot(projectDir);
    this.stackDetector = stackDetector ?? new StackDetector();
    this.defaultDirectives = defaultDirectives ?? [
      "Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented.",
      "Integrity Rule: Always work and test with genuine integrity. Never fake test passes (e.g. adding dummy print statements, removing assertions, or mocking tests to artificially report 100%). Never drop databases or tables; write explicit, backward-compatible migrations.",
      "Testing Framework: All test suites MUST use the native Node.js test runner ('node:test') and assertion library ('node:assert/strict'). Example: `import { describe, it, test } from 'node:test'; import assert from 'node:assert/strict';`. NEVER import or reference 'jest', '@jest/globals', 'chai', 'mocha', or 'sinon'.",
      "Module Imports: Import only from valid installed workspace packages (@cacophony/shared-types, @cacophony/db, @cacophony/tools) or valid relative paths within the package with explicit .js extensions (e.g. '../gitea/GitWorktreeManager.js', '../scheduler/TaskScheduler.js'). Never hallucinate non-existent packages like '@cacophony/git-worktrees', 'vscode', or '@types/vscode'.",
      "Quality Standards: Adhere strictly to SOLID principles, modularity, and explicit typing.",
      "Incremental Preservation: Preserve all existing methods, functions, interfaces, properties, and imports in the target file. Never wipe out, truncate, or overwrite existing implementation methods when adding new functionality.",
      "Documentation: Comment code thoroughly explaining how and why functionality is structured."
    ];
  }

  /**
   * Grooms a task record and returns enriched prompt and scoped execution directives.
   */
  public groom(
    task: TaskRecord,
    options?: {
      readonly allowedImports?: readonly string[];
      readonly allowEmojis?: boolean;
      readonly stackProfile?: IStackProfile;
    }
  ): GroomedTask {
    const groomNotes: string[] = [];
    const preflightIssues: string[] = [];
    let modified = false;

    // Resolve stack profile (from options or via auto-detection)
    const activeProfile = options?.stackProfile ?? this.stackDetector.detect(this.projectDir);
    groomNotes.push(`Resolved active stack profile: ${activeProfile.name} (${activeProfile.id})`);

    // 1. Resolve Focus Files
    let focusFilesList: string[] = [];
    if (task.focusFiles && task.focusFiles.trim().length > 0) {
      focusFilesList = task.focusFiles
        .trim()
        .replace(/^["']|["']$/g, "")
        .split(/\s+/)
        .map((f) => f.replace(/^["']|["']$/g, "").trim())
        .filter(Boolean);
    } else {
      const resolved = this.detectFocusFiles(task.prompt);
      if (resolved.length > 0) {
        focusFilesList = resolved;
        modified = true;
        groomNotes.push(`Resolved missing focus_files: ${resolved.join(", ")}`);
      }
    }

    if (focusFilesList.length > 1) {
      const primaryTarget = focusFilesList[0]!;
      groomNotes.push(
        `Selected primary target '${primaryTarget}' from ${focusFilesList.length} declared focus files.`
      );
      focusFilesList = [primaryTarget];
      modified = true;
    }
    for (const focusFile of focusFilesList) {
      const absolute = path.resolve(this.projectDir, focusFile);
      const relative = path.relative(this.projectDir, absolute);
      if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        preflightIssues.push(`Focus file '${focusFile}' resolves outside the project root.`);
        continue;
      }
      const packageMatch = focusFile.match(/^packages\/([^/]+)\/src\//);
      if (packageMatch && !fs.existsSync(path.resolve(this.projectDir, "packages", packageMatch[1]!))) {
        preflightIssues.push(`Focus file '${focusFile}' names a workspace package that does not exist.`);
      }
    }

    // 2. Resolve & Scope Test Command
    let testCommand = task.testCommand ? task.testCommand.trim() : "";
    const repoRoot = this.getRepoRoot();

    const testArgMatch = testCommand.match(/(?:npm\s+test(?:\s+--)?|node\s+--test)\s+([^\s]+)/);
    if (testArgMatch && testArgMatch[1]) {
      const candidateTest = testArgMatch[1].replace(/^["']|["']$/g, "").trim();
      const testSrc = path.resolve(repoRoot, candidateTest);
      const testDist = candidateTest.replace("/src/", "/dist/").replace(/\.(?:ts|tsx)$/, ".js");
      const srcExists = fs.existsSync(testSrc) || fs.existsSync(path.resolve(this.projectDir, candidateTest));
      const targetListed = focusFilesList.some((focus) => path.resolve(this.projectDir, focus) === path.resolve(repoRoot, candidateTest));

      if (srcExists || targetListed) {
        if (/^packages\/[^/]+\/src\//.test(candidateTest) && /\.(?:ts|tsx)$/.test(candidateTest)) {
          testCommand = `node --test ${testDist}`;
          modified = true;
          groomNotes.push(`Mapped TypeScript test '${candidateTest}' to its compiled JavaScript output: ${testCommand}`);
        } else if (candidateTest.startsWith("packages/") && fs.existsSync(testSrc) && fs.statSync(testSrc).isDirectory()) {
          const packageName = candidateTest.split("/")[1];
          testCommand = `npm run test --workspace=@cacophony/${packageName}`;
          modified = true;
          groomNotes.push(`Scoped package test command to workspace '${packageName}': ${testCommand}`);
        } else if (candidateTest.startsWith("packages/") && !candidateTest.includes("/src/")) {
          const packageName = candidateTest.split("/")[1];
          testCommand = `npm run test --workspace=@cacophony/${packageName}`;
          modified = true;
          groomNotes.push(`Scoped package test command to workspace '${packageName}': ${testCommand}`);
        } else {
          testCommand = `node --test ${candidateTest}`;
          modified = true;
        }
      } else if (focusFilesList.some((f) => candidateTest.endsWith(path.basename(f)))) {
        testCommand = `node --test ${testDist}`;
        modified = true;
        groomNotes.push(`Target test suite '${candidateTest}' will be created by this task; scoped to compiled test file: ${testCommand}`);
      } else {
        const isDocTask = task.role === "doc_writer" || (focusFilesList.length > 0 && focusFilesList.every((f) => f.endsWith(".md") || f.startsWith("docs/")));
        const closestTest = !isDocTask && candidateTest.startsWith("packages/engine/src/tests/")
          ? this.findClosestEngineTest(candidateTest, task.prompt)
          : null;
        if (closestTest) {
          testCommand = `node --test packages/engine/dist/tests/${closestTest}`;
          modified = true;
          groomNotes.push(`Requested test '${candidateTest}' is missing; selected the unique closest existing engine test '${closestTest}'.`);
        } else {
          const scoped = this.scopeTestCommand(focusFilesList, activeProfile);
          if (scoped) {
            testCommand = scoped;
            groomNotes.push(`Requested test target '${candidateTest}' is missing; fell back to the existing package test suite: ${testCommand}`);
          } else {
            preflightIssues.push(
              `Requested test target '${candidateTest}' does not exist and no package test suite can be selected. Update the task test path before retrying.`
            );
            testCommand = "";
          }
          modified = true;
        }
      }
    } else {
      const lowerTest = testCommand.toLowerCase();
      const isNonRunnable =
        !testCommand ||
        testCommand === "npm test" ||
        testCommand.startsWith("npm test") ||
        testCommand.includes("@pkg") ||
        testCommand.includes("--workspaces") ||
        testCommand.includes("--workspace=@cacophony/engine") ||
        lowerTest.includes("push to branch") ||
        lowerTest.includes("docker compose") ||
        lowerTest.includes("verify ci") ||
        lowerTest.includes("bin/cacophony") ||
        lowerTest.startsWith("go ") ||
        lowerTest.startsWith("cargo ") ||
        lowerTest.startsWith("pytest ") ||
        lowerTest.startsWith("python ");

      if (isNonRunnable) {
        const scoped = this.scopeTestCommand(focusFilesList, activeProfile);
        if (scoped) {
          testCommand = scoped;
          modified = true;
          groomNotes.push(`Scoped test command to: ${testCommand}`);
        } else if (activeProfile.defaultTestRunner && !activeProfile.id.startsWith("typescript")) {
          testCommand = activeProfile.defaultTestRunner;
          modified = true;
          groomNotes.push(`Defaulted test command to stack runner: ${testCommand}`);
        } else {
          testCommand = "";
          modified = true;
          groomNotes.push(`No scoped test suite found for focus files; cleared test command to allow review verification`);
        }
      }
    }

    // 3. Inject Context Directives & Framework Rules
    let enrichedPrompt = task.prompt;

    // Detect feature-level exemptions
    const allowEmojis = options?.allowEmojis || task.prompt.includes("@cacophony-allow-emojis");
    const allowedImports = new Set<string>([
      ...(activeProfile.defaultAllowedLibraries ?? []),
      ...(options?.allowedImports ?? [])
    ]);

    const importMatch = task.prompt.match(/@cacophony-allow-import:\s*([^\r\n]+)/);
    if (importMatch && importMatch[1]) {
      for (const lib of importMatch[1].split(",")) {
        const trimmed = lib.trim();
        if (trimmed) allowedImports.add(trimmed);
      }
    }

    const taskDirectives: string[] = [];
    if (allowEmojis) {
      taskDirectives.push("Feature Exemption: Emojis permitted where required for feature functionality.");
      groomNotes.push("Feature emoji exemption detected and injected into prompt directives.");
    } else {
      taskDirectives.push("Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented.");
    }

    if (allowedImports.size > 0) {
      const allowedStr = Array.from(allowedImports).join(", ");
      taskDirectives.push(`Approved Libraries: Feature is authorized to import: ${allowedStr}. Do NOT import other unapproved third-party libraries.`);
      groomNotes.push(`Injected approved library directives: ${allowedStr}`);
    }

    // Add profile-specific directives
    for (const directive of activeProfile.directives) {
      if (!directive.startsWith("Zero Emojis:")) {
        taskDirectives.push(directive);
      }
    }

    // Add general fallback directives
    const baseDirectives = this.defaultDirectives.filter((d) => !d.startsWith("Zero Emojis:"));
    for (const d of baseDirectives) {
      if (!taskDirectives.some((td) => td.split(":")[0] === d.split(":")[0])) {
        taskDirectives.push(d);
      }
    }

    // 3b. Inject Archetype-Specific Directives (Reasoning vs Direct Coder)
    const modelTag = task.modelAssigned || "";
    const archetypeDirective = this.formatPromptForModelArchetype(modelTag);
    if (archetypeDirective) {
      taskDirectives.push(archetypeDirective);
      groomNotes.push(`Injected archetype directive for model: ${modelTag}`);
    }

    const missingDirectives = taskDirectives.filter(
      (d) => !enrichedPrompt.includes(d.split(":")[0]!)
    );

    if (missingDirectives.length > 0) {
      enrichedPrompt += "\n\n[ARCHITECTURAL DIRECTIVES]:\n" + missingDirectives.map((d) => `- ${d}`).join("\n");
      modified = true;
      groomNotes.push("Injected architectural directives tailored to feature requirements.");
    }

    const updatedTask: TaskRecord = {
      ...task,
      focusFiles: focusFilesList.join(" "),
      testCommand
    };

    return {
      task: updatedTask,
      enrichedPrompt,
      focusFiles: focusFilesList,
      scopedTestCommand: testCommand,
      modified,
      groomNotes,
      preflightIssues,
      stackProfile: activeProfile
    };
  }

  /**
   * Formats archetype-specific guidance based on the assigned model family:
   * - Reasoning models (DeepSeek R1, Qwen Thinking) are instructed to enclose reasoning in <think> tags.
   * - Direct coder models (Qwen 2.5 Coder, Gemma, CodeLlama) are instructed to output markdown code blocks immediately.
   */
  public formatPromptForModelArchetype(modelTag: string): string | null {
    if (!modelTag) return null;
    const lower = modelTag.toLowerCase();

    if (lower.includes("r1") || lower.includes("think") || lower.includes("reasoning")) {
      return "Cognitive Reasoning Directive: Enclose your complete strategic thought process, trade-off evaluations, and architectural edge cases inside <think>...</think> tags. Keep internal reasoning concise and under 1,500 tokens before emitting the final markdown code block.";
    }

    if (lower.includes("coder") || lower.includes("gemma") || lower.includes("instruct")) {
      return "Direct Coder Directive: Do not output verbose internal monologues. Jump immediately to synthesized TypeScript code enclosed in markdown code fences.";
    }

    return null;
  }


  /**
   * Resolves the monorepo root directory dynamically by searching upward for markers.
   */
  private getRepoRoot(): string {
    return QueueGroomer.findRepositoryRoot(this.projectDir);
  }

  private static findRepositoryRoot(startPath: string): string {
    let cur = path.resolve(startPath);
    while (cur !== path.dirname(cur)) {
      if (
        fs.existsSync(path.join(cur, "docs/taskcade.md")) ||
        fs.existsSync(path.join(cur, "pnpm-workspace.yaml"))
      ) {
        return cur;
      }
      const pkgJson = path.join(cur, "package.json");
      if (fs.existsSync(pkgJson)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
          if (pkg.workspaces) return cur;
        } catch {
          // ignore
        }
      }
      cur = path.dirname(cur);
    }
    return path.resolve(startPath);
  }

  /**
   * Scans prompt text for file path mentions that exist within the workspace.
   */
  private detectFocusFiles(promptText: string): string[] {
    const matches: string[] = [];
    const pathRegex = /(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_.-]+\.(?:ts|js|json|html|css|java)/g;
    const repoRoot = this.getRepoRoot();

    let match: RegExpExecArray | null;
    while ((match = pathRegex.exec(promptText)) !== null) {
      const candidate = match[0];
      const fullPath = path.resolve(repoRoot, candidate);
      const localPath = path.resolve(this.projectDir, candidate);
      if (fs.existsSync(fullPath) || fs.existsSync(localPath)) {
        matches.push(candidate);
      }
    }

    return matches;
  }

  /**
   * Determines the most specific package test command given target focus files and stack profile.
   */
  private scopeTestCommand(focusFiles: readonly string[], profile?: IStackProfile): string | null {
    if (focusFiles.length === 0) return null;
    const firstFile = focusFiles[0]!;
    if (firstFile.startsWith("packages/")) {
      const parts = firstFile.split("/");
      if (parts.length >= 2 && parts[1]) {
        const pkgName = parts[1];
        if (pkgName === "engine") {
          const baseName = path.basename(firstFile, path.extname(firstFile));
          const testSrcPath = path.resolve(this.projectDir, `packages/engine/src/tests/${baseName}.test.ts`);
          if (fs.existsSync(testSrcPath)) {
            return `node --test packages/engine/dist/tests/${baseName}.test.js`;
          }
          return `npm run test --workspace=@cacophony/${pkgName}`;
        }
        if (pkgName === "frontend") {
          return `npm run test --workspace=@cacophony/${pkgName}`;
        }
        return `npm test --workspace=@cacophony/${pkgName} --if-present`;
      }
    }

    if (profile?.id === "java-maven" && firstFile.includes("/")) {
      const moduleCandidate = firstFile.split("/")[0];
      const pomPath = path.resolve(this.projectDir, moduleCandidate ?? "", "pom.xml");
      if (fs.existsSync(pomPath)) {
        return `mvn test -pl ${moduleCandidate}`;
      }
    }

    if (profile?.id === "rust" && firstFile.includes("/")) {
      const pkgCandidate = firstFile.split("/")[0];
      const cargoPath = path.resolve(this.projectDir, pkgCandidate ?? "", "Cargo.toml");
      if (fs.existsSync(cargoPath)) {
        return `cargo test -p ${pkgCandidate}`;
      }
    }

    if (profile?.id === "go" && firstFile.includes("/")) {
      const dirCandidate = path.dirname(firstFile);
      return `go test ./${dirCandidate}/...`;
    }

    return null;
  }

  private findClosestEngineTest(requestedPath: string, taskPrompt: string): string | null {
    const testDirectory = path.resolve(this.projectDir, "packages/engine/src/tests");
    let entries: string[];
    try {
      entries = fs.readdirSync(testDirectory).filter((entry) => entry.endsWith(".test.ts"));
    } catch {
      return null;
    }

    const normalizeToken = (token: string): string => token.endsWith("ies") ? `${token.slice(0, -3)}y` : token.replace(/s$/, "");
    const tokens = (value: string): Set<string> => new Set(
      path.basename(value).replace(/\.test\.(?:ts|js)$/i, "").replace(/\.(?:ts|js)$/i, "")
        .toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 2).map(normalizeToken)
    );
    const requestedTokens = tokens(path.basename(requestedPath));
    const taskTokens = tokens(taskPrompt);
    if (requestedTokens.size === 0 && taskTokens.size === 0) return null;
    const scored = entries.map((entry) => {
      const candidateTokens = tokens(entry);
      const pathOverlap = [...requestedTokens].filter((token) => candidateTokens.has(token)).length;
      const taskOverlap = [...taskTokens].filter((token) => candidateTokens.has(token)).length;
      const weightedOverlap = pathOverlap + taskOverlap * 3;
      return { entry: entry.replace(/\.ts$/, ".js"), score: weightedOverlap / Math.sqrt(candidateTokens.size), weightedOverlap, pathOverlap };
    }).filter((candidate) => candidate.pathOverlap > 0 && candidate.score >= 0.9)
      .sort((a, b) => b.score - a.score || b.weightedOverlap - a.weightedOverlap);
    if (scored.length === 0 || (scored.length > 1 && scored[0]!.score === scored[1]!.score && scored[0]!.weightedOverlap === scored[1]!.weightedOverlap)) {
      return null;
    }
    return scored[0]!.entry;
  }
}
