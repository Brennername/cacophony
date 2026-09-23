export interface SecurityCheckResult {
  readonly isAllowed: boolean;
  readonly reason?: string;
  readonly blockedToken?: string;
}

/**
 * Security filter for command execution.
 * Blocks dangerous, unrecoverable, or destructive commands:
 * - rm, shred, unlink
 * - sudo, su, doas
 * - dd, mkfs, fdisk, parted
 * - git reset --hard, git push --force, git clean -fdx
 * - fork bombs, redirecting to raw block devices
 */
export class ExecutionGuard {
  private static readonly BLOCKED_PATTERNS: ReadonlyArray<{ regex: RegExp; description: string }> = [
    { regex: /\brm\b/i, description: "Removal command 'rm' is strictly prohibited. Move files to .trash/ instead." },
    { regex: /\bshred\b/i, description: "Secure deletion command 'shred' is prohibited." },
    { regex: /\bunlink\b/i, description: "Unlink command is prohibited." },
    { regex: /\bsudo\b/i, description: "Privilege escalation with 'sudo' is prohibited." },
    { regex: /\bsu\b/i, description: "Privilege escalation with 'su' is prohibited." },
    { regex: /\bdoas\b/i, description: "Privilege escalation with 'doas' is prohibited." },
    { regex: /\bdd\s+if=/i, description: "Direct block disk writing via 'dd' is prohibited." },
    { regex: /\bmkfs\b/i, description: "Filesystem creation via 'mkfs' is prohibited." },
    { regex: /\bfdisk\b/i, description: "Disk partitioning via 'fdisk' is prohibited." },
    { regex: /\bparted\b/i, description: "Disk partitioning via 'parted' is prohibited." },
    { regex: /git\s+reset\s+--hard/i, description: "Destructive 'git reset --hard' is prohibited." },
    { regex: /git\s+push\s+.*--force/i, description: "Destructive 'git push --force' is prohibited." },
    { regex: /git\s+clean\s+-[a-zA-Z]*f/i, description: "Destructive 'git clean -f' is prohibited." },
    { regex: />\s*\/dev\/(sd[a-z]|nvme[0-9]|null|zero)/i, description: "Redirection to raw devices is prohibited." },
    { regex: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/i, description: "Fork bombs are strictly prohibited." }
  ];

  /**
   * Evaluates command line against blacklist rules.
   */
  public evaluate(commandLine: string): SecurityCheckResult {
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
}
