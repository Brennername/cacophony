import type { SlipstreamAnalysisResult } from "@cacophony/shared-types";

/**
 * PromptSlipstreamGuard
 *
 * Implements defensive prompt sanitization and injection detection for untrusted
 * external GitHub issue bodies. Ensures that community-submitted issues cannot
 * slipstream malicious system instructions, prompt overrides, or destructive commands
 * into the autonomous LLM worker pipeline.
 */
export class PromptSlipstreamGuard {
  private static readonly INJECTION_PATTERNS: readonly RegExp[] = [
    /ignore\s+(?:all\s+)?previous\s+instructions/i,
    /disregard\s+(?:all\s+)?prior\s+instructions/i,
    /you\s+are\s+now\s+(?:in|acting\s+as)\s+(?:developer|debug|god|root|admin)\s+mode/i,
    /<system>|<\/system>/i,
    /\[system\s+instruction\]/i,
    /system\s*:\s*(?:you\s+are|override)/i,
    /do\s+anything\s+now/i,
    /DAN\s+mode/i,
    /bypass\s+all\s+safety\s+filters/i,
    /rm\s+-rf\s+[\/~]/i,
    /:\(\)\s*\{\s*:\|:&\s*\};:/i, // Fork bomb
  ];

  private static readonly SUSPICIOUS_SCRIPT_PATTERNS: readonly RegExp[] = [
    /<script\b[^>]*>[\s\S]*?<\/script\s*[^>]*>/i,
    /<script\b[^>]*>/i,
    /javascript\s*:/i,
    /curl\s+-[sS]*[kK]*\s+http/i,
    /wget\s+http/i,
  ];

  /**
   * Evaluates untrusted issue text and returns a structured analysis result with
   * sanitized payload and extracted focus metadata.
   */
  public analyzeAndSanitize(
    rawTitle: string,
    rawBody: string,
  ): SlipstreamAnalysisResult {
    const combinedText = `${rawTitle}\n${rawBody}`;
    const flaggedPatterns: string[] = [];

    for (const pattern of PromptSlipstreamGuard.INJECTION_PATTERNS) {
      if (pattern.test(combinedText)) {
        flaggedPatterns.push(`Injection keyword: ${pattern.source}`);
      }
    }

    for (const pattern of PromptSlipstreamGuard.SUSPICIOUS_SCRIPT_PATTERNS) {
      if (pattern.test(combinedText)) {
        flaggedPatterns.push(`Suspicious script pattern: ${pattern.source}`);
      }
    }

    const focusFiles = this.extractFocusFiles(rawBody);
    const testCommand = this.extractTestCommand(rawBody);

    let riskLevel: "low" | "medium" | "high" = "low";
    if (flaggedPatterns.length >= 2) {
      riskLevel = "high";
    } else if (flaggedPatterns.length === 1) {
      riskLevel = "medium";
    }

    const safe = flaggedPatterns.length === 0;

    // Neutralize any prompt slipstreaming by wrapping untrusted body in an explicit untrusted-data fence
    const cleanTitle = rawTitle.replace(/[\r\n\t]+/g, " ").trim().slice(0, 140);
    const sanitizedBody = this.neutralizeRawText(rawBody);

    const sanitizedContent = `[EXTERNAL USER ISSUE TITLE]: ${cleanTitle}

[USER REPORTED BODY (UNTRUSTED INPUT DATA)]:
\`\`\`text
${sanitizedBody}
\`\`\`

[EXTRACTED HINTS]:
- Recommended Focus Files: ${focusFiles.length > 0 ? focusFiles.join(", ") : "None detected (inspect repository)"}
- Recommended Test Command: ${testCommand}
`;

    return {
      safe,
      riskLevel,
      flaggedPatterns,
      sanitizedContent,
      recommendedFocusFiles: focusFiles,
      recommendedTestCommand: testCommand,
    };
  }

  /**
   * Neutralizes potential markdown and prompt breakouts in untrusted text.
   */
  private neutralizeRawText(text: string): string {
    return text
      .replace(/```/g, "'''")
      .replace(/<system>/gi, "[filtered-system-tag]")
      .replace(/<\/system>/gi, "[/filtered-system-tag]")
      .slice(0, 10_000);
  }

  /**
   * Extracts target focus files from structured markdown.
   */
  public extractFocusFiles(body: string): readonly string[] {
    const focusFileMatch = body.match(
      /(?:Focus File|Focus Files|File):\s*`?([^`\r\n]+)`?/i,
    );
    if (!focusFileMatch || !focusFileMatch[1]) {
      return [];
    }

    return focusFileMatch[1]
      .split(/[,;\s]+/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0 && !f.startsWith("../") && !f.startsWith("/"));
  }

  /**
   * Extracts test command from structured markdown.
   */
  public extractTestCommand(body: string): string {
    const testMatch = body.match(
      /(?:Test|Test Command):\s*`?([^`\r\n]+)`?/i,
    );
    if (!testMatch || !testMatch[1]) {
      return "npm test";
    }
    const cmd = testMatch[1].trim();
    // Safety check against destructive shell chains
    if (cmd.includes(";") || cmd.includes("&&") || cmd.includes("||") || cmd.includes("|")) {
      return "npm test";
    }
    return cmd;
  }
}
