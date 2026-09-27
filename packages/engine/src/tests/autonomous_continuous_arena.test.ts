import test from "node:test";
import assert from "node:assert/strict";
import { TaskcadePlanningService } from "../inference/TaskcadePlanningService.js";
import { AutonomousWorkerPipeline } from "../scheduler/AutonomousWorkerPipeline.js";
import type { TaskRepository } from "@cacophony/db";
import type { OllamaProvider } from "../inference/OllamaProvider.js";
import type { ContextMinimizer } from "../inference/ContextMinimizer.js";
import type { SelfHealingParser } from "../inference/SelfHealingParser.js";
import type { RulePipelineEngine } from "../rules/RulePipelineEngine.js";

test("Phase 32: Autonomous Continuous Arena Engine & Self-Taskcade Grooming", async (t) => {
  await t.test("T32.1: TaskcadePlanningService replenishes queue when pending task count drops", async () => {
    const dbTasks: any[] = [];

    const mockTaskRepo = {
      listPending: async () => dbTasks.filter((t) => t.status === "PENDING"),
      create: async (task: any) => {
        dbTasks.push(task);
        return task;
      }
    } as unknown as TaskRepository;

    const planner = new TaskcadePlanningService({
      taskRepo: mockTaskRepo,
      initialBacklog: [
        {
          id: "epic-01",
          category: "performance",
          title: "Optimize Token Stream Serialization",
          description: "Enhance buffer chunking in StreamTapManager",
          priority: "P1"
        },
        {
          id: "epic-02",
          category: "resilience",
          title: "Implement APU Memory Watchdog Barrier",
          description: "Add timeout barrier for DRM memory reallocation",
          priority: "P0"
        }
      ]
    });

    assert.strictEqual(planner.getBacklog().length, 2);

    // Initial check: pending count is 0 (< minDepth 3), should replenish
    const res1 = await planner.replenishQueueIfLow({ minQueueDepth: 3 });
    assert.strictEqual(res1.replenished, true);
    assert.strictEqual(res1.tasksCreatedCount, 1);
    assert.strictEqual(planner.getBacklog().length, 1);
    assert.strictEqual(res1.currentPendingCount, 1);

    // Second check: pending count is 1 (< minDepth 3), should replenish next backlog item
    const res2 = await planner.replenishQueueIfLow({ minQueueDepth: 3 });
    assert.strictEqual(res2.replenished, true);
    assert.strictEqual(res2.tasksCreatedCount, 1);
    assert.strictEqual(planner.getBacklog().length, 0);
    assert.strictEqual(res2.currentPendingCount, 2);

    // Third check: backlog is now empty, should not replenish
    const res3 = await planner.replenishQueueIfLow({ minQueueDepth: 3 });
    assert.strictEqual(res3.replenished, false);
    assert.strictEqual(res3.tasksCreatedCount, 0);
  });

  await t.test("T32.2: AutonomousWorkerPipeline executes pipeline steps and tests", async () => {
    let contextAssembled = false;
    let ruleHookExecuted = false;

    const mockProvider = {
      generate: async () => ({
        content: "```typescript\nexport const buffer = 100;\n```",
        model: "qwen2.5-coder:7b",
        tokensPrompt: 10,
        tokensCompletion: 15,
        totalTokens: 25,
        latencyMs: 50,
        tokensPerSec: 300
      })
    } as unknown as OllamaProvider;

    const mockMinimizer = {
      assembleContext: () => {
        contextAssembled = true;
        return {
          prompt: "test",
          fileContents: new Map(),
          compactFileTree: "",
          assembledPrompt: "Assembled prompt"
        };
      }
    } as unknown as ContextMinimizer;

    const mockParser = {
      executeWithSelfHealing: async () => ({
        code: "export const buffer = 100;",
        attempts: 1,
        rawOutput: "```typescript\nexport const buffer = 100;\n```"
      })
    } as unknown as SelfHealingParser;

    const mockRuleEngine = {
      executePipelineHook: async () => {
        ruleHookExecuted = true;
        return {
          pipelineId: "pipeline_test",
          hook: "post_generation" as const,
          passed: true,
          durationMs: 1,
          totalRulesRun: 1,
          hardRejected: false,
          rejections: [],
          warnings: [],
          repairsApplied: [],
          ruleResults: []
        };
      }
    } as unknown as RulePipelineEngine;

    const worker = new AutonomousWorkerPipeline({
      workspaceRoot: "/tmp",
      ollamaProvider: mockProvider,
      contextMinimizer: mockMinimizer,
      parser: mockParser,
      ruleEngine: mockRuleEngine
    });

    const success = await worker.executeTask(
      {
        task: {
          id: "task-01",
          title: "Test Task",
          prompt: "Write buffer",
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
        enrichedPrompt: "Write buffer",
        focusFiles: [],
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

    assert.strictEqual(success.success, true);
    assert.strictEqual(contextAssembled, true);
    assert.strictEqual(ruleHookExecuted, false); // No focus files provided, skipped file write
  });
});


