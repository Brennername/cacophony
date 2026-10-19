import type { TaskRepository } from "@cacophony/db";
import type { IGitPlatformProvider, GitPlatformIssue } from "./IGitPlatformProvider.js";
import type { TaskRecord } from "@cacophony/shared-types";

export interface DiscoveredGap {
  readonly type: "todo" | "fixme" | "stub_throw" | "mock_placeholder" | "unimplemented";
  readonly filePath: string;
  readonly lineNumber: number;
  readonly matchedText: string;
  readonly surroundingContext: string;
}

export interface DiscoveredRegression {
  readonly testName: string;
  readonly failureReason: string;
  readonly location?: string | undefined;
  readonly testCommand: string;
}

export interface SynthesizeGapIssueOptions {
  readonly owner: string;
  readonly repo: string;
  readonly gap: DiscoveredGap;
  readonly taskId?: string | undefined;
  readonly modelName?: string | undefined;
}

export interface SynthesizeRegressionIssueOptions {
  readonly owner: string;
  readonly repo: string;
  readonly regression: DiscoveredRegression;
  readonly taskId?: string | undefined;
  readonly focusFiles?: string | null | undefined;
}

export interface SynthesizedIssueResult {
  readonly created: boolean;
  readonly issue?: GitPlatformIssue | undefined;
  readonly taskId?: string | undefined;
  readonly reason?: string | undefined;
}

/**
 * AutomatedIssueSynthesizer
 *
 * Scans code and test outputs for buggy, broken, mocked-up, or unimplemented sections,
 * synthesizes structured issues on the Git platform (Gitea/GitHub), enqueues corresponding
 * arena tasks into the TaskRepository, and manages resolution closure upon verification.
 */
export class AutomatedIssueSynthesizer {
  private readonly gitProvider: IGitPlatformProvider;
  private readonly taskRepo: TaskRepository;

  constructor(options: {
    readonly gitProvider: IGitPlatformProvider;
    readonly taskRepo: TaskRepository;
  }) {
    this.gitProvider = options.gitProvider;
    this.taskRepo = options.taskRepo;
  }

  /**
   * Scans a file's content for unimplemented stubs, mock data, or TODO/FIXME markers.
   */
  public scanCodeForGaps(filePath: string, content: string): readonly DiscoveredGap[] {
    const isTestFile =
      filePath.includes(".test.") ||
      filePath.includes(".spec.") ||
      filePath.includes("__tests__");

    const lines = content.split("\n");
    const gaps: DiscoveredGap[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";
      const trimmed = line.trim();

      // Check for TODO markers
      if (trimmed.includes("TODO:") || trimmed.includes("TODO ")) {
        gaps.push({
          type: "todo",
          filePath,
          lineNumber: i + 1,
          matchedText: trimmed,
          surroundingContext: this.extractSurroundingContext(lines, i),
        });
        continue;
      }

      // Check for FIXME markers
      if (trimmed.includes("FIXME:") || trimmed.includes("FIXME ")) {
        gaps.push({
          type: "fixme",
          filePath,
          lineNumber: i + 1,
          matchedText: trimmed,
          surroundingContext: this.extractSurroundingContext(lines, i),
        });
        continue;
      }

      // Check for stub throws in non-test files
      if (!isTestFile) {
        if (
          trimmed.includes('throw new Error("not implemented') ||
          trimmed.includes("throw new Error('not implemented") ||
          trimmed.includes('throw new Error("TODO') ||
          trimmed.includes('throw new Error("stub')
        ) {
          gaps.push({
            type: "stub_throw",
            filePath,
            lineNumber: i + 1,
            matchedText: trimmed,
            surroundingContext: this.extractSurroundingContext(lines, i),
          });
          continue;
        }

        // Check for placeholder returns like: return {} as any;
        if (
          trimmed.startsWith("return {} as any") ||
          trimmed.startsWith("return null as any") ||
          trimmed.startsWith("return [] as any")
        ) {
          gaps.push({
            type: "mock_placeholder",
            filePath,
            lineNumber: i + 1,
            matchedText: trimmed,
            surroundingContext: this.extractSurroundingContext(lines, i),
          });
          continue;
        }
      }
    }

    return gaps;
  }

  /**
   * Scans test stdout/stderr for failed assertions and regression diagnostics.
   */
  public scanTestFailuresForRegressions(
    testOutput: string,
    testCommand: string,
  ): readonly DiscoveredRegression[] {
    const regressions: DiscoveredRegression[] = [];
    const lines = testOutput.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";

      // Node test runner failure pattern: not ok <N> - <testName>
      if (line.includes("not ok ") || line.includes("FAIL ")) {
        const testNameMatch = line.match(/(?:not ok \d+ - |FAIL )(.*)/);
        const testName = testNameMatch ? testNameMatch[1]?.trim() : line.trim();

        // Seek following lines for error reason and location
        let failureReason = "Test assertion failed";
        let location: string | undefined;

        for (let j = i + 1; j < Math.min(lines.length, i + 12); j++) {
          const sub = lines[j] || "";
          if (sub.includes("error:") || sub.includes("AssertionError") || sub.includes("Expected values")) {
            failureReason = sub.trim();
          }
          if (sub.includes("location:") || sub.includes(".test.") || sub.includes(".spec.")) {
            location = sub.trim().replace(/^location:\s*'?"?/, "").replace(/'?"?$/, "");
          }
        }

        regressions.push({
          testName: testName || "Unknown test",
          failureReason,
          location,
          testCommand,
        });
      }
    }

    return regressions;
  }

  /**
   * Synthesizes and submits an issue for a discovered gap or mock, and enqueues an arena task.
   */
  public async submitGapIssue(
    options: SynthesizeGapIssueOptions,
  ): Promise<SynthesizedIssueResult> {
    const title = `[Unimplemented/Gap] ${options.gap.filePath}:${options.gap.lineNumber} - ${options.gap.matchedText.slice(0, 80)}`;

    // De-duplicate against existing task repository
    const existing = await this.taskRepo.getByTitle(title);
    if (existing) {
      return { created: false, reason: "Issue task already enqueued", taskId: existing.id };
    }

    const body = [
      `## Automated Gap / Mock Detected`,
      `- **File**: \`${options.gap.filePath}:${options.gap.lineNumber}\``,
      `- **Type**: \`${options.gap.type}\``,
      options.taskId ? `- **Encountered During Task**: \`${options.taskId}\`` : "",
      options.modelName ? `- **Reported By Model**: \`${options.modelName}\`` : "",
      ``,
      `### Code Snippet`,
      `\`\`\`typescript`,
      options.gap.surroundingContext,
      `\`\`\``,
      ``,
      `### Requirement`,
      `Implement authentic functional logic replacing this placeholder/stub in accordance with SOLID design principles.`,
    ]
      .filter((l) => l !== "")
      .join("\n");

    let issue: GitPlatformIssue | undefined;
    if (typeof this.gitProvider.createIssue === "function") {
      try {
        issue = await this.gitProvider.createIssue(options.owner, options.repo, {
          title,
          body,
          labels: ["gap", "autonomous-backlog"],
        });
      } catch (err) {
        console.warn(`[AutomatedIssueSynthesizer] Failed to create issue on Git provider:`, err);
      }
    }

    const taskId = `gap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const taskRecord: TaskRecord = {
      id: taskId,
      title,
      prompt: `[AUTOMATED GAP RESOLUTION]: ${title}\n\n${body}`,
      role: "implementer",
      status: "PENDING",
      priority: "P1",
      modelAssigned: null,
      testCommand: "npm test",
      focusFiles: options.gap.filePath,
      targetBranch: "main",
      prUrl: issue?.htmlUrl ?? null,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    await this.taskRepo.create(taskRecord);

    return {
      created: true,
      issue,
      taskId,
    };
  }

  /**
   * Synthesizes and submits an issue for a test regression identified during TDD, and enqueues red-green refactor task.
   */
  public async submitRegressionIssue(
    options: SynthesizeRegressionIssueOptions,
  ): Promise<SynthesizedIssueResult> {
    const title = `[TDD Regression] ${options.regression.testName.slice(0, 90)}`;

    const existing = await this.taskRepo.getByTitle(title);
    if (existing) {
      return { created: false, reason: "Regression task already enqueued", taskId: existing.id };
    }

    const body = [
      `## TDD Regression Detected`,
      `- **Test**: \`${options.regression.testName}\``,
      `- **Command**: \`${options.regression.testCommand}\``,
      options.regression.location ? `- **Location**: \`${options.regression.location}\`` : "",
      options.taskId ? `- **Caused Near Task**: \`${options.taskId}\`` : "",
      ``,
      `### Diagnostic Failure Reason`,
      `\`\`\`text`,
      options.regression.failureReason,
      `\`\`\``,
      ``,
      `### TDD Red-Green-Refactor Plan`,
      `Restore test invariant to passing green state without masking assertions or weakening typing contracts.`,
    ]
      .filter((l) => l !== "")
      .join("\n");

    let issue: GitPlatformIssue | undefined;
    if (typeof this.gitProvider.createIssue === "function") {
      try {
        issue = await this.gitProvider.createIssue(options.owner, options.repo, {
          title,
          body,
          labels: ["regression", "tdd-refactor"],
        });
      } catch (err) {
        console.warn(`[AutomatedIssueSynthesizer] Failed to create regression issue on Git provider:`, err);
      }
    }

    const taskId = `regr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const taskRecord: TaskRecord = {
      id: taskId,
      title,
      prompt: `[TDD RED-GREEN-REFACTOR]: ${title}\n\n${body}`,
      role: "test_engineer",
      status: "PENDING",
      priority: "P0",
      modelAssigned: null,
      testCommand: options.regression.testCommand,
      focusFiles: options.focusFiles ?? options.regression.location ?? null,
      targetBranch: "main",
      prUrl: issue?.htmlUrl ?? null,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    await this.taskRepo.create(taskRecord);

    return {
      created: true,
      issue,
      taskId,
    };
  }

  /**
   * Closes an issue on the remote platform with verification rationale from a reasoning model.
   */
  public async closeResolvedIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    resolutionNote: string,
    verifierModel?: string,
  ): Promise<void> {
    if (typeof this.gitProvider.closeIssue !== "function") return;

    const signature = verifierModel ? `Verified by model: **${verifierModel}**` : "Verified by Cacophony Engine";
    const comment = `## Issue Resolved & Verified\n\n${resolutionNote.trim()}\n\n> ${signature}`;

    try {
      await this.gitProvider.closeIssue(owner, repo, issueNumber, { comment });
    } catch (err) {
      console.warn(`[AutomatedIssueSynthesizer] Failed to close issue #${issueNumber}:`, err);
    }
  }

  private extractSurroundingContext(lines: readonly string[], targetIndex: number): string {
    const start = Math.max(0, targetIndex - 2);
    const end = Math.min(lines.length, targetIndex + 3);
    return lines
      .slice(start, end)
      .map((l, idx) => `${start + idx + 1}: ${l}`)
      .join("\n");
  }
}
