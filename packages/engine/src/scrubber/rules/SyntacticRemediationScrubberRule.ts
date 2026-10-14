import type {
  IScrubberRule,
  ScrubRuleOptions,
  ScrubRuleResult,
} from "../IScrubberRule.js";

/**
 * SyntacticRemediationScrubberRule
 *
 * Automatically detects and repairs common local model syntax anomalies (T69.6.3):
 * 1. Unterminated template strings (odd count of unescaped backticks).
 * 2. Unbalanced braces ({ and } counts mismatched).
 */
export class SyntacticRemediationScrubberRule implements IScrubberRule {
  public readonly name = "SyntacticRemediationScrubberRule";
  public readonly applicableExtensions = [
    ".ts",
    ".js",
    ".tsx",
    ".jsx",
    ".mjs",
    ".cjs",
  ];

  public isApplicable(_stack: string, filePath: string): boolean {
    return this.applicableExtensions.some((ext) => filePath.endsWith(ext));
  }

  public scrub(
    content: string,
    _filePath: string,
    options?: ScrubRuleOptions,
  ): ScrubRuleResult {
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    if (
      options?.disabledRules?.includes(this.name) ||
      options?.disabledRules?.includes("all") ||
      content.includes(`@cacophony-disable-scrubber: ${this.name}`) ||
      content.includes("@cacophony-disable-scrubber: all")
    ) {
      return {
        modified: false,
        content,
        issuesFixed,
        issuesDetected: [
          "Syntactic remediation skipped via rule disable flag.",
        ],
      };
    }

    let modifiedContent = content;
    let modified = false;

    // 1. Check for unterminated template strings (odd number of unescaped backticks)
    let backtickCount = 0;
    for (let i = 0; i < modifiedContent.length; i++) {
      if (
        modifiedContent[i] === "`" &&
        (i === 0 || modifiedContent[i - 1] !== "\\")
      ) {
        backtickCount++;
      }
    }

    if (backtickCount % 2 !== 0) {
      issuesDetected.push("Unterminated template literal detected.");
      const trimmedEnd = modifiedContent.trimEnd();
      const trailingWhitespace = modifiedContent.slice(trimmedEnd.length);
      modifiedContent = `${trimmedEnd}\`;${trailingWhitespace ? trailingWhitespace : "\n"}`;
      issuesFixed.push(
        "Appended missing closing backtick to terminate template literal.",
      );
      modified = true;
    }

    // 2. Check for unbalanced curly braces ({ vs })
    let openBraces = 0;
    let closeBraces = 0;
    let inLineComment = false;
    let inBlockComment = false;
    let inString: "'" | '"' | "`" | null = null;

    for (let i = 0; i < modifiedContent.length; i++) {
      const char = modifiedContent[i];
      const prevChar = i > 0 ? modifiedContent[i - 1] : "";
      const nextChar =
        i < modifiedContent.length - 1 ? modifiedContent[i + 1] : "";

      if (inLineComment) {
        if (char === "\n") inLineComment = false;
        continue;
      }

      if (inBlockComment) {
        if (char === "*" && nextChar === "/") {
          inBlockComment = false;
          i++;
        }
        continue;
      }

      if (inString !== null) {
        if (char === inString && prevChar !== "\\") {
          inString = null;
        }
        continue;
      }

      if (char === "/" && nextChar === "/") {
        inLineComment = true;
        i++;
        continue;
      }
      if (char === "/" && nextChar === "*") {
        inBlockComment = true;
        i++;
        continue;
      }

      if (char === "'" || char === '"' || char === "`") {
        inString = char;
        continue;
      }

      if (char === "{") openBraces++;
      if (char === "}") closeBraces++;
    }

    if (openBraces > closeBraces) {
      const missing = openBraces - closeBraces;
      issuesDetected.push(
        `Unbalanced braces detected (${openBraces} open vs ${closeBraces} closed).`,
      );
      const trimmedEnd = modifiedContent.trimEnd();
      const trailingWhitespace = modifiedContent.slice(trimmedEnd.length);
      const closingBlock = "\n" + "}".repeat(missing) + "\n";
      modifiedContent = trimmedEnd + closingBlock + trailingWhitespace;
      issuesFixed.push(`Appended ${missing} missing closing brace(s).`);
      modified = true;
    }

    return {
      modified,
      content: modifiedContent,
      issuesFixed,
      issuesDetected,
    };
  }
}
