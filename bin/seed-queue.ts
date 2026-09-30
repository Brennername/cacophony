#!/usr/bin/env node
/**
 * bin/seed-queue.ts
 *
 * CLI command to enqueue uncompleted checklist items from docs/taskcade.md
 * into the Cacophony database queue or API daemon.
 *
 * Usage:
 *   node bin/seed-queue.js [--phase=46] [--limit=50] [--api=http://localhost:24161] [--dry-run]
 */

import { TaskcadeSeedLoader } from "../packages/engine/dist/scheduler/TaskcadeSeedLoader.js";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  const phaseArg = args.find((a) => a.startsWith("--phase="));
  const phaseFilter = phaseArg ? phaseArg.split("=")[1] : undefined;

  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1] || "50", 10) : 50;

  const apiArg = args.find((a) => a.startsWith("--api="));
  const apiUrl = apiArg ? apiArg.split("=")[1] : (process.env.CACOPHONY_API_URL || "http://127.0.0.1:24161");

  const shouldRequeueFailed = args.includes("--requeue-failed") || args.includes("--retry-failed");
  if (shouldRequeueFailed) {
    console.log(`[seed-queue] Requesting requeue of failed tasks from ${apiUrl}...`);
    try {
      const res = await fetch(`${apiUrl}/api/tasks/requeue`, { method: "POST" });
      const data = (await res.json()) as any;
      console.log(`[seed-queue] Requeued ${data.requeuedCount ?? 0} failed tasks back to PENDING.`);
    } catch (err) {
      console.warn(`[seed-queue] Warning: Could not requeue failed tasks:`, (err as Error).message);
    }
  }

  console.log(`[seed-queue] Reading uncompleted tasks from docs/taskcade.md...`);
  if (phaseFilter) {
    console.log(`[seed-queue] Filtering by phase: ${phaseFilter}`);
  }

  const fleetModels = [
    "deepseek-r1:8b",
    "qwen2.5-coder:7b-instruct-q4_K_M",
    "gemma3:4b-it-qat",
    "qwen2.5-coder:3b"
  ];

  const loader = new TaskcadeSeedLoader();
  const tasks = await loader.loadTasks({
    includeCompleted: false,
    phaseFilter,
    limit,
    fleetModels
  });

  console.log(`[seed-queue] Parsed ${tasks.length} uncompleted tasks from taskcade.`);

  if (isDryRun) {
    console.log(`[seed-queue] --dry-run specified. Previewing first 5 tasks:`);
    for (const t of tasks.slice(0, 5)) {
      console.log(`  - [${t.priority}] ${t.id}: ${t.title} (${t.role}) -> ${t.modelAssigned}`);
      if (t.focusFiles) console.log(`      Focus: ${t.focusFiles}`);
      if (t.testCommand) console.log(`      Test:  ${t.testCommand}`);
    }
    console.log(`[seed-queue] Dry run complete. No tasks were sent to database.`);
    return;
  }

  let enqueuedCount = 0;
  let skippedCount = 0;

  for (const task of tasks) {
    try {
      const response = await fetch(`${apiUrl}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          title: task.title,
          prompt: task.prompt,
          role: task.role,
          priority: task.priority,
          modelAssigned: task.modelAssigned,
          focusFiles: task.focusFiles,
          testCommand: task.testCommand
        })
      });

      if (response.status === 201 || response.status === 200) {
        enqueuedCount++;
      } else {
        skippedCount++;
      }
    } catch (err) {
      console.warn(`[seed-queue] Warning: Could not connect to ${apiUrl} for task ${task.id}:`, (err as Error).message);
      break;
    }
  }

  console.log(`[seed-queue] Finished: Enqueued ${enqueuedCount} tasks (${skippedCount} skipped/duplicates).`);
}

main().catch((err) => {
  console.error("[seed-queue] Execution failed:", err);
  process.exit(1);
});
