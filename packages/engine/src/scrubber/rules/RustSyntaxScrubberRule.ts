import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "../IScrubberRule.js";

/**
 * RustSyntaxScrubberRule
 *
 * Sanitizes generated Rust code:
 * 1. Strips markdown code fences (```rust / ```).
 * 2. Cleans up unescaped raw string literals.
 * 3. Strips forbidden unicode emojis from doc comments and string literals.
 */
export class RustSyntaxScrubberRule implements IScrubberRule {
  readonly name = "rust-syntax-scrubber";
  readonly applicableExtensions = [".rs"];

  public isApplicable(_stack: string, filePath: string): boolean {
    return filePath.endsWith(".rs");
  }

  public scrub(content: string, _filePath: string, options?: ScrubRuleOptions): ScrubRuleResult {
    let modified = false;
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    let updated = content;

    // 1. Strip markdown fences if LLM wrapped output
    if (updated.includes("```")) {
      issuesDetected.push("Markdown code fences detected in Rust source");
      updated = updated
        .replace(/^```(?:rust|rs)?\r?\n/m, "")
        .replace(/\r?\n```\s*$/m, "");
      issuesFixed.push("Stripped markdown code fences");
      modified = true;
    }

    // 2. Strip emojis
    if (!options?.allowEmojis) {
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      if (emojiRegex.test(updated)) {
        issuesDetected.push("Forbidden emojis detected in Rust source");
        updated = updated.replace(emojiRegex, "");
        issuesFixed.push("Stripped emojis from Rust source");
        modified = true;
      }
    }

    return {
      modified,
      content: updated,
      issuesFixed,
      issuesDetected
    };
  }
}
