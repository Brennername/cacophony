import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { GitWorktreeManager } from "../gitea/GitWorktreeManager.js";
import { AutonomousWorkerPipeline } from "../scheduler/AutonomousWorkerPipeline.js";
import type { OllamaProvider } from "../inference/OllamaProvider.js";
import type { ContextMinimizer } from "../inference/ContextMinimizer.js";
import type { SelfHealingParser } from "../inference/SelfHealingParser.js";
import type { RulePipelineEngine } from "../rules/RulePipelineEngine.js";

const execAsync = promisify(exec);

test("Phase 78: T78.2 Ephemeral Git Worktree Isolation", async (t) => {
  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-worktree-test-"));
  const repoDir = path.join(tmpBase, "repo");
  const workspacesDir = path.join(tmpBase, "workspaces");

  await fs.mkdir(repoDir, { recursive: true });
  await fs.mkdir(workspacesDir, { recursive: true });

  // Initialize a real git repository
  await execAsync("git init -b main", { cwd: repoDir });
  await execAsync('git config user.name "Cacophony Engine"', { cwd: repoDir });
  await execAsync('git config user.email "engine@cacophony.local"', { cwd: repoDir });

  // Create initial commit
  const initialFilePath = path.join(repoDir, "README.md");
  await fs.writeFile(initialFilePath, "# Main Repository Content\n", "utf-8");
  await execAsync("git add -A && git commit -m 'Initial commit'", { cwd: repoDir });

  const worktreeManager = new GitWorktreeManager(repoDir, workspacesDir);

  await t.test("T78.2.1: GitWorktreeManager creates isolated worktrees on ephemeral task branches", async () => {
    const descriptor = await worktreeManager.createWorktree("task-test-01", {
      priority: "P0",
      slug: "isolate-feature"
    });

    assert.strictEqual(descriptor.taskId, "task-test-01");
    assert.match(descriptor.branchName, /^task\/p0-task-test-01-isolate-feature/);
    assert.strictEqual(descriptor.worktreePath, path.join(workspacesDir, "worktree-task-test-01"));

    // Verify directory exists and contains README.md from main branch
    const exists = await fs.stat(descriptor.worktreePath).then(() => true).catch(() => false);
    assert.strictEqual(exists, true);

    const worktreeReadme = await fs.readFile(path.join(descriptor.worktreePath, "README.md"), "utf-8");
    assert.strictEqual(worktreeReadme, "# Main Repository Content\n");

    // Clean up
    await worktreeManager.cleanWorktree("task-test-01", descriptor.branchName);
    const cleaned = await fs.stat(descriptor.worktreePath).then(() => true).catch(() => false);
    assert.strictEqual(cleaned, false);
  });

  await t.test("T78.2.2: AutonomousWorkerPipeline executes inside worktree without modifying repository root", async () => {
    const mockProvider = {
      generate: async () => ({
        content: "```typescript\nexport const modified = true;\n```",
        model: "qwen2.5-coder:7b",
        tokensPrompt: 10,
        tokensCompletion: 15,
        totalTokens: 25,
        latencyMs: 50,
        tokensPerSec: 300
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
        code: "export const modified = true;",
        attempts: 1,
        rawOutput: "```typescript\nexport const modified = true;\n```"
      })
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
        ruleResults: []
      })
    } as unknown as RulePipelineEngine;

    const worker = new AutonomousWorkerPipeline({
      workspaceRoot: repoDir,
      ollamaProvider: mockProvider,
      contextMinimizer: mockMinimizer,
      parser: mockParser,
      ruleEngine: mockRuleEngine,
      worktreeManager
    });

    const targetFile = "src/feature.ts";
    const result = await worker.executeTask(
      {
        task: {
          id: "task-test-pipeline",
          title: "Feature Isolation Test",
          prompt: "Write feature",
          role: "implementer",
          status: "RUNNING",
          priority: "P1",
          modelAssigned: null,
          testCommand: "node -e 'process.exit(0)'",
          focusFiles: targetFile,
          targetBranch: null,
          prUrl: null,
          failureCount: 0,
          createdAt: "",
          updatedAt: "",
          completedAt: null
        },
        enrichedPrompt: "Write feature",
        focusFiles: [targetFile],
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

    assert.strictEqual(result.success, true);

    // Verify main repository root was NOT modified
    const rootTargetExists = await fs.stat(path.join(repoDir, targetFile)).then(() => true).catch(() => false);
    assert.strictEqual(rootTargetExists, false, "Main repo root should remain clean");

    // Verify worktree directory was cleaned up
    const worktreePath = path.join(workspacesDir, "worktree-task-test-pipeline");
    const worktreeExists = await fs.stat(worktreePath).then(() => true).catch(() => false);
    assert.strictEqual(worktreeExists, false, "Ephemeral worktree must be removed after task completes");
  });

  await t.test("T78.2.4: Concurrent task worktrees operate in isolated directories without conflict", async () => {
    const descA = await worktreeManager.createWorktree("task-concurrent-a", {
      priority: "P0",
      slug: "concurrent-a"
    });
    const descB = await worktreeManager.createWorktree("task-concurrent-b", {
      priority: "P1",
      slug: "concurrent-b"
    });

    assert.notStrictEqual(descA.worktreePath, descB.worktreePath);
    assert.notStrictEqual(descA.branchName, descB.branchName);

    // Write file in A
    const fileA = path.join(descA.worktreePath, "common.txt");
    await fs.writeFile(fileA, "Content for A\n", "utf-8");

    // Write different content in B for the same relative path
    const fileB = path.join(descB.worktreePath, "common.txt");
    await fs.writeFile(fileB, "Content for B\n", "utf-8");

    const contentA = await fs.readFile(fileA, "utf-8");
    const contentB = await fs.readFile(fileB, "utf-8");

    assert.strictEqual(contentA, "Content for A\n");
    assert.strictEqual(contentB, "Content for B\n");

    // Commit in both
    await worktreeManager.commitWorktree(descA.worktreePath, "commit A");
    await worktreeManager.commitWorktree(descB.worktreePath, "commit B");

    // Clean both
    await worktreeManager.cleanWorktree("task-concurrent-a", descA.branchName);
    await worktreeManager.cleanWorktree("task-concurrent-b", descB.branchName);

    const existsA = await fs.stat(descA.worktreePath).then(() => true).catch(() => false);
    const existsB = await fs.stat(descB.worktreePath).then(() => true).catch(() => false);
    assert.strictEqual(existsA, false);
    assert.strictEqual(existsB, false);
  });

  // Cleanup temp test base
  try {
    await fs.rm(tmpBase, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
