import test from "node:test";
import assert from "node:assert/strict";
import {
  MultiModelConsensusCoordinator,
  IModelInferenceCaller,
} from "../inference/MultiModelConsensusCoordinator.js";

test("MultiModelConsensusCoordinator Suite (T94.2.1)", async (t) => {
  const mockCaller: IModelInferenceCaller = {
    async generate(modelId: string, systemPrompt: string, _userPrompt: string): Promise<string> {
      if (modelId === "error-model") {
        throw new Error("Ollama connection timed out");
      }
      if (systemPrompt.includes("SecurityAuditor")) {
        return JSON.stringify({
          verdict: "APPROVE",
          summary: "No vulnerabilities detected",
          findings: [],
        });
      }
      if (systemPrompt.includes("ArchitectureAuditor")) {
        return JSON.stringify({
          verdict: "REQUEST_CHANGES",
          summary: "Coupling detected between domain and transport",
          findings: [
            {
              path: "src/service.ts",
              lineNumber: 45,
              ruleId: "DIP_VIOLATION",
              severity: "blocker",
              message: "Direct instantiation of concrete HTTP client",
              suggestion: "Inject IHttpClient interface",
            },
          ],
        });
      }
      return JSON.stringify({
        verdict: "APPROVE",
        summary: "Typing and UX look great",
        findings: [],
      });
    },
  };

  await t.test("dispatches to candidate models and collects individual executions", async () => {
    const coordinator = new MultiModelConsensusCoordinator(mockCaller);
    const executions = await coordinator.coordinateReview({
      taskId: "task-001",
      taskTitle: "Refactor service",
      taskPrompt: "Refactor database service",
      diffText: "+ export class Service {}",
    });

    assert.equal(executions.length, 3);
    assert.equal(executions[0]!.modelId, "qwen2.5-coder:14b");
    assert.equal(executions[0]!.persona, "ArchitectureAuditor");
    assert.equal(executions[0]!.result.verdict, "REQUEST_CHANGES");

    assert.equal(executions[1]!.modelId, "deepseek-r1:8b");
    assert.equal(executions[1]!.persona, "SecurityAuditor");
    assert.equal(executions[1]!.result.verdict, "APPROVE");

    assert.equal(executions[2]!.modelId, "gemma3:4b-it-qat");
    assert.equal(executions[2]!.persona, "DxUxAuditor");
    assert.equal(executions[2]!.result.verdict, "APPROVE");
  });

  await t.test("handles candidate model failures gracefully with blocker error verdict", async () => {
    const coordinator = new MultiModelConsensusCoordinator(mockCaller, [
      { modelId: "error-model", persona: "SecurityAuditor" },
    ]);

    const executions = await coordinator.coordinateReview({
      taskId: "task-002",
      taskTitle: "Test error resilience",
      taskPrompt: "Prompt",
      diffText: "+ code",
    });

    assert.equal(executions.length, 1);
    assert.equal(executions[0]!.result.verdict, "REQUEST_CHANGES");
    assert.ok(executions[0]!.result.findings.some((f) => f.message.includes("timed out")));
  });
});
