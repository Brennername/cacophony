import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "../IScrubberRule.js";

/** Emoji Unicode regex range (excluding musical notation symbols U+2669 through U+266F) */
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{2668}\u{2670}-\u{26FF}\u{2700}-\u{27BF}]/gu;

/**
 * EmojiScrubberRule
 *
 * Enforces the universal Zero Emojis rule across all languages and text files,
 * stripping decorative unicode emojis from source code, inline comments, and strings.
 */
export class EmojiScrubberRule implements IScrubberRule {
  public readonly name = "EmojiScrubberRule";
  public readonly applicableExtensions = [".ts", ".js", ".java", ".json", ".md", ".html", ".css", ".go", ".rs"];

  public isApplicable(_stack: string, filePath: string): boolean {
    return this.applicableExtensions.some((ext) => filePath.endsWith(ext));
  }

  public scrub(content: string, _filePath: string, options?: ScrubRuleOptions): ScrubRuleResult {
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    // Check for rule-level disabling or feature-level emoji exemption
    if (
      options?.disabledRules?.includes(this.name) ||
      options?.disabledRules?.includes("all") ||
      content.includes("@cacophony-disable-scrubber: EmojiScrubberRule") ||
      content.includes("@cacophony-disable-scrubber: all")
    ) {
      return {
        modified: false,
        content,
        issuesFixed,
        issuesDetected: ["Emoji scrubbing skipped via rule disable flag."]
      };
    }

    if (options?.allowEmojis || content.includes("@cacophony-allow-emojis")) {
      return {
        modified: false,
        content,
        issuesFixed,
        issuesDetected: ["Emoji scrubbing bypassed via feature exemption flag (@cacophony-allow-emojis)."]
      };
    }


    if (EMOJI_REGEX.test(content)) {
      issuesDetected.push("Decorative unicode emojis detected in file content.");
      const cleaned = content.replace(EMOJI_REGEX, "");
      issuesFixed.push("Stripped unicode decorative emojis to comply with zero-emoji standard.");
      return {
        modified: true,
        content: cleaned,
        issuesFixed,
        issuesDetected
      };
    }

    return {
      modified: false,
      content,
      issuesFixed,
      issuesDetected
    };
  }
}
