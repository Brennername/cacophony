import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { OllamaModelManager } from "../inference/OllamaModelManager.js";
import type { OllamaPullProgressEvent } from "@cacophony/shared-types";

describe("OllamaModelManager Suite", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("should list installed models and enrich with protected status and VRAM residency", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/api/tags")) {
        return new Response(
          JSON.stringify({
            models: [
              {
                name: "qwen2.5-coder:7b-instruct-q4_K_M",
                model: "qwen2.5-coder:7b-instruct-q4_K_M",
                modified_at: "2026-09-30T00:00:00Z",
                size: 4683075584,
                digest: "sha256:abc123",
                details: {
                  family: "qwen2",
                  parameter_size: "7.6B",
                  quantization_level: "Q4_K_M"
                }
              },
              {
                name: "deepseek-r1:8b",
                model: "deepseek-r1:8b",
                modified_at: "2026-09-30T00:00:00Z",
                size: 5200000000,
                digest: "sha256:def456",
                details: {
                  family: "llama",
                  parameter_size: "8B",
                  quantization_level: "Q4_0"
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (urlStr.endsWith("/api/ps")) {
        return new Response(
          JSON.stringify({
            models: [
              {
                name: "qwen2.5-coder:7b-instruct-q4_K_M",
                model: "qwen2.5-coder:7b-instruct-q4_K_M",
                size_vram: 4683075584
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const manager = new OllamaModelManager("http://127.0.0.1:11434");
    const protectedList = ["qwen2.5-coder:7b-instruct-q4_K_M"];
    const models = await manager.listInstalledModels(protectedList);

    assert.equal(models.length, 2);
    const qwen = models.find((m) => m.name === "qwen2.5-coder:7b-instruct-q4_K_M");
    const deepseek = models.find((m) => m.name === "deepseek-r1:8b");

    assert.ok(qwen);
    assert.equal(qwen.isProtected, true);
    assert.equal(qwen.isLoadedInVram, true);
    assert.equal(qwen.details.parameterSize, "7.6B");

    assert.ok(deepseek);
    assert.equal(deepseek.isProtected, false);
    assert.equal(deepseek.isLoadedInVram, false);
  });

  test("should stream pull progress events and calculate percentages accurately", async () => {
    const ndjsonChunks = [
      JSON.stringify({ status: "pulling manifest" }) + "\n",
      JSON.stringify({ status: "downloading layer", digest: "sha256:111", total: 1000, completed: 250 }) + "\n",
      JSON.stringify({ status: "downloading layer", digest: "sha256:111", total: 1000, completed: 750 }) + "\n",
      JSON.stringify({ status: "success" }) + "\n"
    ];

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/api/pull")) {
        const stream = new ReadableStream({
          start(controller) {
            for (const chunk of ndjsonChunks) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          }
        });
        return new Response(stream, { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const manager = new OllamaModelManager("http://127.0.0.1:11434");
    const receivedEvents: OllamaPullProgressEvent[] = [];

    await manager.pullModel("qwen2.5-coder:3b", (event) => {
      receivedEvents.push(event);
    });

    assert.equal(receivedEvents.length, 4);
    assert.equal(receivedEvents[0]!.status, "pulling manifest");
    assert.equal(receivedEvents[1]!.percent, 25);
    assert.equal(receivedEvents[2]!.percent, 75);
    assert.equal(receivedEvents[3]!.status, "success");
  });

  test("should delete model and handle errors gracefully", async () => {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/api/delete") && init?.method === "DELETE") {
        const body = JSON.parse(String(init.body || "{}"));
        if (body.model === "non-existent") {
          return new Response("model not found", { status: 404 });
        }
        return new Response(null, { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const manager = new OllamaModelManager("http://127.0.0.1:11434");
    const success = await manager.deleteModel("deepseek-r1:8b");
    assert.equal(success, true);

    await assert.rejects(
      async () => {
        await manager.deleteModel("non-existent");
      },
      /Failed to delete model 'non-existent': HTTP 404/
    );
  });

  test("should show model metadata and quantization details", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/api/show")) {
        return new Response(
          JSON.stringify({
            parameters: "7.6B",
            details: {
              format: "gguf",
              family: "qwen2",
              quantization_level: "Q4_K_M"
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const manager = new OllamaModelManager("http://127.0.0.1:11434");
    const info = await manager.showModelInfo("qwen2.5-coder:7b");

    assert.equal(info.parameters, "7.6B");
    assert.equal(info.details?.quantization_level, "Q4_K_M");
  });
});
