import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "../IScrubberRule.js";

/**
 * GoAstScrubberRule
 *
 * Sanitizes generated Go source code:
 * 1. Strips forbidden emojis from comments and string literals.
 * 2. Enforces gofmt-compliant tab indentation on leading whitespace.
 */
export class GoAstScrubberRule implements IScrubberRule {
  readonly name = "go-ast-scrubber";
  readonly applicableExtensions = [".go"];

  public isApplicable(_stack: string, filePath: string): boolean {
    return filePath.endsWith(".go");
  }

  public scrub(content: string, _filePath: string, options?: ScrubRuleOptions): ScrubRuleResult {
    let modified = false;
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    let updated = content;

    // 1. Emoji scrubbing
    if (!options?.allowEmojis) {
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      if (emojiRegex.test(updated)) {
        issuesDetected.push("Forbidden emojis detected in Go source");
        updated = updated.replace(emojiRegex, "");
        issuesFixed.push("Stripped emojis from Go source");
        modified = true;
      }
    }

    // 2. Gofmt tab indentation enforcement (replaces leading 2, 4, or 8 spaces with tabs)
    const lines = updated.split("\n");
    let indentedModified = false;
    const tabbedLines = lines.map((line) => {
      const match = line.match(/^( +)(.*)$/);
      if (match && match[1] && match[2]) {
        const spaceCount = match[1].length;
        // Convert multiples of 4 (or 2) spaces to tabs
        const tabsCount = Math.max(1, Math.floor(spaceCount / 4) || Math.floor(spaceCount / 2));
        indentedModified = true;
        return "\t".repeat(tabsCount) + match[2];
      }
      return line;
    });

    if (indentedModified) {
      updated = tabbedLines.join("\n");
      issuesFixed.push("Enforced gofmt-compliant tab indentation");
      modified = true;
    }

    return {
      modified,
      content: updated,
      issuesFixed,
      issuesDetected
    };
  }
}
