import type { IScrubberRule, ScrubRuleOptions, ScrubRuleResult } from "../IScrubberRule.js";

/**
 * JavaPackageScrubberRule
 *
 * Ensures Java source files contain a correct package declaration that mirrors
 * their directory hierarchy under `src/main/java` or `src/test/java`.
 *
 * Supports exemptions via:
 * - Option `allowPackageMismatch: true` or `disabledRules: ["JavaPackageScrubberRule"]`
 * - Inline annotations `// @cacophony-allow-package-mismatch` or `// @cacophony-disable-scrubber: JavaPackageScrubberRule`
 */
export class JavaPackageScrubberRule implements IScrubberRule {
  public readonly name = "JavaPackageScrubberRule";
  public readonly applicableExtensions = [".java"];

  public isApplicable(stack: string, filePath: string): boolean {
    return filePath.endsWith(".java") || stack.startsWith("java");
  }

  public scrub(content: string, filePath: string, options?: ScrubRuleOptions): ScrubRuleResult {
    const issuesFixed: string[] = [];
    const issuesDetected: string[] = [];

    // Check for rule-level disabling or feature-level exemption
    if (
      options?.disabledRules?.includes(this.name) ||
      options?.disabledRules?.includes("all") ||
      options?.allowPackageMismatch ||
      content.includes("@cacophony-disable-scrubber: JavaPackageScrubberRule") ||
      content.includes("@cacophony-disable-scrubber: all") ||
      content.includes("@cacophony-allow-package-mismatch")
    ) {
      return {
        modified: false,
        content,
        issuesFixed,
        issuesDetected: ["Java package scrubbing skipped via exemption flag."]
      };
    }

    const expectedPackage = this.deriveExpectedPackage(filePath);
    if (!expectedPackage) {
      return { modified: false, content, issuesFixed, issuesDetected };
    }

    const packageRegex = /^\s*package\s+([a-zA-Z0-9_.]+)\s*;/m;
    const match = packageRegex.exec(content);

    if (match) {
      const existingPackage = match[1];
      if (existingPackage !== expectedPackage) {
        issuesDetected.push(`Mismatched Java package declaration: '${existingPackage}', expected '${expectedPackage}'`);
        const cleaned = content.replace(packageRegex, `package ${expectedPackage};`);
        issuesFixed.push(`Corrected Java package declaration to '${expectedPackage}'`);
        return { modified: true, content: cleaned, issuesFixed, issuesDetected };
      }
    } else {
      // Missing package declaration
      issuesDetected.push(`Missing Java package declaration. Expected '${expectedPackage}'`);
      const cleaned = `package ${expectedPackage};\n\n${content.trimStart()}`;
      issuesFixed.push(`Injected missing Java package declaration: 'package ${expectedPackage};'`);
      return { modified: true, content: cleaned, issuesFixed, issuesDetected };
    }

    return { modified: false, content, issuesFixed, issuesDetected };
  }

  private deriveExpectedPackage(filePath: string): string | null {
    const normalized = filePath.replace(/\\/g, "/");
    if (!normalized.endsWith(".java")) return null;
    const prefix = "src/main/java/";
    const testPrefix = "src/test/java/";
    let startIdx = normalized.indexOf(prefix);
    let offset = prefix.length;
    if (startIdx === -1) {
      startIdx = normalized.indexOf(testPrefix);
      offset = testPrefix.length;
    }
    if (startIdx === -1) return null;

    const afterMarker = normalized.slice(startIdx + offset);
    const lastSlash = afterMarker.lastIndexOf("/");
    if (lastSlash === -1) return null;

    const packagePath = afterMarker.slice(0, lastSlash);
    return packagePath.replace(/\//g, ".");
  }
}
