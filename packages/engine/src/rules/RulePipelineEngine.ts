import fs from "node:fs/promises";
import {
  IRepairRule,
  RulePipelineDeclaration,
  RuleLifecycleHook,
  RuleEvaluationContext,
  PipelineExecutionOutcome,
  RuleExecutionResult,
  RuleDiagnostic,
  FileMutation,
} from "@cacophony/shared-types";
import { RuleDslParser } from "./RuleDslParser.js";
import {
  StripEmojisRule,
  EnforceEsmJsExtensionRule,
  WhitespaceAndEolNormalizerRule,
  LooseRootFileGuardRule,
  EmptyFileGuardRule,
  PlaceholderStubDetectorRule,
  BannedImportScrubberRule,
  AstSignatureAlignRule,
  TypeScriptDiagnosticRepairRule,
} from "./catalog/index.js";

/**
 * RulePipelineEngine
 *
 * Orchestrates deterministic repair rules across lifecycle hooks.
 * Supports:
 * - Declarative pipeline configs and DSL parsing
 * - Short-circuiting on hard_rejection unless continueOnError is enabled
 * - Soft-warning accumulation
 * - Dry-run simulation mode (calculating mutations without disk writes)
 * - Telemetry & diagnostic recording
 */
export class RulePipelineEngine {
  private readonly rules = new Map<string, IRepairRule>();
  private readonly dslParser = new RuleDslParser();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Registers a repair rule into the engine.
   */
  public registerRule(rule: IRepairRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Gets a registered rule by id.
   */
  public getRule(ruleId: string): IRepairRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Registers all core catalog rules.
   */
  public registerDefaultRules(): void {
    this.registerRule(new StripEmojisRule());
    this.registerRule(new EnforceEsmJsExtensionRule());
    this.registerRule(new WhitespaceAndEolNormalizerRule());
    this.registerRule(new LooseRootFileGuardRule());
    this.registerRule(new EmptyFileGuardRule());
    this.registerRule(new PlaceholderStubDetectorRule());
    this.registerRule(new BannedImportScrubberRule());
    this.registerRule(new AstSignatureAlignRule());
    this.registerRule(new TypeScriptDiagnosticRepairRule());
  }

  /**
   * Parses DSL source code into a pipeline declaration.
   */
  public parseDsl(dslSource: string, env?: Record<string, string>): RulePipelineDeclaration {
    return this.dslParser.parse(dslSource, env);
  }

  /**
   * Executes a lifecycle hook for the specified pipeline against an evaluation context.
   */
  public async executePipelineHook(
    pipeline: RulePipelineDeclaration,
    hook: RuleLifecycleHook,
    context: RuleEvaluationContext
  ): Promise<PipelineExecutionOutcome> {
    const start = performance.now();
    const hookDecl = pipeline.hooks.find((h) => h.hook === hook);

    if (!hookDecl) {
      return {
        pipelineId: pipeline.id,
        hook,
        passed: true,
        durationMs: performance.now() - start,
        totalRulesRun: 0,
        hardRejected: false,
        rejections: [],
        warnings: [],
        repairsApplied: [],
        ruleResults: [],
      };
    }

    const rejections: RuleDiagnostic[] = [];
    const warnings: RuleDiagnostic[] = [];
    const repairsApplied: FileMutation[] = [];
    const ruleResults: RuleExecutionResult[] = [];
    let hardRejected = false;

    // Working file contents map updated progressively by repairs
    const workingFileContents = new Map<string, string>(context.fileContents);

    for (const ruleDecl of hookDecl.rules) {
      if (ruleDecl.enabled === false || ruleDecl.severity === "disabled") {
        continue;
      }

      const rule = this.rules.get(ruleDecl.ruleId);
      if (!rule) {
        throw new Error(`Rule '${ruleDecl.ruleId}' declared in pipeline '${pipeline.id}' is not registered`);
      }

      const ruleContext: RuleEvaluationContext = {
        ...context,
        fileContents: workingFileContents,
      };

      const result = await rule.evaluate(ruleContext, ruleDecl.severity, ruleDecl.options);
      ruleResults.push(result);

      // Collect diagnostics
      for (const diag of result.diagnostics) {
        if (diag.severity === "hard_rejection") {
          rejections.push(diag);
        } else if (diag.severity === "soft_warning") {
          warnings.push(diag);
        }
      }

      // Apply silent repairs to working memory
      for (const mutation of result.mutations) {
        workingFileContents.set(mutation.filePath, mutation.updatedContent);
        repairsApplied.push(mutation);

        // If not simulating, persist modification to disk
        if (!context.simulate) {
          try {
            await fs.writeFile(mutation.filePath, mutation.updatedContent, "utf-8");
          } catch {
            // Memory-only or mock file handling
          }
        }
      }

      if (result.hardRejected) {
        hardRejected = true;
        if (!ruleDecl.continueOnError) {
          // Short circuit pipeline on hard rejection
          break;
        }
      }
    }

    const durationMs = performance.now() - start;
    const passed = !hardRejected;

    return {
      pipelineId: pipeline.id,
      hook,
      passed,
      durationMs,
      totalRulesRun: ruleResults.length,
      hardRejected,
      rejections,
      warnings,
      repairsApplied,
      ruleResults,
    };
  }
}
