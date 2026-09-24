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
      focusFilesList = task.focusFiles.trim().split(/\s+/).filter(Boolean);
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
    if (
      !testCommand ||
      testCommand === "npm test" ||
      testCommand.includes("@pkg") ||
      testCommand.includes("--workspaces")
    ) {
      const scoped = this.scopeTestCommand(focusFilesList, activeProfile);
      if (scoped) {
        testCommand = scoped;
        modified = true;
        groomNotes.push(`Scoped test command to: ${testCommand}`);
      } else if (activeProfile.defaultTestRunner && (!testCommand || testCommand.includes("@pkg") || testCommand === "npm test")) {
        testCommand = activeProfile.defaultTestRunner;
        modified = true;
        groomNotes.push(`Defaulted test command from profile to: ${testCommand}`);
      } else if (!testCommand || testCommand.includes("@pkg")) {
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
   * Scans prompt text for file path mentions that exist within the workspace.
   */
  private detectFocusFiles(promptText: string): string[] {
    const matches: string[] = [];
    const pathRegex = /(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_.-]+\.(?:ts|js|json|html|css|java)/g;

    let match: RegExpExecArray | null;
    while ((match = pathRegex.exec(promptText)) !== null) {
      const candidate = match[0];
      const fullPath = path.resolve(this.projectDir, candidate);
      if (fs.existsSync(fullPath)) {
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

