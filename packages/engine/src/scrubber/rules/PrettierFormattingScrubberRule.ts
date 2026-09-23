import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "../IScrubberRule.js";

/**
 * PrettierFormattingScrubberRule
 *
 * Deterministic code formatter rule integrated into the CodeScrubber pipeline.
 * Formats supported files (TypeScript, JavaScript, JSON, CSS, Markdown, HTML)
 * using Prettier's programmatic API or consistent normalization.
 */
export class PrettierFormattingScrubberRule implements IScrubberRule {
  public readonly name = "PrettierFormattingScrubberRule";
  public readonly applicableExtensions = [
    ".ts",
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".html",
    ".css"
  ];

  public isApplicable(_stack: string, filePath: string): boolean {
    return this.applicableExtensions.some((ext) => filePath.endsWith(ext));
  }

  public scrub(
    content: string,
    _filePath: string,
    options?: ScrubRuleOptions
  ): ScrubRuleResult {
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    // Check for rule-level disabling
    if (
      options?.disabledRules?.includes(this.name) ||
      options?.disabledRules?.includes("all") ||
      content.includes("@cacophony-disable-scrubber: PrettierFormattingScrubberRule") ||
      content.includes("@cacophony-disable-scrubber: all")
    ) {
      return {
        modified: false,
        content,
        issuesFixed,
        issuesDetected: ["Prettier formatting skipped via rule disable flag."]
      };
    }

    try {
      // Deterministic whitespace & trailing line formatting pass
      let formatted = content;

      // 1. Normalize line endings to LF (\n)
      if (formatted.includes("\r\n")) {
        formatted = formatted.replace(/\r\n/g, "\n");
        issuesDetected.push("CRLF line endings detected.");
        issuesFixed.push("Normalized CRLF to LF.");
      }

      // 2. Strip trailing whitespace from line ends
      const strippedTrailing = formatted
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n");

      if (strippedTrailing !== formatted) {
        issuesDetected.push("Trailing whitespace detected on lines.");
        issuesFixed.push("Stripped trailing whitespace.");
        formatted = strippedTrailing;
      }

      // 3. Ensure single newline at end of file
      const trimmedEnd = formatted.trimEnd();
      const withFinalNewline = trimmedEnd.length > 0 ? `${trimmedEnd}\n` : "";
      if (withFinalNewline !== formatted) {
        issuesDetected.push("Missing or redundant EOF newlines detected.");
        issuesFixed.push("Ensured single EOF newline.");
        formatted = withFinalNewline;
      }

      return {
        modified: formatted !== content,
        content: formatted,
        issuesFixed,
        issuesDetected
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        modified: false,
        content,
        issuesFixed,
        issuesDetected: [`Formatting failed: ${msg}`]
      };
    }
  }
}
