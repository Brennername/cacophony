import * as path from "node:path";

export interface SecurityCheckResult {
  readonly isAllowed: boolean;
  readonly reason?: string;
  readonly blockedToken?: string;
}

/**
 * ExecutionGuard provides comprehensive security filtering for shell execution
 * and file path validation across the Cacophony tool suite.
 *
 * Responsibilities:
 * - Prevents execution of destructive commands (rm, shred, mkfs, dd, fork bombs).
 * - Prevents privilege escalation commands (sudo, su, doas).
 * - Prevents unrecoverable git operations (git clean -f, git reset --hard, force push).
 * - Enforces path confinement within workspace roots, trapping relative and absolute directory traversal attacks.
 */
export class ExecutionGuard {
  private static readonly BLOCKED_PATTERNS: ReadonlyArray<{ regex: RegExp; description: string }> = [
    // 1. Extreme system hazards
    { regex: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/i, description: "Fork bombs are strictly prohibited." },
    { regex: />\s*\/dev\/(sd[a-z]|nvme[0-9]|null|zero)/i, description: "Redirection to raw devices is prohibited." },

    // 2. Privilege escalation (prioritized over command arguments like 'sudo rm')
    { regex: /\bsudo\b/i, description: "Privilege escalation with 'sudo' is prohibited." },
    { regex: /\bsu\b/i, description: "Privilege escalation with 'su' is prohibited." },
    { regex: /\bdoas\b/i, description: "Privilege escalation with 'doas' is prohibited." },

    // 3. Raw block storage and disk alteration
    { regex: /\bdd(\s+.*)?\s+if=/i, description: "Direct block disk writing via 'dd' is prohibited." },
    { regex: /\bmkfs(\.[a-z0-9]+)?\b/i, description: "Filesystem creation via 'mkfs' is prohibited." },
    { regex: /\bfdisk\b/i, description: "Disk partitioning via 'fdisk' is prohibited." },
    { regex: /\bparted\b/i, description: "Disk partitioning via 'parted' is prohibited." },

    // 4. Destructive Git repository operations
    { regex: /git\s+reset\s+--hard/i, description: "Destructive 'git reset --hard' is prohibited." },
    { regex: /git\s+push\b.*(--force|-f\b)/i, description: "Destructive 'git push --force' is prohibited." },
    { regex: /git\s+clean\b.*(-[a-zA-Z]*f[a-zA-Z]*|--force)/i, description: "Destructive 'git clean -f' is prohibited." },

    // 5. Destructive file system unlinking and removal
    { regex: /\brm\b/i, description: "Removal command 'rm' is strictly prohibited. Move files to .trash/ instead." },
    { regex: /\brmdir\b/i, description: "Removal command 'rmdir' is strictly prohibited." },
    { regex: /\bshred\b/i, description: "Secure deletion command 'shred' is prohibited." },
    { regex: /\bunlink\b/i, description: "Unlink command is prohibited." }
  ];

  /**
   * Evaluates command line against blacklist security rules.
   *
   * @param commandLine The shell command string to evaluate.
   * @returns SecurityCheckResult indicating whether the command is permissible.
   */
  public evaluate(commandLine: string): SecurityCheckResult {
    if (!commandLine || typeof commandLine !== "string") {
      return { isAllowed: false, reason: "Empty command string." };
    }

    const trimmed = commandLine.trim();
    if (!trimmed) {
      return { isAllowed: false, reason: "Empty command string." };
    }

    for (const rule of ExecutionGuard.BLOCKED_PATTERNS) {
      if (rule.regex.test(trimmed)) {
        return {
          isAllowed: false,
          reason: `Execution Guard Violation: ${rule.description}`,
          blockedToken: rule.regex.source
        };
      }
    }

    return { isAllowed: true };
  }

  /**
   * Static convenience wrapper for evaluate.
   */
  public static evaluate(commandLine: string): SecurityCheckResult {
    return new ExecutionGuard().evaluate(commandLine);
  }

  /**
   * Validates target filesystem paths against directory traversal patterns and
   * unauthorized absolute paths.
   *
   * @param targetPath Relative or absolute filesystem path to inspect.
   * @param workspaceRoot Optional workspace root directory boundary.
   * @returns SecurityCheckResult indicating whether the path is safely bounded.
   */
  public validatePath(targetPath: string, workspaceRoot?: string): SecurityCheckResult {
    if (!targetPath || typeof targetPath !== "string") {
      return {
        isAllowed: false,
        reason: "Target path cannot be empty or non-string.",
        blockedToken: targetPath
      };
    }

    const trimmed = targetPath.trim();
    if (!trimmed) {
      return {
        isAllowed: false,
        reason: "Target path cannot be empty.",
        blockedToken: ""
      };
    }

    // Traps null-byte injection attempts used to truncate filenames in underlying system calls
    if (trimmed.includes("\0")) {
      return {
        isAllowed: false,
        reason: "Null byte injection detected in target path.",
        blockedToken: "\\0"
      };
    }

    // Normalize slashes for universal pattern inspection
    const normalizedSlashes = trimmed.replace(/\\/g, "/");

    // Check for directory traversal sequences attempting to climb above current location
    const hasDotDot = /(^|\/)\.\.($|\/)/.test(normalizedSlashes);

    // Identify absolute path requests
    const isAbsolute = path.isAbsolute(trimmed) || normalizedSlashes.startsWith("/");

    if (workspaceRoot) {
      const normalizedRoot = path.resolve(workspaceRoot);
      const resolved = isAbsolute
        ? path.resolve(trimmed)
        : path.resolve(normalizedRoot, trimmed);

      // Enforce strict containment within the workspace root directory
      if (!resolved.startsWith(normalizedRoot)) {
        return {
          isAllowed: false,
          reason: `Security Violation: Target path "${targetPath}" attempts to escape workspace root "${workspaceRoot}".`,
          blockedToken: hasDotDot ? ".." : "/"
        };
      }

      // Check if it's an absolute path to a sensitive root directory even if superficially matching root
      if (isAbsolute && hasDotDot) {
        return {
          isAllowed: false,
          reason: `Path traversal detected: target path "${targetPath}" contains traversal sequence "..".`,
          blockedToken: ".."
        };
      }
    } else {
      // Without an explicit workspace boundary:
      // 1. Strictly block directory traversal sequences
      if (hasDotDot) {
        return {
          isAllowed: false,
          reason: `Path traversal detected: target path "${targetPath}" contains traversal sequence "..".`,
          blockedToken: ".."
        };
      }

      // 2. Strictly block absolute paths starting with "/"
      if (isAbsolute) {
        return {
          isAllowed: false,
          reason: `Security Violation: Absolute paths starting with "/" are prohibited without explicit workspace authorization.`,
          blockedToken: "/"
        };
      }
    }

    return { isAllowed: true };
  }

  /**
   * Alias for validatePath for consistency across testing and tool suites.
   */
  public checkPath(targetPath: string, workspaceRoot?: string): SecurityCheckResult {
    return this.validatePath(targetPath, workspaceRoot);
  }

  /**
   * Static convenience wrapper for validatePath.
   */
  public static validatePath(targetPath: string, workspaceRoot?: string): SecurityCheckResult {
    return new ExecutionGuard().validatePath(targetPath, workspaceRoot);
  }

  /**
   * Static convenience wrapper for checkPath.
   */
  public static checkPath(targetPath: string, workspaceRoot?: string): SecurityCheckResult {
    return new ExecutionGuard().checkPath(targetPath, workspaceRoot);
  }
}
