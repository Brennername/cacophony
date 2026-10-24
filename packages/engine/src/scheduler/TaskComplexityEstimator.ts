export interface MicroSubtaskDefinition {
  readonly subtaskId: string;
  readonly stage: "scaffolding" | "implementation";
  readonly title: string;
  readonly prompt: string;
  readonly estimatedDurationMs: number;
}

export interface ComplexityEstimateResult {
  readonly isHighComplexity: boolean;
  readonly estimatedDurationMs: number;
  readonly timeoutThresholdMs: number;
  readonly shouldDecompose: boolean;
  readonly microSubtasks: readonly MicroSubtaskDefinition[];
}

export interface ComplexityAnalysisInput {
  readonly taskId: string;
  readonly title: string;
  readonly prompt: string;
  readonly focusFiles?: readonly string[];
  readonly modelTimeoutMs?: number;
}

/**
 * TaskComplexityEstimator
 *
 * Evaluates task prompts, focus files depth, and AST token density prior to
 * model dispatch (Phase S4 T-S4.1). If the estimated execution duration exceeds
 * 60% of the active model's execution timeout window (e.g. 840000ms for Qwen or
 * 420000ms for Gemma), automatically slices the task into discrete 2-minute
 * micro-subtasks to prevent recurring task timeouts and rehabilitation loops.
 */
export class TaskComplexityEstimator {
  private static readonly DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes default
  private static readonly DECOMPOSITION_THRESHOLD_RATIO = 0.6; // 60% of window
  private static readonly BASE_PER_FILE_MS = 45_000; // 45s per focus file
  private static readonly BASE_PER_1K_CHARS_MS = 25_000; // 25s per 1000 characters

  /**
   * Estimates duration and evaluates whether decomposition into micro-tasks is needed.
   */
  public estimateComplexity(input: ComplexityAnalysisInput): ComplexityEstimateResult {
    const timeoutWindow = input.modelTimeoutMs ?? TaskComplexityEstimator.DEFAULT_TIMEOUT_MS;
    const thresholdMs = timeoutWindow * TaskComplexityEstimator.DECOMPOSITION_THRESHOLD_RATIO;

    const fileCount = input.focusFiles?.length || 1;
    const promptLength = input.prompt.length;

    // Baseline calculation: 30s startup + files time + prompt length weight
    let estimatedDurationMs = 30_000 + fileCount * TaskComplexityEstimator.BASE_PER_FILE_MS;
    estimatedDurationMs += Math.floor((promptLength / 1000) * TaskComplexityEstimator.BASE_PER_1K_CHARS_MS);

    // Prompt keyword complexity multipliers (e.g. refactor, migration, e2e, integration)
    const lowerPrompt = input.prompt.toLowerCase();
    if (lowerPrompt.includes("migration") || lowerPrompt.includes("refactor")) {
      estimatedDurationMs = Math.floor(estimatedDurationMs * 1.3);
    }
    if (lowerPrompt.includes("integration") || lowerPrompt.includes("e2e")) {
      estimatedDurationMs = Math.floor(estimatedDurationMs * 1.4);
    }

    const shouldDecompose = estimatedDurationMs > thresholdMs;
    const microSubtasks: MicroSubtaskDefinition[] = [];

    if (shouldDecompose) {
      // Subtask 1: Type contracts, interfaces, and test scaffolding
      microSubtasks.push({
        subtaskId: `${input.taskId}-stage1-scaffold`,
        stage: "scaffolding",
        title: `${input.title} (Stage 1: Contracts and Scaffolding)`,
        prompt: `Focus exclusively on type definitions, schema contracts, and test scaffolding for: ${input.title}.\nOriginal Context:\n${input.prompt}`,
        estimatedDurationMs: Math.floor(estimatedDurationMs * 0.4),
      });

      // Subtask 2: Method implementation, logic, and test assertion verification
      microSubtasks.push({
        subtaskId: `${input.taskId}-stage2-impl`,
        stage: "implementation",
        title: `${input.title} (Stage 2: Implementation and Verification)`,
        prompt: `Implement functional logic and verify assertions against the established scaffolding for: ${input.title}.\nOriginal Context:\n${input.prompt}`,
        estimatedDurationMs: Math.floor(estimatedDurationMs * 0.6),
      });
    }

    return {
      isHighComplexity: estimatedDurationMs > thresholdMs * 0.8,
      estimatedDurationMs,
      timeoutThresholdMs: thresholdMs,
      shouldDecompose,
      microSubtasks,
    };
  }
}
