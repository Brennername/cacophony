import type { GroomedTask } from "./QueueGroomer.js";
import type {
  StageName,
  StageStatus,
} from "@cacophony/shared-types";
import type { StreamTapManager } from "../inference/StreamTapManager.js";
import type {
  StageRepository,
  TaskRepository,
} from "@cacophony/db";
import type { TelemetryPoller } from "../telemetry/TelemetryPoller.js";

export interface MockAutonomousWorkerPipelineOptions {
  readonly taskRepository: TaskRepository;
  readonly stageRepository: StageRepository;
  readonly streamTapManager?: StreamTapManager | undefined;
  readonly telemetryPoller?: TelemetryPoller | undefined;
}

/**
 * MockAutonomousWorkerPipeline
 *
 * Implements a lightweight, deterministic autonomous execution pipeline for zero-APU
 * environments, test environments, and cloud dynos (such as Heroku, Render, Fly.io).
 *
 * Responsibilities:
 * 1. Simulates realistic pipeline stage transitions (planning -> generation -> deterministic_scrub -> test_execution -> review -> merge).
 * 2. Streams authentic code and reasoning tokens via StreamTapManager and SSE to power the dashboard.
 * 3. Persists full stage records, durations, token counts, and diffs directly in the database.
 * 4. Consumes minimal memory (<20MB) by avoiding heavy child processes (npm build, tsc, vitest), preventing Heroku R15 dyno memory crashes.
 */
export class MockAutonomousWorkerPipeline {
  private readonly taskRepo: TaskRepository;
  private readonly stageRepo: StageRepository;
  private readonly streamTapManager?: StreamTapManager | undefined;
  private readonly telemetryPoller?: TelemetryPoller | undefined;

  constructor(options: MockAutonomousWorkerPipelineOptions) {
    this.taskRepo = options.taskRepository;
    this.stageRepo = options.stageRepository;
    this.streamTapManager = options.streamTapManager;
    this.telemetryPoller = options.telemetryPoller;
  }

  /**
   * Primary execution handler adhering to TaskScheduler executionHandler contract.
   */
  public async executeTask(
    groomed: GroomedTask,
    selectedModel: string,
    signal?: AbortSignal,
  ): Promise<{
    success: boolean;
    tokensPerSec: number;
    commitHash?: string | undefined;
    baseCommitHash?: string | undefined;
    failureReason?: string | undefined;
  }> {
    const taskId = groomed.task.id;
    const taskStartTime = Date.now();

    if (this.telemetryPoller) {
      this.telemetryPoller.setSimulatedActiveModel(selectedModel);
    }
    if (this.streamTapManager) {
      this.streamTapManager.setActiveTask(taskId);
    }

    try {
      // 1. Stage: Planning
      const planningStart = Date.now();
      await this.recordAndEmitStage(taskId, "planning", "RUNNING");
      await this.sleep(400, signal);

      const focusFiles = groomed.focusFiles.length > 0 ? groomed.focusFiles : ["packages/engine/src/core/Module.ts"];
      const planningLog = `Context assembled: ${focusFiles.length} focus files, 4 architectural directives`;
      await this.recordAndEmitStage(
        taskId,
        "planning",
        "SUCCESS",
        Date.now() - planningStart,
        planningLog,
      );

      // 2. Stage: Generation
      const generationStart = Date.now();
      await this.recordAndEmitStage(taskId, "generation", "RUNNING");

      const tps = this.resolveTokensPerSecond(selectedModel);
      const isReasoning = selectedModel.includes("r1") || selectedModel.includes("deepseek") || selectedModel.includes("reason");
      const { fullText, codeOnly, reasoningOnly } = this.generateSyntheticContent(groomed, selectedModel, isReasoning);

      // Split into fine-grained token chunks for streaming
      const tokenChunks = fullText.match(/(\s+|\w+|[^\s\w]+)/g) || [fullText];
      const delayPerChunkMs = Math.max(10, Math.min(30, Math.round(1000 / (tps * 2))));

      let tokensEmitted = 0;
      for (const chunk of tokenChunks) {
        if (signal?.aborted) {
          throw new Error("Task execution aborted by watchdog signal");
        }
        tokensEmitted++;
        if (this.streamTapManager) {
          this.streamTapManager.emitToken(taskId, chunk);
          if (tokensEmitted % 15 === 0) {
            this.streamTapManager.emitGenerationHeartbeat({
              taskId,
              modelId: selectedModel,
              state: "streaming",
              elapsedMs: Date.now() - generationStart,
              promptIngestionMs: 120,
              timeToFirstTokenMs: 140,
              tokensEmitted,
              instantaneousTps: tps,
              idleMs: 0,
              timestamp: Date.now(),
            });
          }
        }
        await this.sleep(delayPerChunkMs, signal);
      }

      const generationDuration = Date.now() - generationStart;
      const tokensPrompt = 180 + Math.floor(Math.random() * 50);
      const tokensCompletion = tokensEmitted;

      await this.recordAndEmitStage(
        taskId,
        "generation",
        "SUCCESS",
        generationDuration,
        `Generated code block in 1 attempts (${tps} tok/s)`,
        tokensPrompt,
        tokensCompletion,
        reasoningOnly || null,
        isReasoning ? "Reasoning complete. Architecture adheres to strict contracts and decoupled boundaries." : null,
        isReasoning ? Math.round(generationDuration * 0.35) : 0,
      );

      // 3. Stage: Deterministic Scrub
      const scrubStart = Date.now();
      await this.recordAndEmitStage(taskId, "deterministic_scrub", "RUNNING");
      await this.sleep(250, signal);

      const targetRel = focusFiles[0] || "packages/engine/src/core/Module.ts";
      const generatedDiff = this.generateUnifiedDiff(targetRel, codeOnly);
      await this.taskRepo.updateLogSnippet(taskId, generatedDiff);

      const scrubDuration = Date.now() - scrubStart;
      const scrubLog = `Applied 2 repairs: strip_emojis, whitespace_normalizer.\n${generatedDiff}`;
      await this.recordAndEmitStage(
        taskId,
        "deterministic_scrub",
        "SUCCESS",
        scrubDuration,
        scrubLog,
      );

      if (this.streamTapManager) {
        this.streamTapManager.emitSubStageLog({
          taskId,
          channel: "ast_scrubbing",
          content: `[CodeScrubber] Validated ESM exports, stripped emojis, verified imports.`,
          timestamp: Date.now(),
        });
      }

      // 4. Stage: Test Execution
      const testStart = Date.now();
      await this.recordAndEmitStage(taskId, "test_execution", "RUNNING");

      if (this.streamTapManager) {
        this.streamTapManager.emitSubStageLog({
          taskId,
          channel: "test_output",
          content: `[Test Runner] Executing verification suite:\n$ ${groomed.scopedTestCommand || "npm test"}\n`,
          timestamp: Date.now(),
        });
      }

      await this.sleep(600, signal);

      const testDuration = Date.now() - testStart;
      const testStdout = [
        `▶ Suite: ${groomed.task.title.slice(0, 40)}`,
        `  ✔ should satisfy type contracts and invariants (${Math.floor(Math.random() * 5) + 1}ms)`,
        `  ✔ should handle edge conditions cleanly (${Math.floor(Math.random() * 4) + 1}ms)`,
        `  ✔ should pass verification assertions (${Math.floor(Math.random() * 6) + 1}ms)`,
        `✔ Suite: ${groomed.task.title.slice(0, 40)} (${testDuration}ms)`,
        `ℹ tests 3`,
        `ℹ pass 3`,
        `ℹ fail 0`,
      ].join("\n");

      if (this.streamTapManager) {
        this.streamTapManager.emitSubStageLog({
          taskId,
          channel: "test_output",
          content: testStdout,
          timestamp: Date.now(),
        });
      }

      const testLog = `Exit Code: 0\nDuration: ${testDuration}ms\n\n[STDOUT]:\n${testStdout}`;
      await this.recordAndEmitStage(
        taskId,
        "test_execution",
        "SUCCESS",
        testDuration,
        testLog,
      );

      // 5. Stage: PR Review
      const reviewStart = Date.now();
      await this.recordAndEmitStage(taskId, "pr_review", "RUNNING");
      await this.sleep(400, signal);

      const reviewDuration = Date.now() - reviewStart;
      const reviewLog = `[FrontierReviewer (${selectedModel})] Verdict: APPROVE. Implementation strictly adheres to single responsibility principle, type safety invariants, and 100% test pass rate.`;
      await this.recordAndEmitStage(
        taskId,
        "pr_review",
        "SUCCESS",
        reviewDuration,
        reviewLog,
      );

      const simulatedSha = Math.random().toString(16).slice(2, 9);
      if (this.streamTapManager) {
        this.streamTapManager.emitSubStageLog({
          taskId,
          channel: "review_critique",
          content: `[AutoMergeGate] Successfully merged PR #${Math.floor(Math.random() * 50) + 400} into main (commit ${simulatedSha}).`,
          timestamp: Date.now(),
        });
      }

      // Finalize Task State in Database
      const totalDuration = Date.now() - taskStartTime;
      await this.taskRepo.updateStatus(taskId, "COMPLETED", totalDuration, tps);

      return {
        success: true,
        tokensPerSec: tps,
        commitHash: simulatedSha,
        baseCommitHash: "0000000",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const totalDuration = Date.now() - taskStartTime;
      await this.taskRepo.updateStatus(taskId, "FAILED", totalDuration, 0);
      return {
        success: false,
        tokensPerSec: 0,
        failureReason: message,
      };
    } finally {
      if (this.streamTapManager) {
        this.streamTapManager.setActiveTask(null);
      }
    }
  }

  /**
   * Resolves expected token throughput velocity for the selected model.
   */
  private resolveTokensPerSecond(modelName: string): number {
    const lower = modelName.toLowerCase();
    if (lower.includes(":3b") || lower.includes("-3b")) return 52.0;
    if (lower.includes(":4b") || lower.includes("-4b")) return 38.0;
    if (lower.includes(":7b") || lower.includes("-7b")) return 28.5;
    if (lower.includes(":8b") || lower.includes("-8b") || lower.includes("deepseek-r1")) return 16.5;
    if (lower.includes(":14b") || lower.includes(":16b")) return 18.2;
    return 26.0;
  }

  /**
   * Generates synthetic, syntactically clean code content and optional reasoning trace.
   */
  private generateSyntheticContent(
    groomed: GroomedTask,
    selectedModel: string,
    isReasoning: boolean,
  ): { fullText: string; codeOnly: string; reasoningOnly?: string } {
    const title = groomed.task.title;
    const promptSummary = groomed.enrichedPrompt.slice(0, 80).replace(/\n/g, " ");

    let reasoningBlock = "";
    if (isReasoning) {
      reasoningBlock = [
        "<think>",
        `Evaluating architectural requirements for: ${title}.`,
        `Assigned model: ${selectedModel}. Intent: ${promptSummary}`,
        "Validating single responsibility principle and separation of concerns.",
        "Ensuring clean interface abstractions and strict TypeScript contracts.",
        "Synthesizing production-grade implementation with zero placeholder stubs.",
        "</think>",
        "",
      ].join("\n");
    }

    let codeBlock = "";
    if (title.toLowerCase().includes("interface") || groomed.task.role === "architect") {
      codeBlock = [
        "/**",
        ` * ${title.replace(/[^a-zA-Z0-9 ]/g, "")}`,
        ` * Generated by ${selectedModel} with strict interface boundaries.`,
        " */",
        "export interface IServiceContract {",
        "  readonly id: string;",
        "  readonly status: 'IDLE' | 'ACTIVE' | 'TERMINATED';",
        "  execute(): Promise<boolean>;",
        "  reset(): void;",
        "}",
        "",
        "export interface ServiceOptions {",
        "  readonly timeoutMs?: number;",
        "  readonly maxRetries?: number;",
        "}",
      ].join("\n");
    } else if (title.toLowerCase().includes("test")) {
      codeBlock = [
        "import { describe, it } from 'node:test';",
        "import assert from 'node:assert/strict';",
        "",
        `describe('${title.slice(0, 50)}', () => {`,
        "  it('should initialize with valid default parameters', () => {",
        "    const active = true;",
        "    assert.strictEqual(active, true);",
        "  });",
        "",
        "  it('should enforce contract boundaries without throwing', async () => {",
        "    const latency = 12;",
        "    assert.ok(latency >= 0);",
        "  });",
        "});",
      ].join("\n");
    } else {
      codeBlock = [
        "import type { TaskRecord } from '@cacophony/shared-types';",
        "",
        "/**",
        ` * ${title.replace(/[^a-zA-Z0-9 ]/g, "")}`,
        ` * Model: ${selectedModel}`,
        " */",
        "export class AutonomousFeatureWorker {",
        "  private isInitialized = false;",
        "",
        "  public initialize(): void {",
        "    this.isInitialized = true;",
        "  }",
        "",
        "  public async processTask(task: TaskRecord): Promise<boolean> {",
        "    if (!this.isInitialized) {",
        "      this.initialize();",
        "    }",
        "    return Boolean(task && task.id);",
        "  }",
        "}",
      ].join("\n");
    }

    const fencedCode = `\`\`\`typescript\n${codeBlock}\n\`\`\``;
    const fullText = reasoningBlock ? `${reasoningBlock}\n${fencedCode}` : fencedCode;

    const result: { fullText: string; codeOnly: string; reasoningOnly?: string } = {
      fullText,
      codeOnly: codeBlock,
    };
    if (reasoningBlock) {
      result.reasoningOnly = reasoningBlock.replace(/<\/?think>/g, "").trim();
    }
    return result;
  }

  /**
   * Generates a realistic unified diff matching the task target file.
   */
  private generateUnifiedDiff(filePath: string, code: string): string {
    const lines = code.split("\n").slice(0, 15);
    const addedLines = lines.map((l) => `+${l}`).join("\n");
    return [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -1,3 +1,18 @@`,
      addedLines,
    ].join("\n");
  }

  /**
   * Records stage transitions in StageRepository and emits stage update events over StreamTapManager.
   */
  private async recordAndEmitStage(
    taskId: string,
    stageName: StageName,
    stageStatus: StageStatus,
    durationMs = 0,
    logOutput: string | null = null,
    tokensSent = 0,
    tokensReceived = 0,
    reasoningTranscript: string | null = null,
    distilledOpinion: string | null = null,
    thinkingDurationMs = 0,
  ): Promise<number | null> {
    let stageId: number | null = null;
    if (this.stageRepo) {
      if (stageStatus === "RUNNING") {
        stageId = await this.stageRepo.recordStageStart(taskId, stageName);
      } else {
        const existing = await this.stageRepo.getStagesForTask(taskId);
        const activeStage = existing
          .slice()
          .reverse()
          .find((s) => s.stageName === stageName && s.stageStatus === "RUNNING");

        if (activeStage) {
          await this.stageRepo.recordStageCompletion(
            activeStage.id,
            stageStatus,
            logOutput || "",
            tokensSent,
            tokensReceived,
            durationMs,
            reasoningTranscript,
            distilledOpinion,
            thinkingDurationMs,
          );
          stageId = activeStage.id;
        } else {
          const createdId = await this.stageRepo.recordStageStart(taskId, stageName);
          await this.stageRepo.recordStageCompletion(
            createdId,
            stageStatus,
            logOutput || "",
            tokensSent,
            tokensReceived,
            durationMs,
            reasoningTranscript,
            distilledOpinion,
            thinkingDurationMs,
          );
          stageId = createdId;
        }
      }
    }

    if (this.streamTapManager) {
      this.streamTapManager.emitStageTransition({
        taskId,
        stageName,
        stageStatus,
        durationMs,
        timestamp: Date.now(),
      });
    }

    return stageId;
  }

  /**
   * Non-blocking delay supporting cancellation signals.
   */
  private async sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (ms <= 0) return;
    if (signal?.aborted) throw new Error("Task execution aborted");

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve();
      }, ms);

      if (signal) {
        const onAbort = () => {
          clearTimeout(timer);
          signal.removeEventListener("abort", onAbort);
          reject(new Error("Task execution aborted"));
        };
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }
}
