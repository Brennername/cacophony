import type { GroomedTask } from "../scheduler/QueueGroomer.js";
import type { OllamaProvider } from "../inference/OllamaProvider.js";
import type { ContextMinimizer } from "../inference/ContextMinimizer.js";
import type { SelfHealingParser } from "../inference/SelfHealingParser.js";
import type { RulePipelineEngine } from "../rules/RulePipelineEngine.js";
import type { RulePipelineDeclaration } from "@cacophony/shared-types";
import type { StreamTapManager } from "../inference/StreamTapManager.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execAsync = promisify(exec);

export interface AutonomousWorkerPipelineOptions {
  readonly workspaceRoot: string;
  readonly ollamaProvider: OllamaProvider;
  readonly contextMinimizer: ContextMinimizer;
  readonly parser: SelfHealingParser;
  readonly ruleEngine: RulePipelineEngine;
  readonly streamTapManager?: StreamTapManager;
  readonly defaultPipeline?: RulePipelineDeclaration;
}

/**
 * AutonomousWorkerPipeline
 *
 * Implements the concrete autonomous execution handler for TaskScheduler:
 * 1. Minimizes context and prepares prompt payload via ContextMinimizer.
 * 2. Invokes local Ollama model with keep_alive=-1 and live token streaming.
 * 3. Validates and extracts code via SelfHealingParser.
 * 4. Applies deterministic rule repair pipeline (stripping emojis, ESM extensions, whitespace).
 * 5. Writes modifications to disk.
 * 6. Executes scoped verification test suite.
 */
export class AutonomousWorkerPipeline {
  private readonly workspaceRoot: string;
  private readonly provider: OllamaProvider;
  private readonly minimizer: ContextMinimizer;
  private readonly parser: SelfHealingParser;
  private readonly ruleEngine: RulePipelineEngine;
  private readonly streamTapManager: StreamTapManager | undefined;
  private readonly defaultPipeline: RulePipelineDeclaration;

  constructor(options: AutonomousWorkerPipelineOptions) {
    this.workspaceRoot = options.workspaceRoot;
    this.provider = options.ollamaProvider;
    this.minimizer = options.contextMinimizer;
    this.parser = options.parser;
    this.ruleEngine = options.ruleEngine;
    this.streamTapManager = options.streamTapManager;
    this.defaultPipeline = options.defaultPipeline ?? {
      id: "pipeline_autonomous_standard",
      name: "Standard Autonomous Code Pipeline",
      hooks: [
        {
          hook: "post_generation",
          rules: [
            { ruleId: "strip_emojis", severity: "silent_repair" },
            { ruleId: "enforce_esm_js", severity: "silent_repair" },
            { ruleId: "whitespace_normalizer", severity: "silent_repair" }
          ]
        }
      ]
    };
  }

  /**
   * The execution handler passed into TaskScheduler.setExecutionHandler.
   */
  public async executeTask(groomed: GroomedTask, selectedModel: string): Promise<boolean> {
    try {
      if (this.streamTapManager) {
        this.streamTapManager.setActiveTask(groomed.task.id);
      }

      // 1. Context Minimization with adaptive format instruction
      const focusFiles = groomed.focusFiles;
      const targetRel = focusFiles[0];
      const formatter = typeof this.parser.getFormatter === "function" ? this.parser.getFormatter() : null;
      const formatInstruction = formatter
        ? formatter.getFormatInstruction(true, targetRel)
        : "[OUTPUT FORMAT REQUIREMENT]: Provide valid code enclosed in markdown code fences.";
      const directives = [...groomed.stackProfile.directives, formatInstruction];
      const context = this.minimizer.assembleContext(
        groomed.enrichedPrompt,
        focusFiles,
        directives
      );

      // 2. Generation with Self-Healing Parser and Live Token Emission
      const parseResult = await this.parser.executeWithSelfHealing(
        this.provider,
        {
          model: selectedModel,
          messages: [{ role: "user", content: context.assembledPrompt }],
          temperature: 0.1
        },
        (chunk) => {
          if (this.streamTapManager) {
            this.streamTapManager.emitToken(groomed.task.id, chunk);
          }
        }
      );

      if (!parseResult.code) {
        console.error(`[AutonomousWorkerPipeline] No code block extracted for task '${groomed.enrichedPrompt.slice(0, 40)}'`);
        return false;
      }

      // 3. Write generated content to target focus file
      if (focusFiles.length > 0) {
        const targetRel = focusFiles[0]!;
        const targetAbs = path.resolve(this.workspaceRoot, targetRel);

        // Pre-write deterministic rule execution
        const fileContentsMap = new Map<string, string>();
        fileContentsMap.set(targetAbs, parseResult.code);

        const outcome = await this.ruleEngine.executePipelineHook(
          this.defaultPipeline,
          "post_generation",
          {
            projectRoot: this.workspaceRoot,
            hook: "post_generation",
            modifiedFiles: [targetAbs],
            fileContents: fileContentsMap,
            simulate: false
          }
        );

        if (outcome.hardRejected) {
          console.error(`[AutonomousWorkerPipeline] Rule engine hard rejected task: ${outcome.rejections.map(r => r.message).join(", ")}`);
          return false;
        }

        const finalCode = fileContentsMap.get(targetAbs) || parseResult.code;
        await fs.mkdir(path.dirname(targetAbs), { recursive: true });
        await fs.writeFile(targetAbs, finalCode, "utf-8");
      }

      // 4. Run Scoped Test Command if specified
      if (groomed.scopedTestCommand) {
        try {
          await execAsync(groomed.scopedTestCommand, {
            cwd: this.workspaceRoot,
            timeout: 60000
          });
        } catch (testErr) {
          console.error(`[AutonomousWorkerPipeline] Test command failed for task '${groomed.enrichedPrompt.slice(0, 40)}':`, testErr);
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error(`[AutonomousWorkerPipeline] Execution error for task '${groomed.enrichedPrompt.slice(0, 40)}':`, err);
      return false;
    }
  }

}
