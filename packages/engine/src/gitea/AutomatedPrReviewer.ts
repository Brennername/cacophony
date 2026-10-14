export interface ReviewFinding {
  readonly path?: string | undefined;
  readonly line?: number | undefined;
  readonly severity: "info" | "warning" | "blocker";
  readonly message: string;
}

export interface StructuredReviewVerdict {
  readonly verdict: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
  readonly summary: string;
  readonly findings: readonly ReviewFinding[];
  readonly rawOutput: string;
}

/**
 * Evaluates git diffs produced by autonomous worker tasks against:
 * 1. SOLID engineering principles (Single Responsibility, Open-Closed, Liskov, Interface Segregation, Dependency Inversion)
 * 2. Strict zero-emoji compliance across code, comments, and strings
 * 3. Security standards (no hardcoded secrets, injection vulnerabilities, or directory traversal)
 * 4. Architectural integrity (no dummy test mocks or short-circuit bypasses)
 */
export class AutomatedPrReviewer {
  // Regex to detect emojis in reviewed diff
  private static readonly EMOJI_REGEX =
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;

  /**
   * Generates a structured prompt for the reviewer model.
   */
  public generateReviewPrompt(
    diff: string,
    taskTitle: string,
    taskDescription?: string,
  ): string {
    const descSection = taskDescription
      ? `\n### Task Specification\n${taskDescription.trim()}\n`
      : "";

    return [
      `You are an expert software reviewer inspecting proposed changes for task: "${taskTitle}".`,
      descSection,
      "### Review Standards",
      "1. SOLID Principles: Verify single responsibility, clean decoupling, and robust interfaces.",
      "2. Zero-Emoji Compliance: Absolute zero tolerance for emojis or pictographs in code, comments, or documentation.",
      "3. Security & Secrets: Ensure no credentials, API keys, or security regressions are introduced.",
      "4. Test Integrity: Ensure production invariants are genuinely validated without dummy passes or short-circuits.",
      "",
      "### Proposed Changes (Git Diff)",
      "```diff",
      diff.trim() || "No file changes detected.",
      "```",
      "",
      "### Required Response Format",
      "Respond strictly with the following format:",
      "VERDICT: [APPROVE | REQUEST_CHANGES | COMMENT]",
      "SUMMARY: [One to three sentences summarizing your assessment]",
      "FINDINGS:",
      "- [BLOCKER | WARNING | INFO] [file:line]: Description of the finding",
    ].join("\n");
  }

  /**
   * Parses the model's review output into a strongly-typed StructuredReviewVerdict.
   */
  public parseReviewVerdict(modelOutput: string): StructuredReviewVerdict {
    const cleanOutput = modelOutput.trim();

    // 1. Check for immediate zero-emoji policy violation in the output itself
    const findings: ReviewFinding[] = [];
    let detectedVerdict: "APPROVE" | "REQUEST_CHANGES" | "COMMENT" = "APPROVE";

    if (AutomatedPrReviewer.EMOJI_REGEX.test(cleanOutput)) {
      findings.push({
        severity: "blocker",
        message:
          "Zero-emoji policy violation: output contains prohibited emoji characters.",
      });
      detectedVerdict = "REQUEST_CHANGES";
    }

    // Extract VERDICT: line
    const verdictMatch = cleanOutput.match(
      /VERDICT:\s*(APPROVE|APPROVED|REQUEST_CHANGES|COMMENT)/i,
    );
    if (verdictMatch && verdictMatch[1]) {
      const v = verdictMatch[1].toUpperCase();
      if (v === "APPROVE" || v === "APPROVED") {
        detectedVerdict = "APPROVE";
      } else if (v === "REQUEST_CHANGES") {
        detectedVerdict = "REQUEST_CHANGES";
      } else {
        detectedVerdict = "COMMENT";
      }
    } else {
      // Fallback heuristics
      if (
        cleanOutput.includes("REQUEST_CHANGES") ||
        cleanOutput.includes("CHANGES_REQUESTED") ||
        cleanOutput.includes("REJECT")
      ) {
        detectedVerdict = "REQUEST_CHANGES";
      } else if (cleanOutput.includes("APPROVE")) {
        detectedVerdict = "APPROVE";
      } else {
        detectedVerdict = "COMMENT";
      }
    }

    // Extract SUMMARY: line
    let summary = "";
    const summaryMatch = cleanOutput.match(
      /SUMMARY:\s*([\s\S]*?)(?=(?:FINDINGS:|$))/i,
    );
    if (summaryMatch && summaryMatch[1]) {
      summary = summaryMatch[1].trim();
    } else {
      summary = cleanOutput.slice(0, 300).trim();
    }

    // Extract FINDINGS lines
    const findingsSectionMatch = cleanOutput.match(/FINDINGS:\s*([\s\S]*)$/i);
    if (findingsSectionMatch && findingsSectionMatch[1]) {
      const lines = findingsSectionMatch[1].split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("-")) continue;

        const findingMatch = trimmed.match(
          /^-\s*\[(BLOCKER|WARNING|INFO)\]\s*(?:\[([^\]]+)\])?\s*:?\s*(.*)$/i,
        );
        if (findingMatch) {
          const rawSeverity = (findingMatch[1] || "INFO").toLowerCase();
          const severity: "info" | "warning" | "blocker" =
            rawSeverity === "blocker"
              ? "blocker"
              : rawSeverity === "warning"
                ? "warning"
                : "info";

          const loc = findingMatch[2] || "";
          let filePath: string | undefined = undefined;
          let lineNum: number | undefined = undefined;

          if (loc.includes(":")) {
            const parts = loc.split(":");
            filePath = parts[0];
            const parsed = parseInt(parts[1] || "", 10);
            if (!Number.isNaN(parsed)) lineNum = parsed;
          } else if (loc) {
            filePath = loc;
          }

          const message = findingMatch[3]?.trim() || trimmed;

          findings.push({
            path: filePath,
            line: lineNum,
            severity,
            message,
          });

          if (severity === "blocker" && detectedVerdict === "APPROVE") {
            detectedVerdict = "REQUEST_CHANGES";
          }
        }
      }
    }

    return {
      verdict: detectedVerdict,
      summary: summary || "Review completed without detailed summary notes.",
      findings,
      rawOutput: cleanOutput,
    };
  }
}
