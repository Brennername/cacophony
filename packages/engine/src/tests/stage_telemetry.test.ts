import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { AutonomousWorkerPipeline } from "../scheduler/AutonomousWorkerPipeline.js";
import { StreamTapManager, type StageTransitionEvent } from "../inference/StreamTapManager.js";
import type { OllamaProvider } from "../inference/OllamaProvider.js";
import type { ContextMinimizer } from "../inference/ContextMinimizer.js";
import type { SelfHealingParser } from "../inference/SelfHealingParser.js";
import type { RulePipelineEngine } from "../rules/RulePipelineEngine.js";
import type { StageRepository, TaskRepository } from "@cacophony/db";

test("T46.1: Stage Transition Telemetry & Broadcast Suite", async (t) => {
  await t.test("T46.1.4: Broadcasts stage transitions over StreamTapManager and records stage timings", async () => {
    const recordedEvents: StageTransitionEvent[] = [];
    const streamTap = new StreamTapManager();
    const untap = streamTap.tapStageTransitions((evt) => {
      recordedEvents.push(evt);
    });

    const stageStartRecords: Array<{ taskId: string; stageName: string }> = [];
    const stageCompletionRecords: Array<{
      id: number;
      status: string;
      logOutput: string;
      durationMs: number;
    }> = [];

    let nextStageId = 1;
    const stagesInDb: any[] = [];

    const mockStageRepo = {
      recordStageStart: async (taskId: string, stageName: string) => {
        const id = nextStageId++;
        stageStartRecords.push({ taskId, stageName });
        const record = { id, taskId, stageName, stageStatus: "RUNNING", durationMs: 0 };
        stagesInDb.push(record);
        return id;
      },
      recordStageCompletion: async (
        id: number,
        status: string,
        logOutput: string,
        _tokensSent: number,
        _tokensReceived: number,
        durationMs: number
      ) => {
        stageCompletionRecords.push({ id, status, logOutput, durationMs });
        const target = stagesInDb.find((s) => s.id === id);
        if (target) {
          target.stageStatus = status;
          target.durationMs = durationMs;
          target.logOutput = logOutput;
        }
      },
      getStagesForTask: async (taskId: string) => {
        return stagesInDb.filter((s) => s.taskId === taskId);
      }
    } as unknown as StageRepository;

    let updatedLogSnippet: string | null = null;
    const mockTaskRepo = {
      updateLogSnippet: async (_taskId: string, snippet: string) => {
        updatedLogSnippet = snippet;
      }
    } as unknown as TaskRepository;

    const mockProvider = {
      generate: async () => ({
        content: "```typescript\nexport const active = true;\n```",
        model: "qwen2.5-coder:7b",
        tokensPrompt: 12,
        tokensCompletion: 8,
        totalTokens: 20,
        latencyMs: 40,
        tokensPerSec: 200
      })
    } as unknown as OllamaProvider;

    const mockMinimizer = {
      assembleContext: () => ({
        prompt: "test",
        fileContents: new Map(),
        compactFileTree: "",
        assembledPrompt: "Assembled prompt"
      })
    } as unknown as ContextMinimizer;

    const mockParser = {
      executeWithSelfHealing: async () => ({
        code: "export const active = true;",
        attempts: 1,
        rawOutput: "```typescript\nexport const active = true;\n```",
        tokensPerSec: 200,
        tokensPrompt: 12,
        tokensCompletion: 8
      })
    } as unknown as SelfHealingParser;

    const mockRuleEngine = {
      executePipelineHook: async () => ({
        pipelineId: "pipeline_test",
        hook: "post_generation" as const,
        passed: true,
        durationMs: 2,
        totalRulesRun: 1,
        hardRejected: false,
        rejections: [],
        warnings: [],
        repairsApplied: [
          {
            filePath: "/tmp/sample.ts",
            originalContent: "export const active=false;",
            updatedContent: "export const active = true;",
            description: "Whitespace normalization"
          }
        ],
        ruleResults: []
      })
    } as unknown as RulePipelineEngine;

    const testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-test-"));
    const worker = new AutonomousWorkerPipeline({
      workspaceRoot: testWorkspace,
      ollamaProvider: mockProvider,
      contextMinimizer: mockMinimizer,
      parser: mockParser,
      ruleEngine: mockRuleEngine,
      streamTapManager: streamTap,
      stageRepository: mockStageRepo,
      taskRepository: mockTaskRepo
    });

    const success = await worker.executeTask(
      {
        task: {
          id: "task-telemetry-01",
          title: "Verify Stage Telemetry",
          prompt: "Export active boolean",
          role: "implementer",
          status: "RUNNING",
          priority: "P1",
          modelAssigned: null,
          testCommand: "node -e 'process.exit(0)'",
          focusFiles: null,
          targetBranch: null,
          prUrl: null,
          failureCount: 0,
          createdAt: "",
          updatedAt: "",
          completedAt: null
        },
        enrichedPrompt: "Export active boolean",
        focusFiles: ["packages/engine/src/sample.ts"],
        scopedTestCommand: "node -e 'process.exit(0)'",
        modified: false,
        groomNotes: [],
        stackProfile: {
          id: "typescript-nodenext",
          name: "TypeScript NodeNext",
          description: "TypeScript ESM",
          markers: [],
          directives: [],
          defaultTestRunner: "node --test"
        }
      },
      "qwen2.5-coder:7b"
    );

    assert.strictEqual(success, true);

    // Verify stage transition events were broadcast over SSE stream tap
    const stageNames = recordedEvents.map((e) => e.stageName);
    assert.ok(stageNames.includes("planning"), "Planning stage should be broadcast");
    assert.ok(stageNames.includes("generation"), "Generation stage should be broadcast");
    assert.ok(stageNames.includes("deterministic_scrub"), "Scrub stage should be broadcast");
    assert.ok(stageNames.includes("test_execution"), "Test execution stage should be broadcast");
    assert.ok(stageNames.includes("remediation"), "Review stage should be broadcast");
    assert.ok(stageNames.includes("pr_review"), "Merge stage should be broadcast");

    // Verify start and completion pairs
    const planningEvents = recordedEvents.filter((e) => e.stageName === "planning");
    assert.strictEqual(planningEvents.length, 2);
    assert.strictEqual(planningEvents[0]?.stageStatus, "RUNNING");
    assert.strictEqual(planningEvents[1]?.stageStatus, "SUCCESS");

    const genEvents = recordedEvents.filter((e) => e.stageName === "generation");
    assert.strictEqual(genEvents.length, 2);
    assert.strictEqual(genEvents[0]?.stageStatus, "RUNNING");
    assert.strictEqual(genEvents[1]?.stageStatus, "SUCCESS");

    // Verify code diff was generated and persisted to taskRepo
    assert.ok(updatedLogSnippet !== null, "Diff snippet must be updated on taskRepo");
    const snippetStr: string = updatedLogSnippet ?? "";
    assert.ok(snippetStr.includes("--- a/packages/engine/src/sample.ts"), "Unified diff must include file header");
    assert.ok(snippetStr.includes("+export const active = true;"), "Unified diff must include added lines");

    untap();
  });
});
