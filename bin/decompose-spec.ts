#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { ProjectSpecIngestionService } from "../packages/engine/src/inference/ProjectSpecIngestionService.js";
import { AcceptanceCriteriaEngine } from "../packages/engine/src/inference/AcceptanceCriteriaEngine.js";
import { DependencyGraphSequencer } from "../packages/engine/src/inference/DependencyGraphSequencer.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filePathArg = args.find((a) => !a.startsWith("--"));

  if (!filePathArg) {
    console.error("Usage: node bin/decompose-spec.ts <path-to-spec.md> [--dry-run]");
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), filePathArg);
  console.log(`[DecomposeSpec] Ingesting specification from: ${resolvedPath}`);

  const ingestion = new ProjectSpecIngestionService();
  const criteriaEngine = new AcceptanceCriteriaEngine();
  const sequencer = new DependencyGraphSequencer();

  const specDoc = await ingestion.ingestFile(resolvedPath);
  console.log(`[DecomposeSpec] Document: "${specDoc.title}"`);
  console.log(`[DecomposeSpec] Requirements parsed: ${specDoc.requirements.length}`);
  console.log(`[DecomposeSpec] API Endpoints: ${specDoc.apiEndpoints.length}`);
  console.log(`[DecomposeSpec] Technical Constraints: ${specDoc.technicalConstraints.join("; ") || "None"}`);

  const rawTasks: any[] = [];
  let idx = 1;
  for (const reqNode of specDoc.requirements) {
    const criteria = criteriaEngine.deriveCriteria(reqNode, specDoc.technicalConstraints);
    const primaryCrit = criteria[0];
    const testTemplate = primaryCrit
      ? criteriaEngine.generateTestTemplate(primaryCrit, { moduleName: reqNode.title.replace(/[^a-zA-Z0-9]/g, "") })
      : undefined;

    let cat: any = "service";
    if (reqNode.type === "data_model") cat = "migration";
    else if (reqNode.type === "api_endpoint") cat = "route";
    else if (reqNode.category.toLowerCase().includes("ui") || reqNode.category.toLowerCase().includes("frontend")) cat = "component";

    rawTasks.push({
      id: `task-spec-${Date.now()}-${idx++}`,
      title: reqNode.title,
      role: reqNode.type === "api_endpoint" ? "implementer" : "coder",
      category: cat,
      dependencies: [],
      focusFiles: testTemplate ? [`packages/engine/src/services/${testTemplate.fileName.replace(".test.ts", ".ts")}`] : [],
      testCommand: testTemplate ? `npm test -- ${testTemplate.fileName}` : "npm test",
      prompt: [
        `[SPECIFICATION GOAL]: ${reqNode.title}`,
        `DESCRIPTION: ${reqNode.description}`,
        primaryCrit ? `ACCEPTANCE SCENARIO: Given ${primaryCrit.given}, When ${primaryCrit.when}, Then ${primaryCrit.then}` : "",
        specDoc.technicalConstraints.length > 0 ? `TECHNICAL CONSTRAINTS: ${specDoc.technicalConstraints.join(", ")}` : ""
      ].filter(Boolean).join("\n\n")
    });
  }

  const sequenced = sequencer.sequenceTasks(rawTasks);

  console.log("\n[DecomposeSpec] Topologically Sequenced Tasks:");
  for (let i = 0; i < sequenced.length; i++) {
    const t = sequenced[i]!;
    console.log(`  ${i + 1}. [${t.category.toUpperCase()}] ${t.title} (${t.role})`);
  }

  if (dryRun) {
    console.log("\n[DecomposeSpec] --dry-run specified. No database mutations performed.");
    return;
  }

  // Submit to local daemon if running
  const serverPort = process.env.HTTP_PORT || "24161";
  try {
    const res = await fetch(`http://localhost:${serverPort}/api/tasks/decompose-spec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: resolvedPath })
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`\n[DecomposeSpec] Enqueued ${data.createdCount} tasks into daemon queue.`);
    } else {
      console.warn(`[DecomposeSpec] Daemon responded with HTTP ${res.status}.`);
    }
  } catch (err: any) {
    console.warn(`[DecomposeSpec] Could not connect to daemon at port ${serverPort}: ${err?.message}`);
  }
}

main().catch((err) => {
  console.error("[DecomposeSpec] Fatal error:", err);
  process.exit(1);
});
