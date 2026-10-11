// packages/shared-types/src/index.ts

/**
 * Re-exporting all existing types and interfaces from various modules.
 */
export * from "./task.js";
export * from "./telemetry.js";
export * from "./model.js";
export * from "./review.js";
export * from "./tool.js";
export * from "./vault.js";
export * from "./config.js";
export * from "./stack.js";
export * from "./auth.js";
export * from "./signature.js";
export * from "./fleet.js";
export * from "./rules.js";
export * from "./optimization.js";
export * from "./hardware.js";
export * from "./bandit.js";
export * from "./gitea.js";
export * from "./diff.js";
export * from "./diagnostics.js";
export * from "./analytics.js";

/**
 * Interface definition for TaskMetadataHints to support fine-grained run specifications.
 */
export interface TaskMetadataHints {
  /**
   * Optional model affinity override. Specifies a preferred model for task execution.
   */
  modelAffinity?: string;

  /**
   * Optional temperature value as a float. Used in tasks that involve probabilistic outputs.
   */
  temperature?: number;

  /**
   * Optional context budget specifying the maximum amount of context to be used during task execution.
   */
  contextBudget?: number;

  /**
   * Optional rule bypass flags indicating which rules should be bypassed for this task.
   */
  ruleBypassFlags?: string[];

  /**
   * Optional targeted execution guardrails providing additional constraints or guidelines for task execution.
   */
  executionGuardrails?: Record<string, any>;
}
