import test from "node:test";
import assert from "node:assert/strict";
import { AutonomousWorkerPipeline } from "../scheduler/AutonomousWorkerPipeline.js";
import type {
  TaskRepository,
  StageRepository,
  ModelHealthRepository,
} from "@cacophony/db";
import type { OllamaProvider } from "../inference/OllamaProvider.js";
import type { ContextMinimizer } from "../inference/ContextMinimizer.js";
import type { SelfHealingParser } from "../inference/SelfHealingParser.js";
import type { RulePipelineEngine } from "../rules/RulePipelineEngine.js";
import { SandboxedProcessRunner } from "../testing/SandboxedProcessRunner.js";

test("Phase 63: Remediation Circuit Breaker & 2-Attempt Ceiling Test Suite (T63.4)", async (t) => {
  await t.test(
    "T63.4.1 - T63.4.4: Halts remediation after max 2 attempts and records REMEDIATION_EXHAUSTED",
    async () => {
      let remediationCount = 0;
      let recordedFailureReason: string | null = null;
      let modelHealthRecordedSuccess: boolean | null = null;
      const stagesEmitted: {
        stageName: string;
        stageStatus: string;
        logOutput?: string | undefined;
      }[] = [];

      const mockProvider = {
        generate: async () => {
          remediationCount++;
          return {
            content: "```typescript\nexport const x = 1;\n```",
            model: "qwen2.5-coder:7b",
            tokensPrompt: 20,
            tokensCompletion: 20,
            totalTokens: 40,
            latencyMs: 100,
            tokensPerSec: 200,
          };
        },
      } as unknown as OllamaProvider;

      const mockMinimizer = {
        assembleContext: () => ({
          prompt: "Fix failing test",
          fileContents: new Map(),
          compactFileTree: "",
          assembledPrompt: "Assembled prompt",
        }),
      } as unknown as ContextMinimizer;

      const mockParser = {
        executeWithSelfHealing: async () => ({
          code: "export const x = 1;",
          attempts: 1,
          rawOutput: "```typescript\nexport const x = 1;\n```",
        }),
      } as unknown as SelfHealingParser;

      const mockRuleEngine = {
        executePipelineHook: async () => ({
          pipelineId: "pipeline_test",
          hook: "post_generation" as const,
          passed: true,
          durationMs: 1,
          totalRulesRun: 1,
          hardRejected: false,
          rejections: [],
          warnings: [],
          repairsApplied: [],
          ruleResults: [],
        }),
      } as unknown as RulePipelineEngine;

      // Sandboxed runner that always fails with exitCode 1
      let runnerInvocations = 0;
      const mockRunner = {
        run: async (cmd: string) => {
          runnerInvocations++;
          return {
            command: cmd,
            exitCode: 1,
            stdout: `Test run ${runnerInvocations} failed assertion`,
            stderr: `AssertionError: expected true to be false [run ${runnerInvocations}]`,
            durationMs: 50,
            timedOut: false,
            killed: false,
          };
        },
      } as unknown as SandboxedProcessRunner;

      const mockTaskRepo = {
        updateStatus: async () => {},
        updateLogSnippet: async () => {},
        updateFailureReason: async (_id: string, reason: string) => {
          recordedFailureReason = reason;
        },
      } as unknown as TaskRepository;

      const mockStageRepo = {
        recordStageStart: async () => 1,
        recordStageCompletion: async (
          _stageId: number,
          status: string,
          logSnippet?: string,
        ) => {
          stagesEmitted.push({
            stageName: "remediation",
            stageStatus: status,
            logOutput: logSnippet,
          });
        },
        getStagesForTask: async () => [],
      } as unknown as StageRepository;

      const mockModelHealthRepo = {
        recordRemediation: async (_modelId: string, success: boolean) => {
          modelHealthRecordedSuccess = success;
          return {} as any;
        },
      } as unknown as ModelHealthRepository;

      const worker = new AutonomousWorkerPipeline({
        workspaceRoot: "/tmp",
        ollamaProvider: mockProvider,
        contextMinimizer: mockMinimizer,
        parser: mockParser,
        ruleEngine: mockRuleEngine,
        sandboxedRunner: mockRunner,
        taskRepository: mockTaskRepo,
        stageRepository: mockStageRepo,
        modelHealthRepository: mockModelHealthRepo,
        maxRemediationAttempts: 2,
      });

      const result = await worker.executeTask(
        {
          task: {
            id: "task-circuit-breaker-001",
            title: "Circuit Breaker Target Task",
            prompt: "Implement resilient arithmetic",
            role: "implementer",
            status: "RUNNING",
            priority: "P1",
            modelAssigned: null,
            testCommand: "npm test",
            focusFiles: null,
            targetBranch: null,
            prUrl: null,
            failureCount: 0,
            createdAt: "",
            updatedAt: "",
            completedAt: null,
          },
          enrichedPrompt: "Implement resilient arithmetic",
          focusFiles: [],
          scopedTestCommand: "npm test",
          modified: false,
          groomNotes: [],
          stackProfile: {
            id: "typescript-nodenext",
            name: "TypeScript NodeNext",
            description: "TypeScript ESM",
            markers: [],
            directives: [],
            defaultTestRunner: "node --test",
          },
        },
        "qwen2.5-coder:7b",
      );

      // Pipeline should return failure
      assert.strictEqual(result.success, false);

      // Remediation attempts must be strictly capped at 2
      assert.ok(
        remediationCount <= 2,
        `Remediation attempts (${remediationCount}) exceeded ceiling of 2`,
      );

      // Failure reason must be REMEDIATION_EXHAUSTED
      assert.strictEqual(recordedFailureReason, "REMEDIATION_EXHAUSTED");

      // Model health repository must have recorded a remediation failure
      assert.strictEqual(modelHealthRecordedSuccess, false);
    },
  );
});
