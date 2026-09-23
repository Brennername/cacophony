import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "../IScrubberRule.js";

/**
 * EsmRelativeImportScrubberRule
 *
 * Appends explicit '.js' extensions to relative imports in TypeScript files.
 * GATED: Only executes when the active stack is explicitly 'typescript-nodenext'.
 * Bundler-based projects (Vite, Next.js, Angular, Webpack) or other stacks will NOT have
 * imports modified.
 *
 * Supports exemptions via:
 * - Option `allowBareImports: true` or `disabledRules: ["EsmRelativeImportScrubberRule"]`
 * - Inline annotations `// @cacophony-allow-bare-imports` or `// @cacophony-disable-scrubber: EsmRelativeImportScrubberRule`
 */
export class EsmRelativeImportScrubberRule implements IScrubberRule {
  public readonly name = "EsmRelativeImportScrubberRule";
  public readonly applicableExtensions = [".ts", ".mts"];

  public isApplicable(stack: string, filePath: string): boolean {
    if (stack !== "typescript-nodenext") return false;
    return this.applicableExtensions.some((ext) => filePath.endsWith(ext) && !filePath.endsWith(".d.ts"));
  }

  public scrub(content: string, _filePath: string, options?: ScrubRuleOptions): ScrubRuleResult {
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    // Check for rule-level disabling or feature-level exemption
    if (
      options?.disabledRules?.includes(this.name) ||
      options?.disabledRules?.includes("all") ||
      options?.allowBareImports ||
      content.includes("@cacophony-disable-scrubber: EsmRelativeImportScrubberRule") ||
      content.includes("@cacophony-disable-scrubber: all") ||
      content.includes("@cacophony-allow-bare-imports")
    ) {
      return {
        modified: false,
        content,
        issuesFixed,
        issuesDetected: ["ESM relative import extension scrubbing skipped via exemption flag."]
      };
    }

    const importRegex = /(from\s+["'](\.[^"']+)["'])/g;
    let modified = false;

    const cleaned = content.replace(importRegex, (fullMatch, _p1, importPath: string) => {
      if (!importPath.endsWith(".js") && !importPath.endsWith(".json")) {
        issuesDetected.push(`Missing .js extension on relative import '${importPath}'`);
        issuesFixed.push(`Appended .js extension to '${importPath}.js'`);
        modified = true;
        return `from "${importPath}.js"`;
      }
      return fullMatch;
    });

    return {
      modified,
      content: cleaned,
      issuesFixed,
      issuesDetected
    };
  }
}
