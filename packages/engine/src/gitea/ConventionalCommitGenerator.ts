import type { AgentRole } from "@cacophony/shared-types";

/**
 * Options for generating conventional commit messages.
 */
export interface ConventionalCommitOptions {
  readonly role?: AgentRole | string;
  readonly taskId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly scope?: string;
  readonly isFix?: boolean;
  readonly body?: string;
  readonly breakingChange?: boolean;
}

/**
 * Unicode regular expression capturing emojis, emoticons, pictographs, and transport symbols.
 */
export const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}]/u;

/**
 * ConventionalCommitGenerator
 *
 * Implements deterministic generation and validation of Conventional Commits format
 * for autonomous worker agents (T64.2). Enforces strict zero-emoji compliance.
 */
export class ConventionalCommitGenerator {
  /**
   * Maps task agent role to conventional commit type (T64.2.2).
   *
   * implementer -> feat or fix
   * architect -> refactor
   * reviewer / test_engineer / tester -> test
   * doc_writer / documenter -> docs
   * type_specialist -> feat
   * security_auditor -> fix
   * chore_runner / planner / default -> chore (or fix if isFix is true)
   */
  public resolveCommitType(
    role?: AgentRole | string,
    isFix: boolean = false,
  ): string {
    if (
      isFix &&
      (role === "implementer" ||
        role === "type_specialist" ||
        !role ||
        role === "unknown_role" ||
        role === "security_auditor")
    ) {
      return "fix";
    }

    switch (role) {
      case "implementer":
        return "feat";
      case "architect":
        return "refactor";
      case "reviewer":
      case "test_engineer":
      case "tester":
        return "test";
      case "doc_writer":
      case "documenter":
        return "docs";
      case "type_specialist":
        return "feat";
      case "security_auditor":
        return "fix";
      case "chore_runner":
      case "planner":
      default:
        return isFix ? "fix" : "chore";
    }
  }

  /**
   * Checks whether the provided text contains any emoji or pictograph characters.
   */
  public containsEmoji(text: string): boolean {
    return EMOJI_REGEX.test(text);
  }

  /**
   * Strips all Unicode emojis and pictographs from the given string.
   */
  public stripEmojis(text: string): string {
    return text.replace(new RegExp(EMOJI_REGEX.source, "gu"), "").trim();
  }

  /**
   * Enforces strict zero-emoji validation, throwing an Error if any emoji is detected (T64.2.3).
   */
  public validateZeroEmoji(text: string): void {
    if (this.containsEmoji(text)) {
      throw new Error(
        `Zero-emoji policy violation: text contains forbidden emoji characters.`,
      );
    }
  }

  /**
   * Formats a complete conventional commit message with task metadata and zero-emoji enforcement (T64.2.1, T64.2.3, T64.2.4).
   */
  public formatCommitMessage(options: ConventionalCommitOptions): string {
    const rawDesc =
      options.description || options.title || "automated task update";
    this.validateZeroEmoji(rawDesc);

    if (options.scope) {
      this.validateZeroEmoji(options.scope);
    }
    if (options.body) {
      this.validateZeroEmoji(options.body);
    }

    const commitType = this.resolveCommitType(options.role, options.isFix);
    const scopePart = options.scope ? `(${options.scope})` : "";
    const breaking = options.breakingChange ? "!" : "";
    const rawSubject = `${commitType}${scopePart}${breaking}: ${rawDesc}`;
    const subject = this.clampSubject(rawSubject, 72);

    const metadataParts: string[] = [];
    if (options.body) {
      metadataParts.push(options.body);
    }
    if (options.taskId) {
      metadataParts.push(`Task: ${options.taskId}`);
      metadataParts.push(`Closes ${options.taskId}`);
    }
    if (options.role) {
      metadataParts.push(`Role: ${options.role}`);
    }

    if (metadataParts.length > 0) {
      return `${subject}\n\n${metadataParts.join("\n\n")}`;
    }

    return subject;
  }

  /**
   * Clamps commit subject to maximum allowable length (defaults to standard 72 chars).
   */
  public clampSubject(subject: string, maxLength: number = 72): string {
    if (subject.length <= maxLength) {
      return subject;
    }
    return subject.slice(0, maxLength);
  }
}
