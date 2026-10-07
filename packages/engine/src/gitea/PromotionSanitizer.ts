export type ViolationType = "secret_leak" | "prohibited_emoji" | "banned_import" | "loose_root_file";

export interface SanitizerViolation {
  readonly type: ViolationType;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly file?: string | undefined;
  readonly line?: number | undefined;
  readonly match?: string | undefined;
}

export interface SanitizerReport {
  readonly passed: boolean;
  readonly violations: readonly SanitizerViolation[];
  readonly totalErrors: number;
  readonly totalWarnings: number;
  readonly summary: string;
}

export interface PromotionSanitizerOptions {
  readonly permittedRootFiles?: ReadonlySet<string> | undefined;
  readonly bannedImports?: readonly string[] | undefined;
}

const DEFAULT_PERMITTED_ROOT_FILES = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "README.md",
  "LICENSE",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  ".gitignore",
  ".dockerignore",
  ".env.example",
  ".env",
  "angular.json",
  ".prettierrc",
  ".prettierignore"
]);

const DEFAULT_BANNED_IMPORTS = ["acorn", "eventsource"];

// Comprehensive unicode emoji regex
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

/**
 * PromotionSanitizer
 *
 * Implements deterministic pre-promotion quarantine gauntlet:
 * - Scans diffs and source files for leaked API keys, tokens, and private keys.
 * - Detects prohibited unicode emojis and dingbats per project coding directives.
 * - Enforces banned dependency import bans (e.g. acorn, eventsource).
 * - Flags unpermitted loose root files contaminating repository root.
 */
export class PromotionSanitizer {
  private readonly permittedRootFiles: ReadonlySet<string>;
  private readonly bannedImports: readonly string[];

  constructor(options?: PromotionSanitizerOptions) {
    this.permittedRootFiles = options?.permittedRootFiles ?? DEFAULT_PERMITTED_ROOT_FILES;
    this.bannedImports = options?.bannedImports ?? DEFAULT_BANNED_IMPORTS;
  }

  /**
   * Scans content or git diff additions for exposed secrets, API keys, or private keys.
   */
  public scanSecrets(content: string, fileName?: string): SanitizerViolation[] {
    const violations: SanitizerViolation[] = [];
    const lines = content.split(/\r?\n/);

    const secretPatterns: Array<{ name: string; regex: RegExp }> = [
      { name: "AWS Access Key", regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
      { name: "GitHub Personal Access Token", regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}|github_pat_[A-Za-z0-9_]{82}/ },
      { name: "Slack Token", regex: /xox[baprs]-[0-9a-zA-Z-]{24,}/ },
      { name: "OpenAI / Anthropic API Key", regex: /sk-(?:ant-)?[A-Za-z0-9_-]{20,}/ },
      { name: "Private Key Header", regex: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/ },
      { name: "Hardcoded Credential Assignment", regex: /(?:bearer|api[_-]?key|secret_key|private_key|auth_token)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{30,}['"]/i }
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      // If diff format, only inspect added lines (starting with '+', excluding '+++')
      if (content.includes("diff --git") && (!line.startsWith("+") || line.startsWith("+++"))) {
        continue;
      }

      for (const pattern of secretPatterns) {
        const match = pattern.regex.exec(line);
        if (match) {
          violations.push({
            type: "secret_leak",
            severity: "error",
            message: `Potential secret leak detected (${pattern.name})`,
            file: fileName,
            line: i + 1,
            match: match[0].slice(0, 12) + "..."
          });
        }
      }
    }

    return violations;
  }

  /**
   * Scans content or git diff additions for prohibited unicode emojis or pictographs.
   */
  public scanEmojis(content: string, fileName?: string): SanitizerViolation[] {
    const violations: SanitizerViolation[] = [];
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (content.includes("diff --git") && (!line.startsWith("+") || line.startsWith("+++"))) {
        continue;
      }

      const match = line.match(EMOJI_REGEX);
      if (match) {
        violations.push({
          type: "prohibited_emoji",
          severity: "error",
          message: `Prohibited unicode emoji detected: '${match[0]}'`,
          file: fileName,
          line: i + 1,
          match: match[0]
        });
      }
    }

    return violations;
  }

  /**
   * Scans content for banned package imports and checks list of file paths for loose root files.
   */
  public scanHygiene(content?: string, filePaths?: readonly string[], fileName?: string): SanitizerViolation[] {
    const violations: SanitizerViolation[] = [];

    // 1. Banned imports check
    if (content) {
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (content.includes("diff --git") && (!line.startsWith("+") || line.startsWith("+++"))) {
          continue;
        }

        for (const banned of this.bannedImports) {
          const importPattern = new RegExp(`(?:from\\s+['"]${banned}(?:/.*)?['"]|require\\(['"]${banned}(?:/.*)?['"]\\))`);
          if (importPattern.test(line)) {
            violations.push({
              type: "banned_import",
              severity: "error",
              message: `Banned dependency import detected: '${banned}'`,
              file: fileName,
              line: i + 1,
              match: banned
            });
          }
        }
      }
    }

    // 2. Loose root files check
    if (filePaths) {
      for (const rawPath of filePaths) {
        const normalized = rawPath.replace(/^\.\//, "").replace(/\\/g, "/");
        if (!normalized.includes("/")) {
          if (!this.permittedRootFiles.has(normalized)) {
            violations.push({
              type: "loose_root_file",
              severity: "error",
              message: `Unpermitted loose root file detected in repository root: '${normalized}'`,
              file: normalized,
              match: normalized
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Executes full sanitization gauntlet on provided diff and optional modified file list.
   */
  public sanitize(options: {
    diff?: string | undefined;
    filePaths?: readonly string[] | undefined;
  }): SanitizerReport {
    const violations: SanitizerViolation[] = [];

    if (options.diff) {
      violations.push(...this.scanSecrets(options.diff));
      violations.push(...this.scanEmojis(options.diff));
      violations.push(...this.scanHygiene(options.diff));
    }

    if (options.filePaths) {
      violations.push(...this.scanHygiene(undefined, options.filePaths));
    }

    const totalErrors = violations.filter((v) => v.severity === "error").length;
    const totalWarnings = violations.filter((v) => v.severity === "warning").length;
    const passed = totalErrors === 0;

    const summary = passed
      ? "Promotion sanitization passed with 0 violations."
      : `Promotion sanitization failed with ${totalErrors} error(s): ` +
        violations.map((v) => `${v.type}${v.file ? ` in ${v.file}` : ""}: ${v.message}`).join("; ");

    return {
      passed,
      violations,
      totalErrors,
      totalWarnings,
      summary
    };
  }
}
