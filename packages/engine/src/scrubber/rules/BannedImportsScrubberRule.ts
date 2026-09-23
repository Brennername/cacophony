import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "../IScrubberRule.js";

/**
 * BannedImportsScrubberRule
 *
 * Scans source files to detect hallucinated or prohibited third-party imports
 * (e.g. express, redis, koa) when working inside standalone or decoupled packages.
 *
 * Supports feature-level exemptions via:
 * 1. Options: `allowedImports: ["redis"]`, `allowedLibraries: ["redis"]`, `allowAllImports: true`, or `disabledRules: ["BannedImportsScrubberRule"]`.
 * 2. File annotations: `// @cacophony-allow-import: redis, express`, `// @cacophony-allow-all-imports`, or `// @cacophony-disable-scrubber: BannedImportsScrubberRule`.
 */
export class BannedImportsScrubberRule implements IScrubberRule {
  public readonly name = "BannedImportsScrubberRule";
  public readonly applicableExtensions = [".ts", ".js", ".java"];

  public isApplicable(_stack: string, filePath: string): boolean {
    return this.applicableExtensions.some((ext) => filePath.endsWith(ext));
  }

  public scrub(
    content: string,
    _filePath: string,
    options?: ScrubRuleOptions
  ): ScrubRuleResult {
    // Check for rule-level disabling
    if (
      options?.disabledRules?.includes(this.name) ||
      options?.disabledRules?.includes("all") ||
      content.includes("@cacophony-disable-scrubber: BannedImportsScrubberRule") ||
      content.includes("@cacophony-disable-scrubber: all")
    ) {
      return {
        modified: false,
        content,
        issuesFixed: [],
        issuesDetected: ["Banned import scrubbing skipped via rule disable flag."]
      };
    }

    // Check for universal file-level or options-level import bypass
    if (options?.allowAllImports || content.includes("@cacophony-allow-all-imports")) {
      return {
        modified: false,
        content,
        issuesFixed: [],
        issuesDetected: ["Banned import scrubbing bypassed via universal import allowance flag."]
      };
    }

    const defaultBanned = ["express", "redis", "koa", "lodash"];
    const configuredBanned = options?.bannedLibraries ?? defaultBanned;
    const configuredAllowed = new Set<string>([
      ...(options?.allowedLibraries ?? []),
      ...(options?.allowedImports ?? [])
    ]);

    // Parse inline file annotations: // @cacophony-allow-import: redis, express
    const annotationMatches = content.match(/@cacophony-allow-import:\s*([^\r\n]+)/g);
    if (annotationMatches) {
      for (const ann of annotationMatches) {
        const rawLibs = ann.replace(/@cacophony-allow-import:\s*/, "");
        for (const lib of rawLibs.split(",")) {
          const trimmed = lib.trim();
          if (trimmed) configuredAllowed.add(trimmed);
        }
      }
    }


    const activeBanned = configuredBanned.filter((lib) => !configuredAllowed.has(lib));
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    // Note any explicitly allowed imports present in the file for transparency
    for (const lib of configuredAllowed) {
      const regex = new RegExp(`from\\s+["']${lib}(?:/.*)?["']|require\\(["']${lib}["']\\)|import\\s+["']${lib}["']`, "g");
      if (regex.test(content)) {
        issuesDetected.push(`Import of '${lib}' approved via feature exemption flag.`);
      }
    }

    // Scan for unapproved banned libraries
    for (const lib of activeBanned) {
      const regex = new RegExp(`from\\s+["']${lib}(?:/.*)?["']|require\\(["']${lib}["']\\)|import\\s+["']${lib}["']`, "g");
      if (regex.test(content)) {
        issuesDetected.push(`Detected forbidden import of prohibited library: '${lib}'`);
      }
    }

    return {
      modified: false,
      content,
      issuesFixed,
      issuesDetected
    };
  }
}

