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
      "Incremental Preservation: Preserve all existing methods, functions, interfaces, properties, and imports in the target file. Never wipe out, truncate, or overwrite existing implementation methods when adding new functionality.",
      "Documentation: Comment code thoroughly explaining how and why functionality is structured."
    ];
  }

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

    const activeProfile = options?.stackProfile ?? this.stackDetector.detect(this.projectDir);
    groomNotes.push(`Resolved active stack profile: ${activeProfile.name} (${activeProfile.id})`);

    let focusFilesList: readonly string[] = [];
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
        const isJsTs = /\.(?:[cm]?[jt]sx?)$/i.test(focus);
        if (isJsTs) {
          testCommand = `node --check ${focus}`;
          modified = true;
          groomNotes.push(`Scoped test command to focus file verification: ${testCommand}`);
        } else {
          testCommand = "";
          modified = true;
          groomNotes.push(`Target test suite '${candidateTest}' not yet created on disk and focus file is non-executable; cleared test command to allow review verification`);
        }
      } else {
        testCommand = "";
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
        lowerTest.includes("curl ") ||
        lowerTest.includes("verify ci") ||
        lowerTest.includes("bin/cacophony");

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

    let enrichedPrompt = task.prompt;

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

    const taskDirectives: readonly string[] = [];
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

    for (const directive of activeProfile.directives) {
      if (!directive.startsWith("Zero Emojis:")) {
        taskDirectives.push(directive);
      }
    }

    const baseDirectives = this.defaultDirectives.filter((d) => !d.startsWith("Zero Emojis:"));
    for (const d of baseDirectives) {
      if (!taskDirectives.some((td) => td.split(":")[0] === d.split(":")[0])) {
        taskDirectives.push(d);
      }
    }

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
      focusFiles: focusFilesList,
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

  public formatPromptForModelArchetype(modelTag: string): string | null {
    if (!modelTag) return null;
    const lower = modelTag.toLowerCase();

    if (lower.includes("r1") || lower.includes("think") || lower.includes("reasoning")) {
      return "Cognitive Reasoning Directive: Enclose your complete strategic thought process, trade-off evaluations, and architectural edge cases inside  tags. Keep internal reasoning concise and under 1,500 tokens before emitting the final markdown code block.";
    }

    if (lower.includes("coder") || lower.includes("gemma") || lower.includes("instruct")) {
      return "Direct Coder Directive: Do not output verbose internal monologues. Jump immediately to synthesized TypeScript code enclosed in markdown code fences.";
    }

    return null;
  }

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

        }
      }
      cur = path.dirname(cur);
    }
    return this.projectDir;
  }

  private detectFocusFiles(promptText: string): readonly string[] {
    const matches: readonly string[] = [];
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
          if (/\.(?:[cm