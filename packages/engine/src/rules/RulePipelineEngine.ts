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
  AstParameterCorrectionRules,
  FilePlacementAndNamingConventionRule,
} from "./catalog/index.js";

export class RulePipelineEngine {
  private readonly rules = new Map<string, IRepairRule>();
  private readonly dslParser = new RuleDslParser();

  constructor() {
    this.registerDefaultRules();
  }

  public registerRule(rule: IRepairRule): void {
    this.rules.set(rule.id, rule);
  }

  public getRule(ruleId: string): IRepairRule | undefined {
    const direct = this.rules.get(ruleId);
    if (direct) return direct;

    const aliasMap: Record<string, string> = {
      "empty_file_guard": "empty_files",
      "banned_import_scrubber": "banned_imports",
      "placeholder_stub_detector": "placeholder_stubs",
      "whitespace_and_eol_normalizer": "whitespace_normalizer",
      "loose_root_file_guard": "loose_root_files",
      "signature_align": "ast_signature_align",
      "parameter_inversion_repair": "ast_parameter_correction",
      "ast_param_align": "ast_parameter_correction",
      "file_placement": "file_placement_and_naming"
    };

    const mapped = aliasMap[ruleId];
    return mapped ? this.rules.get(mapped) : undefined;
  }

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
    this.registerRule(new AstParameterCorrectionRules());
    this.registerRule(new FilePlacementAndNamingConventionRule());
  }

  public parseDsl(dslSource: string, env?: Record<string, string>): RulePipelineDeclaration {
    return this.dslParser.parse(dslSource, env);
  }

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

      for (const diag of result.diagnostics) {
        if (diag.severity === "hard_rejection") {
          rejections.push(diag);
        } else if (diag.severity === "soft_warning") {
          warnings.push(diag);
        }
      }

      for (const mutation of result.mutations) {
        workingFileContents.set(mutation.filePath, mutation.updatedContent);
        repairsApplied.push(mutation);

        if (!context.simulate) {
          try {
            await fs.writeFile(mutation.filePath, mutation.updatedContent, "utf-8");
          } catch {

          }
        }
      }

      if (result.hardRejected) {
        hardRejected = true;
        if (!ruleDecl.continueOnError) {

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
