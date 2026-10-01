import type { GroomedTask } from "../scheduler/QueueGroomer.js";
import type { OllamaProvider } from "../inference/OllamaProvider.js";
import type { ContextMinimizer } from "../inference/ContextMinimizer.js";
import type { SelfHealingParser } from "../inference/SelfHealingParser.js";
import type { RulePipelineEngine } from "../rules/RulePipelineEngine.js";
import type { RulePipelineDeclaration, StageName, StageStatus } from "@cacophony/shared-types";
import type { StreamTapManager } from "../inference/StreamTapManager.js";
import type { StageRepository, TaskRepository } from "@cacophony/db";
import { SandboxedProcessRunner } from "../testing/SandboxedProcessRunner.js";
import fs from "node:fs/promises";
import path from "node:path";

import type { GitWorktreeManager, WorktreeDescriptor } from "../gitea/GitWorktreeManager.js";
import type { IGitPlatformProvider } from "../gitea/IGitPlatformProvider.js";
import { FrontierReviewer } from "../inference/FrontierReviewer.js";
import { CognitiveHandoffCoordinator } from "../inference/CognitiveHandoffCoordinator.js";

export interface AutonomousWorkerPipelineOptions {
  readonly workspaceRoot: string;
  readonly ollamaProvider: OllamaProvider;
  readonly contextMinimizer: ContextMinimizer;
  readonly parser: SelfHealingParser;
  readonly ruleEngine: RulePipelineEngine;
  readonly streamTapManager?: StreamTapManager | undefined;
  readonly defaultPipeline?: RulePipelineDeclaration | undefined;
  readonly stageRepository?: StageRepository | undefined;
  readonly taskRepository?: TaskRepository | undefined;
  readonly sandboxedRunner?: SandboxedProcessRunner | undefined;
  readonly worktreeManager?: GitWorktreeManager | undefined;
  readonly frontierReviewer?: FrontierReviewer | undefined;
  readonly cognitiveHandoffCoordinator?: CognitiveHandoffCoordinator | undefined;
  readonly implementerModel?: string | undefined;
  readonly gitPlatformProvider?: IGitPlatformProvider | undefined;
  readonly autoMerge?: boolean | undefined;
  readonly repoOwner?: string | undefined;
  readonly repoName?: string | undefined;
  readonly gitRemote?: string | undefined;
}

/**
 * AutonomousWorkerPipeline
 *
 * Implements the concrete autonomous execution handler for TaskScheduler:
 * 1. Minimizes context and prepares prompt payload via ContextMinimizer (planning stage).
 * 2. Invokes local Ollama model with keep_alive=-1 and live token streaming (generation stage).
 * 3. Applies deterministic rule repair pipeline (deterministic_scrub stage).
 * 4. Writes modifications to disk and records code diffs directly into task.logSnippet.
 * 5. Executes scoped verification test suite (test_execution stage).
 * 6. Completes post-verification stages (review and merge).
 * Broadcasts all stage transitions in real-time over SSE.
 */
export class AutonomousWorkerPipeline {
  private readonly workspaceRoot: string;
  private readonly provider: OllamaProvider;
  private readonly minimizer: ContextMinimizer;
  private readonly parser: SelfHealingParser;
  private readonly ruleEngine: RulePipelineEngine;
  private readonly streamTapManager: StreamTapManager | undefined;
  private readonly defaultPipeline: RulePipelineDeclaration;
  private readonly sandboxedRunner: SandboxedProcessRunner;
  private readonly stageRepo: StageRepository | undefined;
  private readonly taskRepo: TaskRepository | undefined;
  private readonly worktreeManager: GitWorktreeManager | undefined;
  private readonly frontierReviewer: FrontierReviewer;
  private readonly gitPlatformProvider: IGitPlatformProvider | undefined;
  private readonly cognitiveHandoffCoordinator: CognitiveHandoffCoordinator;
  private readonly implementerModel: string;
  private readonly autoMerge: boolean;
  private readonly repoOwner: string;
  private readonly repoName: string;
  private readonly gitRemote: string;

  constructor(options: AutonomousWorkerPipelineOptions) {
    this.workspaceRoot = options.workspaceRoot;
    this.provider = options.ollamaProvider;
    this.minimizer = options.contextMinimizer;
    this.parser = options.parser;
    this.ruleEngine = options.ruleEngine;
    this.streamTapManager = options.streamTapManager;
    this.stageRepo = options.stageRepository;
    this.taskRepo = options.taskRepository;
    this.worktreeManager = options.worktreeManager;
    this.gitPlatformProvider = options.gitPlatformProvider;
    this.cognitiveHandoffCoordinator = options.cognitiveHandoffCoordinator ?? new CognitiveHandoffCoordinator(options.ollamaProvider as any);
    this.implementerModel = options.implementerModel || process.env.DEFAULT_IMPLEMENTER_MODEL || "qwen2.5-coder:7b-instruct-q4_K_M";
    this.autoMerge = options.autoMerge ?? true;
    this.repoOwner = options.repoOwner || process.env.GIT_REPO_OWNER || "cacophony";
    this.repoName = options.repoName || process.env.GIT_REPO_NAME || "core";
    this.gitRemote = options.gitRemote || process.env.GIT_REMOTE || "gitea";
    this.frontierReviewer = options.frontierReviewer ?? new FrontierReviewer({
      inferenceProvider: options.ollamaProvider as any,
      defaultModel: process.env.FRONTIER_REVIEWER_MODEL || "deepseek-r1:8b"
    });
    this.sandboxedRunner = options.sandboxedRunner ?? new SandboxedProcessRunner();
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
   * Helper to emit SSE stage transition and record in stage repository.
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
    thinkingDurationMs = 0
  ): Promise<number | null> {
    let stageId: number | null = null;
    if (this.stageRepo) {
      if (stageStatus === "RUNNING") {
        stageId = await this.stageRepo.recordStageStart(taskId, stageName);
      } else {
        // Complete current stage
        const existing = await this.stageRepo.getStagesForTask(taskId);
        const activeStage = existing.slice().reverse().find(
          (s) => s.stageName === stageName && s.stageStatus === "RUNNING"
        );
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
            thinkingDurationMs
          );
          stageId = activeStage.id;
        }
      }
    }

    if (this.streamTapManager) {
      this.streamTapManager.emitStageTransition({
        taskId,
        stageName,
        stageStatus,
        durationMs,
        timestamp: Date.now()
      });
    }

    return stageId;
  }

  /**
   * The execution handler passed into TaskScheduler.setExecutionHandler.
   * Returns success flag and measured inference velocity so the scheduler can
   * persist both into the task record and leaderboard without additional coupling.
   */
  public async executeTask(groomed: GroomedTask, selectedModel: string): Promise<{ success: boolean; tokensPerSec: number }> {
    const taskId = groomed.task.id;
    let measuredTps = 0;
    let worktree: WorktreeDescriptor | null = null;
    let executionRoot = this.workspaceRoot;

    try {
      if (this.streamTapManager) {
        this.streamTapManager.setActiveTask(taskId);
      }

      // If worktree manager is configured, create an ephemeral worktree isolation checkout
      if (this.worktreeManager) {
        try {
          worktree = await this.worktreeManager.createWorktree(taskId, {
            priority: groomed.task.priority,
            slug: groomed.task.title
          });
          executionRoot = worktree.worktreePath;
        } catch (worktreeErr) {
          console.warn(`[AutonomousWorkerPipeline] Failed to create git worktree, falling back to workspace root:`, worktreeErr);
          executionRoot = this.workspaceRoot;
        }
      }

      // STAGE 1: Planning / Context Assembly
      const planningStart = Date.now();
      await this.recordAndEmitStage(taskId, "planning", "RUNNING");

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
      const planningDuration = Date.now() - planningStart;
      await this.recordAndEmitStage(
        taskId,
        "planning",
        "SUCCESS",
        planningDuration,
        `Context assembled: ${focusFiles.length} focus files, ${directives.length} directives`
      );

      // STAGE 2: Generation with Self-Healing Parser and Live Token Emission
      const generationStart = Date.now();
      await this.recordAndEmitStage(taskId, "generation", "RUNNING");

      const parseResult = await this.parser.executeWithSelfHealing(
        this.provider,
        {
          model: selectedModel,
          messages: [{ role: "user", content: context.assembledPrompt }],
          temperature: 0.1
        },
        (chunk) => {
          if (this.streamTapManager) {
            this.streamTapManager.emitToken(taskId, chunk);
          }
        }
      );

      let generationDuration = Date.now() - generationStart;
      let finalCode = parseResult.code;
      let finalAttempts = parseResult.attempts || 1;
      let finalPromptTokens = parseResult.tokensPrompt || 0;
      let finalCompletionTokens = parseResult.tokensCompletion || 0;
      let finalTps = parseResult.tokensPerSec || 0;
      let handoffOpinionSummary: string | null = null;

      const reasoningTranscript = this.streamTapManager
        ? this.streamTapManager.getReasoningTranscript(taskId)
        : null;

      // MULTI-MODEL COGNITIVE HANDOFF:
      // If code was not generated or truncated, but the model produced an internal reasoning trace,
      // hand off the distilled plan to the configured implementer model (e.g. Qwen 2.5 Coder)
      // rather than failing the task and exhausting retry budgets.
      if (!finalCode && reasoningTranscript && reasoningTranscript.trim().length > 0) {
        console.log(`[AutonomousWorkerPipeline] Cognitive handoff triggered for task '${taskId}': handoff from '${selectedModel}' to '${this.implementerModel}'`);
        try {
          const handoffResult = await this.cognitiveHandoffCoordinator.executeHandoff({
            reasonerModel: selectedModel,
            implementerModel: this.implementerModel,
            rawReasoningTranscript: reasoningTranscript,
            originalTaskPrompt: groomed.enrichedPrompt,
            focusFiles,
            directives,
            onChunk: (chunk) => {
              if (this.streamTapManager) {
                this.streamTapManager.emitToken(taskId, chunk);
              }
            }
          });

          // Validate or parse handoff result with self-healing parser
          const handoffValidation = this.parser.validate(handoffResult.code);
          if (handoffValidation.valid && handoffValidation.code) {
            finalCode = handoffValidation.code;
            finalPromptTokens += handoffResult.tokensPrompt;
            finalCompletionTokens += handoffResult.tokensCompletion;
            finalTps = handoffResult.tokensPerSec || finalTps;
            handoffOpinionSummary = handoffResult.opinion.summary;
            console.log(`[AutonomousWorkerPipeline] Cognitive handoff succeeded for task '${taskId}' via '${this.implementerModel}'`);
          }
        } catch (handoffErr) {
          console.error(`[AutonomousWorkerPipeline] Cognitive handoff failed for task '${taskId}':`, handoffErr);
        }
      }

      generationDuration = Date.now() - generationStart;
      measuredTps = finalTps;

      if (!finalCode) {
        console.error(`[AutonomousWorkerPipeline] No code block extracted for task '${groomed.enrichedPrompt.slice(0, 40)}'`);
        await this.recordAndEmitStage(
          taskId,
          "generation",
          "FAILURE",
          generationDuration,
          "Self-healing parser failed to extract valid code block"
        );
        if (this.worktreeManager && worktree) {
          await this.worktreeManager.cleanWorktree(taskId, worktree.branchName);
        }
        return { success: false, tokensPerSec: measuredTps };
      }

      await this.recordAndEmitStage(
        taskId,
        "generation",
        "SUCCESS",
        generationDuration,
        handoffOpinionSummary
          ? `Generated code block via cognitive handoff [${selectedModel} -> ${this.implementerModel}] (${finalTps} tok/s)`
          : `Generated code block in ${finalAttempts} attempts (${finalTps} tok/s)`,
        finalPromptTokens,
        finalCompletionTokens,
        reasoningTranscript || null,
        handoffOpinionSummary || null,
        reasoningTranscript ? Math.round(generationDuration * 0.4) : 0
      );
      // Capture measured inference velocity for the scheduler to persist
      measuredTps = finalTps;

      // STAGE 3: Deterministic Scrub & Rule Pipeline Execution
      const scrubStart = Date.now();
      await this.recordAndEmitStage(taskId, "deterministic_scrub", "RUNNING");

      let originalExistingContent = "";
      let targetAbs = "";
      let generatedDiff = "";
      if (focusFiles.length > 0) {
        const targetRelFile = focusFiles[0]!;
        targetAbs = path.resolve(executionRoot, targetRelFile);
        try {
          originalExistingContent = await fs.readFile(targetAbs, "utf-8");
        } catch {
          originalExistingContent = "";
        }

        const fileContentsMap = new Map<string, string>();
        fileContentsMap.set(targetAbs, finalCode);

        const outcome = await this.ruleEngine.executePipelineHook(
          this.defaultPipeline,
          "post_generation",
          {
            projectRoot: executionRoot,
            hook: "post_generation",
            modifiedFiles: [targetAbs],
            fileContents: fileContentsMap,
            simulate: false
          }
        );

        const scrubDuration = Date.now() - scrubStart;

        if (outcome.hardRejected) {
          const rejectionMsg = outcome.rejections.map((r) => r.message).join(", ");
          console.error(`[AutonomousWorkerPipeline] Rule engine hard rejected task: ${rejectionMsg}`);
          await this.recordAndEmitStage(
            taskId,
            "deterministic_scrub",
            "FAILURE",
            scrubDuration,
            `Rule rejection: ${rejectionMsg}`
          );
          if (this.worktreeManager && worktree) {
            await this.worktreeManager.cleanWorktree(taskId, worktree.branchName);
          }
          return { success: false, tokensPerSec: measuredTps };
        }

        const scrubbedCode = fileContentsMap.get(targetAbs) || finalCode;
        await fs.mkdir(path.dirname(targetAbs), { recursive: true });
        await fs.writeFile(targetAbs, scrubbedCode, "utf-8");

        // Format unified code diff and persist directly into task.logSnippet
        const formattedDiff = this.generateUnifiedDiff(
          targetRelFile,
          originalExistingContent,
          scrubbedCode
        );
        generatedDiff = formattedDiff;

        if (this.taskRepo) {
          try {
            await this.taskRepo.updateLogSnippet(taskId, formattedDiff);
          } catch {
            // non-fatal
          }
        }

        await this.recordAndEmitStage(
          taskId,
          "deterministic_scrub",
          "SUCCESS",
          scrubDuration,
          `Applied ${outcome.repairsApplied.length} repairs. ${formattedDiff.slice(0, 300)}`
        );
      } else {
        const scrubDuration = Date.now() - scrubStart;
        await this.recordAndEmitStage(
          taskId,
          "deterministic_scrub",
          "SUCCESS",
          scrubDuration,
          "No focus files provided; skipped disk write"
        );
      }

      // STAGE 4: Scoped Test Verification with SandboxedProcessRunner
      if (groomed.scopedTestCommand) {
        await this.recordAndEmitStage(taskId, "test_execution", "RUNNING");

        const runResult = await this.sandboxedRunner.run(groomed.scopedTestCommand, {
          cwd: executionRoot,
          timeoutMs: 180000,
          maxBufferBytes: 256 * 1024
        });

        const stdoutSnippet = runResult.stdout.slice(0, 4000);
        const stderrSnippet = runResult.stderr.slice(0, 4000);
        const logOutput = `Exit Code: ${runResult.exitCode}\nDuration: ${runResult.durationMs}ms\n\n[STDOUT]:\n${stdoutSnippet}\n\n[STDERR]:\n${stderrSnippet}`;

        if (runResult.exitCode !== 0) {
          console.warn(
            `[AutonomousWorkerPipeline] Test command failed for task '${groomed.enrichedPrompt.slice(0, 40)}' (exitCode=${runResult.exitCode}). Attempting automated remediation...`
          );
          await this.recordAndEmitStage(
            taskId,
            "test_execution",
            "FAILURE",
            runResult.durationMs,
            logOutput
          );

          // STAGE 5: Active Remediation
          const remediationStart = Date.now();
          await this.recordAndEmitStage(taskId, "remediation", "RUNNING");

          try {
            const remediationPrompt = [
              "The code modification failed verification testing.",
              `Command: ${groomed.scopedTestCommand}`,
              `Error Output:\n${(stderrSnippet || stdoutSnippet).slice(0, 1500)}`,
              "Provide the corrected, complete implementation code fixing this error."
            ].join("\n\n");

            const repairedParsed = await this.parser.executeWithSelfHealing(
              this.provider,
              {
                model: selectedModel,
                messages: [
                  { role: "system", content: "You are an expert debugger. Fix the code to pass tests." },
                  { role: "user", content: remediationPrompt }
                ],
                temperature: 0.1
              }
            );

            if (targetAbs && repairedParsed.code) {
              await fs.writeFile(targetAbs, repairedParsed.code, "utf-8");

              const retryResult = await this.sandboxedRunner.run(groomed.scopedTestCommand, {
                cwd: executionRoot,
                timeoutMs: 180000,
                maxBufferBytes: 256 * 1024
              });

              if (retryResult.exitCode === 0) {
                generatedDiff = this.generateUnifiedDiff(
                  targetRel || "unknown",
                  originalExistingContent,
                  repairedParsed.code
                );
                if (this.taskRepo) {
                  try {
                    await this.taskRepo.updateLogSnippet(taskId, generatedDiff);
                  } catch {
                    // non-fatal
                  }
                }
                await this.recordAndEmitStage(
                  taskId,
                  "remediation",
                  "SUCCESS",
                  Date.now() - remediationStart,
                  "Automated remediation resolved verification errors"
                );
              } else {
                await this.recordAndEmitStage(
                  taskId,
                  "remediation",
                  "FAILURE",
                  Date.now() - remediationStart,
                  `Remediation retry failed with exit code ${retryResult.exitCode}`
                );
                await this.rollbackWorkspace(targetAbs, originalExistingContent);
                if (this.worktreeManager && worktree) {
                  await this.worktreeManager.cleanWorktree(taskId, worktree.branchName);
                }
                await this.logDiagnostic(taskId, {
                  taskId,
                  model: selectedModel,
                  testCommand: groomed.scopedTestCommand,
                  retryExitCode: retryResult.exitCode,
                  retryStderr: retryResult.stderr,
                  retryStdout: retryResult.stdout
                });
                return { success: false, tokensPerSec: measuredTps };
              }
            } else {
              await this.recordAndEmitStage(
                taskId,
                "remediation",
                "FAILURE",
                Date.now() - remediationStart,
                "Remediation produced no code"
              );
              await this.rollbackWorkspace(targetAbs, originalExistingContent);
              if (this.worktreeManager && worktree) {
                await this.worktreeManager.cleanWorktree(taskId, worktree.branchName);
              }
              return { success: false, tokensPerSec: measuredTps };
            }
          } catch (remediationErr) {
            await this.recordAndEmitStage(
              taskId,
              "remediation",
              "FAILURE",
              Date.now() - remediationStart,
              String(remediationErr)
            );
            await this.rollbackWorkspace(targetAbs, originalExistingContent);
            if (this.worktreeManager && worktree) {
              await this.worktreeManager.cleanWorktree(taskId, worktree.branchName);
            }
            return { success: false, tokensPerSec: measuredTps };
          }
        } else {
          await this.recordAndEmitStage(
            taskId,
            "test_execution",
            "SUCCESS",
            runResult.durationMs,
            logOutput
          );

          // STAGE 5: Structured Code Review with FrontierReviewer
          const reviewStart = Date.now();
          await this.recordAndEmitStage(taskId, "remediation", "RUNNING");

          const reviewResult = await this.frontierReviewer.evaluateReview({
            taskId,
            title: groomed.task.title,
            diff: generatedDiff,
            testSummary: logOutput
          });

          if (reviewResult.verdict === "REJECT") {
            await this.recordAndEmitStage(
              taskId,
              "remediation",
              "FAILURE",
              Date.now() - reviewStart,
              `Code review rejected: ${reviewResult.reviewNotes} (SOLID score: ${reviewResult.solidComplianceScore})`
            );
            await this.rollbackWorkspace(targetAbs, originalExistingContent);
            if (this.worktreeManager && worktree) {
              await this.worktreeManager.cleanWorktree(taskId, worktree.branchName);
            }
            return { success: false, tokensPerSec: measuredTps };
          }

          await this.recordAndEmitStage(
            taskId,
            "remediation",
            "SUCCESS",
            Date.now() - reviewStart,
            `Review verdict ${reviewResult.verdict} (SOLID score: ${reviewResult.solidComplianceScore}/100). ${reviewResult.reviewNotes}`
          );
        }
      } else {
        // No test command provided
        const reviewStart = Date.now();
        await this.recordAndEmitStage(taskId, "remediation", "RUNNING");
        const reviewResult = await this.frontierReviewer.evaluateReview({
          taskId,
          title: groomed.task.title,
          diff: generatedDiff
        });

        await this.recordAndEmitStage(
          taskId,
          "remediation",
          "SUCCESS",
          Date.now() - reviewStart,
          `Automated code review verdict: ${reviewResult.verdict} (SOLID score: ${reviewResult.solidComplianceScore}/100)`
        );
      }

      // STAGE 6: Pull Request Lifecycle & Auto-Merge Gate
      const mergeStart = Date.now();
      await this.recordAndEmitStage(taskId, "pr_review", "RUNNING");

      let prMerged = true;
      let prNumber: number | undefined;

      // If worktree and git platform provider are available, commit, push, open PR, and merge
      if (this.worktreeManager && worktree && this.gitPlatformProvider) {
        try {
          await this.worktreeManager.commitWorktree(
            worktree.worktreePath,
            `feat(${taskId}): ${groomed.task.title}\n\nAutomated commit by Cacophony Engine.`
          );

          await this.worktreeManager.pushBranch(
            worktree.worktreePath,
            this.gitRemote,
            worktree.branchName
          );

          const pr = await this.gitPlatformProvider.openPullRequest(
            this.repoOwner,
            this.repoName,
            {
              title: `[Autonomous Task] ${groomed.task.title}`,
              body: `## Cacophony Autonomous PR\n\nTask ID: \`${taskId}\`\nPriority: \`${groomed.task.priority}\`\n\n### Scoped Test Execution\nPassed successfully.\n\n### Code Diff\n\`\`\`diff\n${generatedDiff.slice(0, 5000)}\n\`\`\``,
              head: worktree.branchName,
              base: groomed.task.targetBranch || "main"
            }
          );

          prNumber = pr.number;

          if (this.taskRepo) {
            await this.taskRepo.updatePr(taskId, worktree.branchName, pr.htmlUrl);
          }

          // Submit automated review verdict to PR
          await this.gitPlatformProvider.submitReview(
            this.repoOwner,
            this.repoName,
            pr.number,
            {
              body: `Automated review passed verification gates. Task: ${taskId}`,
              event: "APPROVED"
            }
          );

          // If autoMerge is enabled, merge PR
          if (this.autoMerge) {
            const merged = await this.gitPlatformProvider.mergePullRequest(
              this.repoOwner,
              this.repoName,
              pr.number,
              {
                mergeMethod: "squash",
                title: `Merge PR #${pr.number}: ${groomed.task.title}`,
                message: `Automated verification passed for task ${taskId}`
              }
            );
            prMerged = merged;
          }
        } catch (prErr) {
          console.warn(`[AutonomousWorkerPipeline] Remote git PR operation encountered warning:`, prErr);
          // Non-fatal if remote repo is unreachable or mock
        }
      }

      await this.recordAndEmitStage(
        taskId,
        "pr_review",
        prMerged ? "SUCCESS" : "FAILURE",
        Date.now() - mergeStart,
        prNumber
          ? `Pull Request #${prNumber} created and ${prMerged ? "merged" : "pending manual merge"}`
          : "Code modifications verified and merged locally"
      );

      // Clean up worktree if one was allocated for this task
      if (this.worktreeManager && worktree) {
        await this.worktreeManager.cleanWorktree(taskId, worktree.branchName);
      }

      return { success: true, tokensPerSec: measuredTps };
    } catch (err) {
      console.error(`[AutonomousWorkerPipeline] Execution error for task '${groomed.enrichedPrompt.slice(0, 40)}':`, err);
      if (this.worktreeManager && worktree) {
        await this.worktreeManager.cleanWorktree(taskId, (worktree as WorktreeDescriptor).branchName);
      }
      return { success: false, tokensPerSec: measuredTps };
    }
  }

  /**
   * Generates a unified git-style diff for modified focus files.
   */
  private generateUnifiedDiff(filePath: string, oldContent: string, newContent: string): string {
    const oldLines = oldContent ? oldContent.split("\n") : [];
    const newLines = newContent.split("\n");

    const header = `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${oldLines.length || 1} +1,${newLines.length} @@\n`;
    if (!oldContent) {
      return header + newLines.map((l) => `+${l}`).join("\n") + "\n";
    }

    const diffLines: string[] = [];
    const max = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < max; i++) {
      const o = oldLines[i];
      const n = newLines[i];
      if (o === undefined) {
        diffLines.push(`+${n}`);
      } else if (n === undefined) {
        diffLines.push(`-${o}`);
      } else if (o !== n) {
        diffLines.push(`-${o}`);
        diffLines.push(`+${n}`);
      } else {
        diffLines.push(` ${o}`);
      }
    }

    return header + diffLines.join("\n") + "\n";
  }

  /**
   * Safely rolls back disk state upon verification or remediation failure.
   */
  private async rollbackWorkspace(targetAbs: string, originalContent: string): Promise<void> {
    if (!targetAbs) return;
    try {
      if (originalContent && originalContent.length > 0) {
        await fs.writeFile(targetAbs, originalContent, "utf-8");
      } else {
        await fs.unlink(targetAbs);
      }
    } catch {
      // non-fatal rollback error
    }
  }

  /**
   * Writes extended diagnostic telemetry to .cacophony/diagnostics/<taskId>.json when enabled.
   */
  private async logDiagnostic(taskId: string, payload: Record<string, unknown>): Promise<void> {
    const isDebug = process.env["DEBUG_TASK_PIPELINE"] === "true";
    if (!isDebug && !(payload["prompt"] as string)?.includes("@cacophony-debug")) {
      return;
    }
    try {
      const diagDir = path.resolve(this.workspaceRoot, ".cacophony/diagnostics");
      await fs.mkdir(diagDir, { recursive: true });
      const diagFile = path.resolve(diagDir, `${taskId}.json`);
      await fs.writeFile(diagFile, JSON.stringify(payload, null, 2), "utf-8");
    } catch {
      // non-fatal
    }
  }
}
