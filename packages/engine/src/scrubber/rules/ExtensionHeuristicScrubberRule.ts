import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "../IScrubberRule.js";

/**
 * ExtensionHeuristicScrubberRule
 *
 * Intercepts common local model failure modes where models erroneously import '.ts'
 * extension directly (e.g. `import { x } from "./utils.ts"`).
 *
 * In NodeNext stack: fixes to `./utils.js`.
 * In Bundler/Standard stack: fixes to bare `./utils`.
 *
 * Supports exemptions via:
 * - Option `allowLiteralExtensions: true` or `disabledRules: ["ExtensionHeuristicScrubberRule"]`
 * - Inline annotations `// @cacophony-allow-literal-extensions` or `// @cacophony-disable-scrubber: ExtensionHeuristicScrubberRule`
 */
export class ExtensionHeuristicScrubberRule implements IScrubberRule {
  public readonly name = "ExtensionHeuristicScrubberRule";
  public readonly applicableExtensions = [".ts", ".tsx", ".mts", ".js"];

  public isApplicable(_stack: string, filePath: string): boolean {
    return this.applicableExtensions.some((ext) => filePath.endsWith(ext));
  }

  public scrub(content: string, _filePath: string, options?: ScrubRuleOptions): ScrubRuleResult {
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    // Check for rule-level disabling or feature-level exemption
    if (
      options?.disabledRules?.includes(this.name) ||
      options?.disabledRules?.includes("all") ||
      options?.allowLiteralExtensions ||
      content.includes("@cacophony-disable-scrubber: ExtensionHeuristicScrubberRule") ||
      content.includes("@cacophony-disable-scrubber: all") ||
      content.includes("@cacophony-allow-literal-extensions")
    ) {
      return {
        modified: false,
        content,
        issuesFixed,
        issuesDetected: ["Extension heuristic scrubbing skipped via exemption flag."]
      };
    }
    const stack = options?.stack || "typescript-standard";

    const literalTsRegex = /from\s+(["'])(\.[^"']+)\.ts\1/g;
    let modified = false;

    const cleaned = content.replace(literalTsRegex, (_fullMatch, quote: string, importPath: string) => {
      issuesDetected.push(`Detected prohibited literal .ts extension on relative import: '${importPath}.ts'`);
      modified = true;

      if (stack === "typescript-nodenext") {
        issuesFixed.push(`Rewrote '${importPath}.ts' to '${importPath}.js' for NodeNext`);
        return `from ${quote}${importPath}.js${quote}`;
      } else {
        issuesFixed.push(`Rewrote '${importPath}.ts' to bare '${importPath}' for bundler`);
        return `from ${quote}${importPath}${quote}`;
      }
    });

    return {
      modified,
      content: cleaned,
      issuesFixed,
      issuesDetected
    };
  }
}
