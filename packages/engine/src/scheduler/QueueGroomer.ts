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
    this.projectDir = projectDir;
    this.stackDetector = stackDetector ?? new StackDetector();
    this.defaultDirectives = defaultDirectives ?? [
      "Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented.",
      "Integrity Rule: Always work and test with genuine integrity. Never fake test passes (e.g. adding dummy print statements, removing assertions, or mocking tests to artificially report 100%). Never drop databases or tables; write explicit, backward-compatible migrations.",
      "Module Imports: Import only from valid installed workspace packages (@cacophony/shared-types, @cacophony/db, @cacophony/tools) or valid relative paths within the package (e.g. '../gitea/GitWorktreeManager.js', '../scheduler/TaskScheduler.js'). Never hallucinate non-existent package names like '@cacophony/git-worktrees'.",
      "Quality Standards: Adhere strictly to SOLID principles, modularity, and explicit typing.",
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

    // 2. Resolve & Scope Test Command
    let testCommand = task.testCommand ? task.testCommand.trim() : "";
    const repoRoot = this.getRepoRoot();

    const testArgMatch = testCommand.match(/npm\s+test(?:\s+--)?\s+([^\s]+)/);
    if (testArgMatch && testArgMatch[1]) {
      const candidateTest = testArgMatch[1].replace(/^["']|["']$/g, "").trim();
      const testSrc = path.resolve(repoRoot, candidateTest);
      const testDist = candidateTest.replace("/src/", "/dist/").replace(/\.ts$/, ".js");
      const fullDist = path.resolve(repoRoot, testDist);

      if (fs.existsSync(fullDist) || fs.existsSync(path.resolve(this.projectDir, testDist))) {
        testCommand = `node --test ${testDist}`;
        modified = true;
        groomNotes.push(`Scoped test command to compiled test file: ${testCommand}`);
      } else if (fs.existsSync(testSrc) || fs.existsSync(path.resolve(this.projectDir, candidateTest))) {
        testCommand = `node --test ${candidateTest}`;
        modified = true;
        groomNotes.push(`Scoped test command to source test file: ${testCommand}`);
      } else if (focusFilesList.length > 0) {
        const focus = focusFilesList[0]!;
        testCommand = `node --check ${focus}`;
        modified = true;
        groomNotes.push(`Target test suite '${candidateTest}' not yet created on disk; scoped to focus file verification: ${testCommand}`);
      } else {
        testCommand = "";
      }
    } else if (
      !testCommand ||
      testCommand === "npm test" ||
      testCommand.startsWith("npm test") ||
      testCommand.includes("@pkg") ||
      testCommand.includes("--workspaces") ||
      testCommand.includes("--workspace=@cacophony/engine")
    ) {
      const scoped = this.scopeTestCommand(focusFilesList, activeProfile);
      if (scoped) {
        testCommand = scoped;
        modified = true;
        groomNotes.push(`Scoped test command to: ${testCommand}`);
      } else if (activeProfile.defaultTestRunner) {
        testCommand = activeProfile.defaultTestRunner;
        modified = true;
        groomNotes.push(`Defaulted test command to stack runner: ${testCommand}`);
      } else {
        testCommand = "";
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
      stackProfile: activeProfile
    };
  }


  /**
   * Resolves the monorepo root directory dynamically by searching upward for markers.
   */
  private getRepoRoot(): string {
    let cur = this.projectDir;
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
    return this.projectDir;
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
    const repoRoot = this.getRepoRoot();

    if (firstFile.startsWith("packages/")) {
      const parts = firstFile.split("/");
      if (parts.length >= 2 && parts[1]) {
        const pkgName = parts[1];
        if (pkgName === "engine") {
          const baseName = path.basename(firstFile, path.extname(firstFile));
          const candidateDistTest = path.resolve(repoRoot, `packages/${pkgName}/dist/tests/${baseName}.test.js`);
          const candidateSrcTest = path.resolve(repoRoot, `packages/${pkgName}/src/tests/${baseName}.test.ts`);
          if (fs.existsSync(candidateDistTest) || fs.existsSync(candidateSrcTest)) {
            return `node --test packages/${pkgName}/dist/tests/${baseName}.test.js`;
          }
          if (firstFile.endsWith(".ts") || firstFile.endsWith(".js")) {
            return `node --check ${firstFile}`;
          }
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
}

