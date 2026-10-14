import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OllamaProvider } from "../inference/OllamaProvider.js";

describe("OllamaProvider Model Unload & Eviction Flow (T68.4.4)", () => {
  it("unloadModel sends keep_alive: 0 via POST /api/generate", async () => {
    let capturedUrl: string = "";
    let capturedBody: any = null;

    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url.toString();
      if (init?.body) {
        capturedBody = JSON.parse(init.body as string);
      }
      return new Response(JSON.stringify({ response: "", done: true }), { status: 200 });
    };

    const provider = new OllamaProvider({ fetchFn: mockFetch as any });
    await provider.unloadModel("deepseek-r1:8b");

    assert.ok(capturedUrl.includes("/api/generate"), "Should target /api/generate");
    assert.equal(capturedBody?.model, "deepseek-r1:8b");
    assert.equal(capturedBody?.keep_alive, 0, "keep_alive should be explicitly 0");
  });

  it("waitForModelEviction returns true when model is purged from /api/ps", async () => {
    let pollCount = 0;

    const mockFetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/ps")) {
        pollCount++;
        // First poll: model still present. Second poll: evicted.
        const models = pollCount === 1 ? [{ name: "deepseek-r1:8b" }] : [{ name: "qwen2.5-coder:7b" }];
        return new Response(JSON.stringify({ models }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    };

    const provider = new OllamaProvider({ fetchFn: mockFetch as any });
    const evicted = await provider.waitForModelEviction("deepseek-r1:8b", 3000);

    assert.equal(evicted, true, "Should report successful eviction");
    assert.ok(pollCount >= 2, "Should have polled at least twice");
  });

  it("waitForModelEviction returns false upon timeout if model remains in /api/ps", async () => {
    const mockFetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/ps")) {
        return new Response(JSON.stringify({ models: [{ name: "stubborn-model:8b" }] }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    };

    const provider = new OllamaProvider({ fetchFn: mockFetch as any });
    // Timeout set to 300ms
    const evicted = await provider.waitForModelEviction("stubborn-model:8b", 300);

    assert.equal(evicted, false, "Should return false on timeout");
  });
});
