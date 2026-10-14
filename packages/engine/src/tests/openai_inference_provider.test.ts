import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { OpenAICompatibleInferenceProvider } from "../inference/OpenAICompatibleInferenceProvider.js";

describe("OpenAICompatibleInferenceProvider (T71.2.2)", () => {
  let server: http.Server;
  let serverPort = 0;
  let lastReceivedHeaders: http.IncomingHttpHeaders = {};
  let lastReceivedBody: any = null;
  let mockStatusCode = 200;
  let mockResponseBody: any = {};

  before(async () => {
    server = http.createServer((req, res) => {
      lastReceivedHeaders = req.headers;
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          lastReceivedBody = body ? JSON.parse(body) : null;
        } catch {
          lastReceivedBody = body;
        }
        res.writeHead(mockStatusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mockResponseBody));
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as { port: number };
        serverPort = addr.port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("should send formatted chat completions request and parse OpenAI response", async () => {
    mockStatusCode = 200;
    mockResponseBody = {
      choices: [{ message: { content: "export const answer = 42;" } }],
      usage: {
        prompt_tokens: 15,
        completion_tokens: 8,
        total_tokens: 23,
      },
    };

    const provider = new OpenAICompatibleInferenceProvider({
      baseUrl: `http://127.0.0.1:${serverPort}/v1/`,
      apiKey: "secret-test-token",
    });

    const res = await provider.generate({
      model: "qwen2.5-coder:7b",
      messages: [
        { role: "system", content: "You are an assistant" },
        { role: "user", content: "Write answer" },
      ],
      temperature: 0.1,
      maxTokens: 50,
    });

    assert.equal(res.content, "export const answer = 42;");
    assert.equal(res.model, "qwen2.5-coder:7b");
    assert.equal(res.tokensPrompt, 15);
    assert.equal(res.tokensCompletion, 8);
    assert.equal(res.totalTokens, 23);
    assert.ok(res.latencyMs >= 0);

    // Verify sent headers and body
    assert.equal(lastReceivedHeaders["authorization"], "Bearer secret-test-token");
    assert.equal(lastReceivedBody.model, "qwen2.5-coder:7b");
    assert.equal(lastReceivedBody.temperature, 0.1);
    assert.equal(lastReceivedBody.max_tokens, 50);
    assert.equal(lastReceivedBody.messages.length, 2);
  });

  it("should throw informative error on non-200 HTTP response", async () => {
    mockStatusCode = 401;
    mockResponseBody = { error: { message: "Invalid API Key" } };

    const provider = new OpenAICompatibleInferenceProvider({
      baseUrl: `http://127.0.0.1:${serverPort}`,
      apiKey: "bad-token",
    });

    await assert.rejects(
      async () =>
        provider.generate({
          model: "gpt-4",
          messages: [{ role: "user", content: "hi" }],
        }),
      /Inference request failed for 'custom' \(401\)/,
    );
  });
});
