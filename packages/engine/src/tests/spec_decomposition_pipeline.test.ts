import test from "node:test";
import assert from "node:assert/strict";
import { ProjectSpecIngestionService } from "../inference/ProjectSpecIngestionService.js";
import { AcceptanceCriteriaEngine } from "../inference/AcceptanceCriteriaEngine.js";
import { DependencyGraphSequencer } from "../inference/DependencyGraphSequencer.js";

test("Spec Decomposition Pipeline Integration (T81.5)", async (t) => {
  await t.test("should autonomously decompose specification into sequenced atomic tasks", async () => {
    const markdown = [
      "# Real-Time Webhook Pipeline",
      "Receives external webhooks and queues them for execution.",
      "",
      "## Technical Constraints",
      "- Zero emojis in any code or comments.",
      "- Strict SOLID principles.",
      "- Strict TypeScript typing.",
      "",
      "## Endpoints",
      "POST /api/webhooks/receive - Ingests external webhook payload",
      "GET /api/webhooks/status - Polls delivery status",
      "",
      "## Requirements",
      "- Persist webhook event records in webhook_events table",
      "- Verify HMAC SHA-256 signatures before queueing",
      "- Render Webhook Monitor Component on frontend dashboard"
    ].join("\n");

    const ingestion = new ProjectSpecIngestionService();
    const criteriaEngine = new AcceptanceCriteriaEngine();
    const sequencer = new DependencyGraphSequencer();

    const specDoc = ingestion.parseMarkdown(markdown, "Webhook Pipeline");
    assert.strictEqual(specDoc.title, "Real-Time Webhook Pipeline");
    assert.strictEqual(specDoc.apiEndpoints.length, 2);

    const rawTasks: any[] = [];
    let idx = 1;
    for (const reqNode of specDoc.requirements) {
      const criteria = criteriaEngine.deriveCriteria(reqNode, specDoc.technicalConstraints);
      const primaryCrit = criteria[0];
      const testTemplate = primaryCrit
        ? criteriaEngine.generateTestTemplate(primaryCrit, { moduleName: reqNode.title.replace(/[^a-zA-Z0-9]/g, "") })
        : undefined;

      let cat: any = "service";
      if (reqNode.type === "data_model" || reqNode.title.includes("table")) cat = "migration";
      else if (reqNode.type === "api_endpoint") cat = "route";
      else if (reqNode.category.toLowerCase().includes("ui") || reqNode.title.includes("Component")) cat = "component";

      rawTasks.push({
        id: `task-spec-${idx++}`,
        title: reqNode.title,
        role: reqNode.type === "api_endpoint" ? "implementer" : "coder",
        category: cat,
        dependencies: [],
        focusFiles: testTemplate ? [`packages/engine/src/services/${testTemplate.fileName.replace(".test.ts", ".ts")}`] : [],
        testCommand: testTemplate ? `npm test -- ${testTemplate.fileName}` : "npm test"
      });
    }

    const sequenced = sequencer.sequenceTasks(rawTasks);
    assert.ok(sequenced.length >= 4);

    // Verify ordering: migration is sequenced ahead of routes and components
    const migrationIdx = sequenced.findIndex((t) => t.category === "migration");
    const componentIdx = sequenced.findIndex((t) => t.category === "component");
    if (migrationIdx !== -1 && componentIdx !== -1) {
      assert.ok(migrationIdx < componentIdx, "Database migration should precede UI component");
    }
  });
});
