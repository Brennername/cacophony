import test from "node:test";
import assert from "node:assert/strict";
import { FrontierReviewer } from "../inference/FrontierReviewer.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";

test("FrontierReviewer Suite", async (t) => {
  await t.test("should evaluate clean diff with heuristic fallback and pass SOLID score", async () => {
    const reviewer = new FrontierReviewer();
    const result = await reviewer.evaluateReview({
      taskId: "task-01",
      title: "Add math utility function",
      diff: "--- a/math.ts\n+++ b/math.ts\n@@ -1,1 +1,3 @@\n+export function add(a: number, b: number): number {\n+  return a + b;\n+}\n",
      testSummary: "All 5 tests passed."
    });

    assert.strictEqual(result.verdict, "APPROVE");
    assert.strictEqual(result.solidComplianceScore, 100);
    assert.strictEqual(result.testCoveragePassed, true);
    assert.strictEqual(result.securityBoundariesPassed, true);
    assert.strictEqual(result.comments.length, 0);
  });

  await t.test("should flag security boundaries and lower score when dangerous constructs are detected", async () => {
    const reviewer = new FrontierReviewer();
    const result = await reviewer.evaluateReview({
      taskId: "task-02",
      title: "Evaluate dynamic script",
      diff: "--- a/runner.ts\n+++ b/runner.ts\n@@ -1,1 +1,3 @@\n+const result = eval(codeString);\n+container.innerHTML = result;\n",
      testSummary: "Tests passed"
    });

    assert.strictEqual(result.verdict, "REQUEST_CHANGES");
    assert.strictEqual(result.securityBoundariesPassed, false);
    assert.ok(result.solidComplianceScore < 80);
    assert.ok(result.comments.some((c) => c.severity === "blocker"));
  });

  await t.test("should invoke inference provider and parse structured JSON review", async () => {
    const mockProvider: IInferenceProvider = {
      getProviderType: () => "ollama",
      generate: async () => ({
        content: JSON.stringify({
          verdict: "APPROVE",
          reviewNotes: "Strict adherence to Interface Segregation and clean unit boundaries.",
          solidComplianceScore: 98,
          testCoveragePassed: true,
          securityBoundariesPassed: true,
          comments: [
            {
              path: "service.ts",
              lineNumber: 45,
              comment: "Consider extracting helper function",
              severity: "info"
            }
          ]
        }),
        model: "deepseek-r1:8b",
        tokensPrompt: 50,
        tokensCompletion: 80,
        totalTokens: 130,
        latencyMs: 120,
        tokensPerSec: 40
      }),
      stream: async (_req, onChunk) => {
        onChunk("chunk");
        return {
          content: "chunk",
          model: "deepseek-r1:8b",
          tokensPrompt: 10,
          tokensCompletion: 10,
          totalTokens: 20,
          latencyMs: 50,
          tokensPerSec: 30
        };
      }
    };

    const reviewer = new FrontierReviewer({
      inferenceProvider: mockProvider,
      defaultModel: "deepseek-r1:8b"
    });

    const result = await reviewer.evaluateReview({
      taskId: "task-03",
      title: "Implement Domain Service",
      diff: "--- a/service.ts\n+++ b/service.ts\n@@ -1,1 +1,5 @@\n+export class DomainService {}\n"
    });

    assert.strictEqual(result.verdict, "APPROVE");
    assert.strictEqual(result.solidComplianceScore, 98);
    assert.strictEqual(result.comments.length, 1);
    assert.strictEqual(result.comments[0]?.severity, "info");
  });

  await t.test("should reject diff containing empty Angular placeholder template", async () => {
    const reviewer = new FrontierReviewer();
    const result = await reviewer.evaluateReview({
      taskId: "task-04",
      title: "Render test modal with tabs",
      diff: "--- a/modal.component.ts\n+++ b/modal.component.ts\n@@ -1,1 +1,7 @@\n+@Component({\n+  selector: 'app-modal',\n+  template: '<div class=\"component-container\"></div>'\n+})\n+export class ModalComponent {}\n"
    });

    assert.strictEqual(result.verdict, "REJECT");
    assert.strictEqual(result.solidComplianceScore, 30);
    assert.ok(result.reviewNotes.includes("placeholder or empty component template"));
  });

  await t.test("should reject diff that predominantly strips documentation comments", async () => {
    const reviewer = new FrontierReviewer();
    const result = await reviewer.evaluateReview({
      taskId: "task-05",
      title: "Enforce version checks in adapter",
      diff: "--- a/adapter.ts\n+++ b/adapter.ts\n@@ -10,12 +10,0 @@\n-/**\n- * Adapter description\n- * with multiple lines\n- */\n"
    });

    assert.strictEqual(result.verdict, "REJECT");
    assert.ok(result.reviewNotes.includes("strips documentation comments"));
  });
});
