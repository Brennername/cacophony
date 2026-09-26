import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "../IScrubberRule.js";

/**
 * WorkspacePackageImportScrubberRule
 *
 * Intercepts and corrects recurring local model hallucinations where models
 * invent non-existent package names like '@cacophony/git-worktrees' instead of
 * using relative internal engine files or valid monorepo packages.
 */
export class WorkspacePackageImportScrubberRule implements IScrubberRule {
  public readonly name = "WorkspacePackageImportScrubberRule";
  public readonly applicableExtensions = [".ts", ".js", ".mts"];

  public isApplicable(_stack: string, filePath: string): boolean {
    return this.applicableExtensions.some((ext) => filePath.endsWith(ext) && !filePath.endsWith(".d.ts"));
  }

  public scrub(
    content: string,
    filePath: string,
    options?: ScrubRuleOptions
  ): ScrubRuleResult {
    if (
      options?.disabledRules?.includes(this.name) ||
      options?.disabledRules?.includes("all") ||
      content.includes("@cacophony-disable-scrubber: WorkspacePackageImportScrubberRule") ||
      content.includes("@cacophony-disable-scrubber: all")
    ) {
      return {
        modified: false,
        content,
        issuesFixed: [],
        issuesDetected: ["Workspace package import scrubbing skipped via rule disable flag."]
      };
    }

    let modified = false;
    let cleaned = content;
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    const isInsideScheduler = filePath.includes("/scheduler/");
    const isInsideGitea = filePath.includes("/gitea/");
    const isInsideTests = filePath.includes("/tests/") || filePath.includes("/__tests__/");

    // 1. Repair hallucinated '@cacophony/git-worktrees' or '@cacophony/worktrees'
    const gitWorktreeRegex = /from\s+["']@cacophony\/(?:git-)?worktrees(?:\/[^"']*)?["']/g;
    if (gitWorktreeRegex.test(cleaned)) {
      issuesDetected.push("Detected hallucinated import '@cacophony/git-worktrees'");
      let replacementPath = "../gitea/GitWorktreeManager.js";
      if (isInsideGitea) {
        replacementPath = "./GitWorktreeManager.js";
      } else if (isInsideScheduler) {
        replacementPath = "../gitea/GitWorktreeManager.js";
      } else if (isInsideTests) {
        replacementPath = "../gitea/GitWorktreeManager.js";
      }
      cleaned = cleaned.replace(gitWorktreeRegex, `from "${replacementPath}"`);
      issuesFixed.push(`Rewrote hallucinated git-worktrees import to '${replacementPath}'`);
      modified = true;
    }

    // 2. Repair hallucinated '@cacophony/types' or '@cacophony/core/types'
    const typesRegex = /from\s+["']@cacophony\/(?:types|core\/types)["']/g;
    if (typesRegex.test(cleaned)) {
      issuesDetected.push("Detected hallucinated import '@cacophony/types'");
      cleaned = cleaned.replace(typesRegex, 'from "@cacophony/shared-types"');
      issuesFixed.push("Rewrote to canonical '@cacophony/shared-types'");
      modified = true;
    }

    // 3. Repair hallucinated '@cacophony/scheduler' or '@cacophony/pipeline'
    const schedRegex = /from\s+["']@cacophony\/(?:scheduler|pipeline)["']/g;
    if (schedRegex.test(cleaned)) {
      issuesDetected.push("Detected hallucinated import '@cacophony/scheduler'");
      const relSched = isInsideScheduler ? "./TaskScheduler.js" : "../scheduler/TaskScheduler.js";
      cleaned = cleaned.replace(schedRegex, `from "${relSched}"`);
      issuesFixed.push(`Rewrote to relative internal module '${relSched}'`);
      modified = true;
    }

    // 4. Chai imports in test files: migrate to native Node.js assert
    if (isInsideTests && cleaned.includes("from 'chai'") || cleaned.includes('from "chai"')) {
      issuesDetected.push("Detected third-party 'chai' assertion import in test suite");
      cleaned = cleaned.replace(/import\s+\{\s*expect\s*\}\s+from\s+["']chai["'];?/g, 'import assert from "node:assert/strict";');
      cleaned = cleaned.replace(/import\s+.*from\s+["']chai["'];?/g, 'import assert from "node:assert/strict";');
      issuesFixed.push("Migrated 'chai' import to standard 'node:assert/strict'");
      modified = true;
    }

    return {
      modified,
      content: cleaned,
      issuesFixed,
      issuesDetected
    };
  }
}
