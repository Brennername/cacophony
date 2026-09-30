import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ModelBenchmarkRunner } from "../scheduler/ModelBenchmarkRunner.js";
import { ModelEvictionManager } from "../scheduler/ModelEvictionManager.js";
import { ModelTenancyGuard } from "../scheduler/ModelTenancyGuard.js";
import { OllamaModelManager } from "../inference/OllamaModelManager.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";
import type { InferenceRequest, InferenceResponse, InferenceProviderType } from "@cacophony/shared-types";

class MockInferenceProvider implements IInferenceProvider {
  public shouldFail = false;

  getProviderType(): InferenceProviderType {
    return "ollama";
  }

  async generate(req: InferenceRequest): Promise<InferenceResponse> {
    if (this.shouldFail) {
      throw new Error("Simulated model generation crash");
    }

    const content = `\`\`\`typescript
export class RingBuffer<T> {
  private buffer: T[] = [];
  constructor(private capacity: number) {}
  push(item: T): void { this.buffer.push(item); }
  pop(): T | undefined { return this.buffer.shift(); }
  isFull(): boolean { return this.buffer.length >= this.capacity; }
  isEmpty(): boolean { return this.buffer.length === 0; }
  size(): number { return this.buffer.length; }
}
\`\`\``;

    return {
      content,
      model: req.model,
      tokensPrompt: 50,
      tokensCompletion: 120,
      totalTokens: 170,
      latencyMs: 1500,
      tokensPerSec: 80.0
    };
  }

  async stream(
    req: InferenceRequest,
    onChunk: (chunk: string) => void
  ): Promise<InferenceResponse> {
    const res = await this.generate(req);
    onChunk(res.content);
    return res;
  }
}

class MockHealthRepository {
  public runs: Array<{ modelId: string; success: boolean; durationMs: number; tokensPerSec: number }> = [];
  public profiles: Record<string, any> = {};

  async recordRun(modelId: string, _provider: any, success: boolean, durationMs: number, tokensPerSec: number) {
    this.runs.push({ modelId, success, durationMs, tokensPerSec });
    if (!this.profiles[modelId]) {
      this.profiles[modelId] = {
        modelId,
        consecutiveFailures: 0,
        status: "ACTIVE",
        totalTasks: 0,
        totalSuccess: 0
      };
    }
    this.profiles[modelId].totalTasks++;
    if (success) {
      this.profiles[modelId].totalSuccess++;
      this.profiles[modelId].consecutiveFailures = 0;
    } else {
      this.profiles[modelId].consecutiveFailures++;
    }
  }

  async getProfile(modelId: string) {
    return this.profiles[modelId] || {
      modelId,
      consecutiveFailures: 0,
      status: "ACTIVE",
      totalTasks: 0,
      totalSuccess: 0
    };
  }

  async updateStatus(modelId: string, status: string) {
    if (!this.profiles[modelId]) {
      this.profiles[modelId] = { modelId, consecutiveFailures: 0, status, totalTasks: 0, totalSuccess: 0 };
    }
    this.profiles[modelId].status = status;
  }
}

describe("ModelBenchmarkRunner & Automated Eviction Suite", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("should benchmark model and record results in health repository", async () => {
    const mockProvider = new MockInferenceProvider();
    const mockHealth = new MockHealthRepository();
    const runner = new ModelBenchmarkRunner(mockProvider, mockHealth as any);

    const result = await runner.benchmark("qwen2.5-coder:3b");

    assert.equal(result.success, true);
    assert.equal(result.syntaxValid, true);
    assert.equal(result.tokensCompletion, 120);
    assert.equal(mockHealth.runs.length, 1);
    assert.equal(mockHealth.runs[0]!.modelId, "qwen2.5-coder:3b");
    assert.equal(mockHealth.runs[0]!.success, true);
  });

  test("should handle benchmark failures and log failure in health repository", async () => {
    const mockProvider = new MockInferenceProvider();
    mockProvider.shouldFail = true;
    const mockHealth = new MockHealthRepository();
    const runner = new ModelBenchmarkRunner(mockProvider, mockHealth as any);

    const result = await runner.benchmark("failing-model");

    assert.equal(result.success, false);
    assert.equal(result.syntaxValid, false);
    assert.match(result.error || "", /Simulated model generation crash/);
    assert.equal(mockHealth.runs.length, 1);
    assert.equal(mockHealth.runs[0]!.success, false);
  });

  test("should evict degraded non-protected model and trigger Ollama deletion", async () => {
    const mockHealth = new MockHealthRepository();
    const tenancyGuard = new ModelTenancyGuard({
      managedModelsEnabled: true,
      protectedModels: ["protected-model"],
      maxDiskStorageGb: 50,
      autoEvictionEnabled: true,
      minimumSuccessRateThreshold: 0.4,
      maxConsecutiveFailuresBeforeEviction: 3
    });

    let deleteRequested = "";
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/api/delete") && init?.method === "DELETE") {
        const body = JSON.parse(String(init.body || "{}"));
        deleteRequested = body.model;
        return new Response(null, { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const modelManager = new OllamaModelManager("http://127.0.0.1:11434");
    const evictionManager = new ModelEvictionManager(
      mockHealth as any,
      3,
      0.25,
      tenancyGuard,
      modelManager
    );

    // 1. Fail non-protected model 3 times
    await evictionManager.recordRunOutcome("poor-performer", false, 1000);
    await evictionManager.recordRunOutcome("poor-performer", false, 1000);
    await evictionManager.recordRunOutcome("poor-performer", false, 1000);

    const profile = await mockHealth.getProfile("poor-performer");
    assert.equal(profile.status, "EJECTED");
    assert.equal(deleteRequested, "poor-performer");
  });

  test("should preserve protected models when failing repeatedly and block deletion", async () => {
    const mockHealth = new MockHealthRepository();
    const tenancyGuard = new ModelTenancyGuard({
      managedModelsEnabled: true,
      protectedModels: ["protected-model"],
      maxDiskStorageGb: 50,
      autoEvictionEnabled: true,
      minimumSuccessRateThreshold: 0.4,
      maxConsecutiveFailuresBeforeEviction: 3
    });

    let deleteRequested = false;
    globalThis.fetch = (async () => {
      deleteRequested = true;
      return new Response(null, { status: 200 });
    }) as typeof fetch;

    const modelManager = new OllamaModelManager("http://127.0.0.1:11434");
    const evictionManager = new ModelEvictionManager(
      mockHealth as any,
      3,
      0.25,
      tenancyGuard,
      modelManager
    );

    // Fail protected model 3 times
    await evictionManager.recordRunOutcome("protected-model", false, 1000);
    await evictionManager.recordRunOutcome("protected-model", false, 1000);
    await evictionManager.recordRunOutcome("protected-model", false, 1000);

    const profile = await mockHealth.getProfile("protected-model");
    assert.notEqual(profile.status, "EJECTED");
    assert.equal(deleteRequested, false);
  });
});
