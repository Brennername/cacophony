import type { AgentRole } from "@cacophony/shared-types";

export interface ModelRoleMappingConfig {
  readonly choreModels?: readonly string[] | undefined;
  readonly architectModels?: readonly string[] | undefined;
  readonly implementerModels?: readonly string[] | undefined;
  readonly reviewerModels?: readonly string[] | undefined;
  readonly defaultModel?: string | undefined;
}

/**
 * ModelRoleSelector
 *
 * Dispatches tasks to models specialized by role.
 * In particular, assigns chore_runner tasks (documentation appends, README updates,
 * changelog drafting) to ultra-lightweight micro-models (smollm2:135m, qwen2.5-coder:1.5b/3b)
 * to run during cooldown intervals with zero VRAM pressure.
 */
export class ModelRoleSelector {
  private readonly choreModels: readonly string[];
  private readonly architectModels: readonly string[];
  private readonly implementerModels: readonly string[];
  private readonly reviewerModels: readonly string[];
  private readonly defaultModel: string;

  constructor(config: ModelRoleMappingConfig = {}) {
    this.choreModels = config.choreModels ?? [
      "smollm2:135m",
      "smollm2:360m",
      "qwen2.5-coder:1.5b",
      "qwen2.5-coder:3b",
    ];
    this.architectModels = config.architectModels ?? [
      "deepseek-r1:8b",
      "qwen2.5-coder:14b",
      "qwen2.5-coder:7b",
    ];
    this.implementerModels = config.implementerModels ?? [
      "qwen2.5-coder:7b",
      "qwen2.5-coder:14b",
      "qwen2.5-coder:3b",
    ];
    this.reviewerModels = config.reviewerModels ?? [
      "deepseek-r1:8b",
      "qwen2.5-coder:14b",
      "qwen2.5-coder:7b",
    ];
    this.defaultModel = config.defaultModel ?? "qwen2.5-coder:7b";
  }

  /**
   * Selects the optimal model for a given role from the available fleet.
   */
  public selectModelForRole(role: AgentRole, availableModels: readonly string[]): string {
    if (availableModels.length === 0) {
      return this.defaultModel;
    }

    let preferredList: readonly string[];
    switch (role) {
      case "chore_runner":
      case "doc_writer":
        preferredList = this.choreModels;
        break;
      case "architect":
      case "planner":
        preferredList = this.architectModels;
        break;
      case "reviewer":
      case "security_auditor":
        preferredList = this.reviewerModels;
        break;
      case "implementer":
      case "test_engineer":
      case "type_specialist":
      default:
        preferredList = this.implementerModels;
        break;
    }

    // Pick first matching model present in availableModels
    for (const pref of preferredList) {
      const match = availableModels.find(
        (m) => m === pref || m.startsWith(`${pref}:`) || pref.startsWith(m)
      );
      if (match) return match;
    }

    // For chore_runner, if none of the specific micro-models are installed, pick the smallest available model
    if (role === "chore_runner") {
      const smallest = availableModels.find((m) =>
        m.includes("1.5b") || m.includes("3b") || m.includes("135m") || m.includes("0.5b")
      );
      if (smallest) return smallest;
    }

    // Fall back to first available model or default
    return availableModels[0] || this.defaultModel;
  }

  /**
   * Checks whether a role corresponds to low-overhead micro-tasks that can run
   * without evicting resident primary models.
   */
  public isMicroTaskRole(role: AgentRole): boolean {
    return role === "chore_runner" || role === "doc_writer";
  }
}
