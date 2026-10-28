import type { AgentRole } from "@cacophony/shared-types";

export interface ModelRoleMappingConfig {
  readonly choreModels?: readonly string[] | undefined;
  readonly architectModels?: readonly string[] | undefined;
  readonly implementerModels?: readonly string[] | undefined;
  readonly reviewerModels?: readonly string[] | undefined;
  readonly testEngineerModels?: readonly string[] | undefined;
  readonly typeSpecialistModels?: readonly string[] | undefined;
  readonly docWriterModels?: readonly string[] | undefined;
  readonly defaultModel?: string | undefined;
}

export interface ModelStatsSnapshot {
  readonly winRate?: number | undefined;
  readonly totalRuns?: number | undefined;
  readonly consecutiveFailures?: number | undefined;
}

export interface ModelRoleSelectionOptions {
  readonly authoringModel?: string | undefined;
  readonly excludeModels?: readonly string[] | undefined;
  readonly modelStats?: Record<string, ModelStatsSnapshot> | undefined;
}

export class ModelRoleSelector {
  private readonly choreModels: readonly string[];
  private readonly architectModels: readonly string[];
  private readonly implementerModels: readonly string[];
  private readonly reviewerModels: readonly string[];
  private readonly testEngineerModels: readonly string[];
  private readonly typeSpecialistModels: readonly string[];
  private readonly docWriterModels: readonly string[];
  private readonly defaultModel: string;

  constructor(config: ModelRoleMappingConfig = {}) {
    this.choreModels = config.choreModels ?? [
      "smollm2:135m",
      "gemma3:4b",
      "qwen2.5-coder:3b",
      "qwen2.5-coder:7b-instruct-q4_K_M",
    ];
    this.architectModels = config.architectModels ?? [
      "phi4:latest",
      "phi4",
      "deepseek-coder-v2:16b",
      "deepseek-r1:8b",
      "qwen2.5-coder:14b",
      "qwen2.5-coder:7b",
    ];
    this.testEngineerModels = config.testEngineerModels ?? [
      "deepseek-coder-v2:16b",
      "phi4:latest",
      "qwen2.5-coder:7b-instruct-q4_K_M",
      "gemma3:4b",
    ];
    this.typeSpecialistModels = config.typeSpecialistModels ?? [
      "phi4:latest",
      "phi4",
      "deepseek-coder-v2:16b",
      "qwen2.5-coder:7b-instruct-q4_K_M",
    ];
    this.docWriterModels = config.docWriterModels ?? [
      "gemma3:4b",
      "qwen2.5-coder:7b-instruct-q4_K_M",
      "smollm2:135m",
    ];
    this.implementerModels = config.implementerModels ?? [
      "deepseek-coder-v2:16b",
      "qwen2.5-coder:7b-instruct-q4_K_M",
      "qwen2.5-coder:7b",
      "gemma3:4b",
      "gemma3:4b-it-qat",
      "qwen2.5-coder:14b",
    ];
    this.reviewerModels = config.reviewerModels ?? [
      "phi4:latest",
      "phi4",
      "deepseek-coder-v2:16b",
      "deepseek-r1:8b",
      "qwen2.5-coder:14b",
      "qwen2.5-coder:7b",
    ];
    this.defaultModel =
      config.defaultModel ??
      process.env["DEFAULT_IMPLEMENTER_MODEL"] ??
      "deepseek-coder-v2:16b";
  }

  public selectModelForRole(
    role: AgentRole,
    availableModels: readonly string[],
    options?: ModelRoleSelectionOptions,
  ): string {
    if (availableModels.length === 0) {
      return this.defaultModel;
    }

    // Filter out authoring and excluded models to ensure independent review (T88.2.1)
    const exclusions = new Set<string>(options?.excludeModels ?? []);
    if (options?.authoringModel) {
      exclusions.add(options.authoringModel);
      // Normalize model name (without tag suffix if applicable)
      const baseAuthor = options.authoringModel.split(":")[0];
      if (baseAuthor) exclusions.add(baseAuthor);
    }

    let candidates = availableModels.filter(
      (m) =>
        !exclusions.has(m) &&
        !exclusions.has(m.split(":")[0] ?? "") &&
        (options?.authoringModel ? !m.startsWith(options.authoringModel) && !options.authoringModel.startsWith(m) : true),
    );

    // Fall back to all available models if exclusion filtered everything out
    if (candidates.length === 0) {
      candidates = [...availableModels];
    }

    const preferredList = this.getPreferredModelsForRole(role);

    // Factor in win rate, sample confidence, and consecutive failures (T88.2.4)
    if (options?.modelStats && Object.keys(options.modelStats).length > 0) {
      const stats = options.modelStats;
      const scoredCandidates = candidates.map((m) => {
        const s = stats[m] ?? stats[m.split(":")[0] ?? ""];
        let score = 0.5;
        if (s) {
          const winRate = s.winRate ?? 0.5;
          const totalRuns = s.totalRuns ?? 0;
          const consecutiveFailures = s.consecutiveFailures ?? 0;
          const confidence = Math.min(1.0, totalRuns / 5);
          score = winRate * confidence - consecutiveFailures * 0.25;
        }
        return { model: m, score };
      });

      scoredCandidates.sort((a, b) => b.score - a.score);
      candidates = scoredCandidates.map((c) => c.model);

      const bestScoredMatch = candidates.find((c) =>
        preferredList.some(
          (pref) =>
            c === pref ||
            c.startsWith(`${pref}:`) ||
            c.startsWith(pref) ||
            pref.startsWith(c),
        ),
      );
      if (bestScoredMatch) return bestScoredMatch;
    }

    for (const pref of preferredList) {
      const match = candidates.find(
        (m) =>
          m === pref ||
          m.startsWith(`${pref}:`) ||
          m.startsWith(pref) ||
          pref.startsWith(m),
      );
      if (match) return match;
    }

    if (role === "chore_runner") {
      const smallest = candidates.find(
        (m) =>
          m.includes("1.5b") ||
          m.includes("3b") ||
          m.includes("135m") ||
          m.includes("0.5b"),
      );
      if (smallest) return smallest;
    }

    return candidates[0] || this.defaultModel;
  }

  public isMicroTaskRole(role: AgentRole): boolean {
    return role === "chore_runner" || role === "doc_writer";
  }

  public getPreferredModelsForRole(role: AgentRole): readonly string[] {
    switch (role) {
      case "chore_runner":
        return this.choreModels;
      case "doc_writer":
        return this.docWriterModels;
      case "architect":
      case "planner":
        return this.architectModels;
      case "type_specialist":
        return this.typeSpecialistModels;
      case "test_engineer":
      case "fixer":
        return this.testEngineerModels;
      case "reviewer":
      case "assessor":
      case "security_auditor":
        return this.reviewerModels;
      case "implementer":
      default:
        return this.implementerModels;
    }
  }

  public isPreferredForRole(role: AgentRole, modelId: string): boolean {
    const preferredList = this.getPreferredModelsForRole(role);
    return preferredList.some(
      (pref) =>
        modelId === pref ||
        modelId.startsWith(`${pref}:`) ||
        modelId.startsWith(pref) ||
        pref.startsWith(modelId),
    );
  }
}

