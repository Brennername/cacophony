import { z } from "zod";

/**
 * Severity level defining how a rule enforcement failure or modification is handled.
 */
export type RuleSeverity = "silent_repair" | "soft_warning" | "hard_rejection" | "disabled";

export const RuleSeveritySchema = z.enum([
  "silent_repair",
  "soft_warning",
  "hard_rejection",
  "disabled",
]);

/**
 * Lifecycle hook indicating when in the agent loop the rule executes.
 */
export type RuleLifecycleHook =
  | "pre_generation"
  | "post_generation"
  | "pre_test"
  | "post_test";

export const RuleLifecycleHookSchema = z.enum([
  "pre_generation",
  "post_generation",
  "pre_test",
  "post_test",
]);

/**
 * Diagnostic produced by a rule execution.
 */
export interface RuleDiagnostic {
  readonly ruleId: string;
  readonly severity: RuleSeverity;
  readonly message: string;
  readonly filePath?: string;
  readonly line?: number;
  readonly column?: number;
  readonly suggestedFix?: string;
}

export const RuleDiagnosticSchema = z.object({
  ruleId: z.string(),
  severity: RuleSeveritySchema,
  message: z.string(),
  filePath: z.string().optional(),
  line: z.number().optional(),
  column: z.number().optional(),
  suggestedFix: z.string().optional(),
});

/**
 * File mutation record emitted during deterministic repairs.
 */
export interface FileMutation {
  readonly filePath: string;
  readonly originalContent: string;
  readonly updatedContent: string;
  readonly description: string;
}

export const FileMutationSchema = z.object({
  filePath: z.string(),
  originalContent: z.string(),
  updatedContent: z.string(),
  description: z.string(),
});

/**
 * Context passed into rule evaluation.
 */
export interface RuleEvaluationContext {
  readonly projectRoot: string;
  readonly hook: RuleLifecycleHook;
  readonly modifiedFiles: readonly string[];
  readonly fileContents: ReadonlyMap<string, string>;
  readonly simulate?: boolean;
  readonly environment?: Readonly<Record<string, string>>;
}

/**
 * Result of executing a single repair rule.
 */
export interface RuleExecutionResult {
  readonly ruleId: string;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly diagnostics: readonly RuleDiagnostic[];
  readonly mutations: readonly FileMutation[];
  readonly hardRejected: boolean;
}

/**
 * Interface that all deterministic repair rules must implement.
 */
export interface IRepairRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaultSeverity: RuleSeverity;
  readonly applicableHooks: readonly RuleLifecycleHook[];

  evaluate(
    context: RuleEvaluationContext,
    severity: RuleSeverity,
    options?: Record<string, unknown>
  ): Promise<RuleExecutionResult>;
}

/**
 * Configuration declaration for a single rule within a pipeline.
 */
export interface RuleConfigDeclaration {
  readonly ruleId: string;
  readonly severity: RuleSeverity;
  readonly enabled?: boolean;
  readonly options?: Record<string, unknown>;
  readonly continueOnError?: boolean;
}

export const RuleConfigDeclarationSchema = z.object({
  ruleId: z.string(),
  severity: RuleSeveritySchema,
  enabled: z.boolean().optional(),
  options: z.record(z.unknown()).optional(),
  continueOnError: z.boolean().optional(),
});

/**
 * Pipeline hook grouping rules.
 */
export interface PipelineHookDeclaration {
  readonly hook: RuleLifecycleHook;
  readonly rules: readonly RuleConfigDeclaration[];
}

export const PipelineHookDeclarationSchema = z.object({
  hook: RuleLifecycleHookSchema,
  rules: z.array(RuleConfigDeclarationSchema),
});

/**
 * Full Pipeline declaration.
 */
export interface RulePipelineDeclaration {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly targetArch?: string;
  readonly hooks: readonly PipelineHookDeclaration[];
}

export const RulePipelineDeclarationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  targetArch: z.string().optional(),
  hooks: z.array(PipelineHookDeclarationSchema),
});

/**
 * Aggregated execution outcome for a pipeline hook run.
 */
export interface PipelineExecutionOutcome {
  readonly pipelineId: string;
  readonly hook: RuleLifecycleHook;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly totalRulesRun: number;
  readonly hardRejected: boolean;
  readonly rejections: readonly RuleDiagnostic[];
  readonly warnings: readonly RuleDiagnostic[];
  readonly repairsApplied: readonly FileMutation[];
  readonly ruleResults: readonly RuleExecutionResult[];
}
