export interface ScrubRuleResult {
  readonly modified: boolean;
  readonly content: string;
  readonly issuesFixed: readonly string[];
  readonly issuesDetected: readonly string[];
}

export interface ScrubRuleOptions {
  readonly stack?: string;
  readonly disabledRules?: readonly string[];
  readonly bannedLibraries?: readonly string[];
  readonly allowedLibraries?: readonly string[];
  readonly allowedImports?: readonly string[];
  readonly allowAllImports?: boolean;
  readonly allowEmojis?: boolean;
  readonly allowBareImports?: boolean;
  readonly allowLiteralExtensions?: boolean;
  readonly allowPackageMismatch?: boolean;
  readonly [key: string]: unknown;
}

/**
 * Modular scrubber rule plugin contract.
 * Allows language-agnostic extension for TypeScript, Java, and other target stacks.
 */
export interface IScrubberRule {
  readonly name: string;
  readonly applicableExtensions: readonly string[];

  /**
   * Determines if this rule should execute for the active project stack and target file.
   */
  isApplicable(stack: string, filePath: string): boolean;

  /**
   * Applies deterministic transformations or checks on source content.
   */
  scrub(content: string, filePath: string, options?: ScrubRuleOptions): ScrubRuleResult;
}

