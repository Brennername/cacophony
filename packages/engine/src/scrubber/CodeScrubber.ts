import * as fs from "node:fs";
import * as path from "node:path";
import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "./IScrubberRule.js";
import { EmojiScrubberRule } from "./rules/EmojiScrubberRule.js";
import { EsmRelativeImportScrubberRule } from "./rules/EsmRelativeImportScrubberRule.js";
import { ExtensionHeuristicScrubberRule } from "./rules/ExtensionHeuristicScrubberRule.js";
import { BannedImportsScrubberRule } from "./rules/BannedImportsScrubberRule.js";
import { JavaPackageScrubberRule } from "./rules/JavaPackageScrubberRule.js";
import { PrettierFormattingScrubberRule } from "./rules/PrettierFormattingScrubberRule.js";
import { WorkspacePackageImportScrubberRule } from "./rules/WorkspacePackageImportScrubberRule.js";

export interface FileScrubResult {
  readonly filePath: string;
  readonly modified: boolean;
  readonly content: string;
  readonly issuesFixed: readonly string[];
  readonly issuesDetected: readonly string[];
}

export interface ScrubReport {
  readonly totalFilesEvaluated: number;
  readonly totalFilesModified: number;
  readonly totalIssuesFixed: number;
  readonly totalIssuesDetected: number;
  readonly fileResults: readonly FileScrubResult[];
}

/**
 * Configuration options for the CodeScrubber pipeline.
 * Supports feature-level flags for imports, emojis, extensions, and rule disabling.
 */
export interface ScrubOptions extends ScrubRuleOptions {
  readonly autoFix?: boolean;
}

/**
 * CodeScrubber
 *
 * Modular, language-agnostic code sanitation engine.
 * Applies pre-commit and pre-review rules tailored to the active project stack,
 * intercepting recurring local model errors deterministically before testing.
 */
export class CodeScrubber {
  private readonly rules: readonly IScrubberRule[];
  private readonly defaultStack: string;

  constructor(
    rules?: readonly IScrubberRule[],
    defaultStack = "typescript-nodenext"
  ) {
    this.defaultStack = defaultStack;
    this.rules = rules ?? [
      new EmojiScrubberRule(),
      new WorkspacePackageImportScrubberRule(),
      new EsmRelativeImportScrubberRule(),
      new ExtensionHeuristicScrubberRule(),
      new BannedImportsScrubberRule(),
      new JavaPackageScrubberRule(),
      new PrettierFormattingScrubberRule()
    ];
  }

  /**
   * Scrubs in-memory code content against all applicable rules for a target file.
   */
  public scrubContent(
    content: string,
    filePath: string,
    options?: ScrubOptions
  ): FileScrubResult {
    // Universal file-level bypass check
    if (
      content.includes("@cacophony-disable-all-scrubbers") ||
      content.includes("@cacophony-skip-scrubbing")
    ) {
      return {
        filePath,
        modified: false,
        content,
        issuesFixed: [],
        issuesDetected: ["All code scrubbing bypassed via file-level exemption annotation."]
      };
    }

    const stack = options?.stack || this.defaultStack;
    const effectiveOptions: ScrubOptions = {
      ...options,
      stack
    };

    let currentContent = content;
    let modified = false;
    const allFixed: string[] = [];
    const allDetected: string[] = [];

    for (const rule of this.rules) {
      // Check if specific rule is disabled via options or file annotations
      if (
        options?.disabledRules?.includes(rule.name) ||
        options?.disabledRules?.includes("all") ||
        currentContent.includes(`@cacophony-disable-scrubber: ${rule.name}`) ||
        currentContent.includes("@cacophony-disable-scrubber: all")
      ) {
        allDetected.push(`Rule '${rule.name}' skipped via exemption flag.`);
        continue;
      }

      if (rule.isApplicable(stack, filePath)) {
        const result: ScrubRuleResult = rule.scrub(currentContent, filePath, effectiveOptions);

        if (result.modified) {
          modified = true;
          currentContent = result.content;
        }
        allFixed.push(...result.issuesFixed);
        allDetected.push(...result.issuesDetected);
      }
    }

    return {
      filePath,
      modified,
      content: currentContent,
      issuesFixed: allFixed,
      issuesDetected: allDetected
    };
  }

  /**
   * Scrubs target files on disk and optionally writes remediations back.
   */
  public scrubFiles(
    projectDir: string,
    relativeFilePaths: readonly string[],
    options?: ScrubOptions
  ): ScrubReport {
    const autoFix = options?.autoFix ?? true;
    const fileResults: FileScrubResult[] = [];

    let totalModified = 0;
    let totalFixed = 0;
    let totalDetected = 0;

    for (const relPath of relativeFilePaths) {
      const fullPath = path.resolve(projectDir, relPath);
      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) continue;

      let content: string;
      try {
        content = fs.readFileSync(fullPath, "utf-8");
      } catch {
        continue;
      }

      const res = this.scrubContent(content, relPath, options);
      if (res.modified) {
        totalModified++;
        if (autoFix) {
          try {
            fs.writeFileSync(fullPath, res.content, "utf-8");
          } catch {
            // Ignore write errors
          }
        }
      }

      totalFixed += res.issuesFixed.length;
      totalDetected += res.issuesDetected.length;
      fileResults.push(res);
    }

    return {
      totalFilesEvaluated: fileResults.length,
      totalFilesModified: totalModified,
      totalIssuesFixed: totalFixed,
      totalIssuesDetected: totalDetected,
      fileResults
    };
  }
}

