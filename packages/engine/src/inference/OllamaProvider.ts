import { Agent } from "undici";
import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType
} from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";

/**
 * OllamaProvider
 *
 * Dispatches inference requests to local Ollama instance via HTTP API.
 * Configured with keep_alive=-1 to prevent model eviction on consumer APUs,
 * capturing prompt evaluation counts and real-time generation speed (tokens/sec).
 */
export class OllamaProvider implements IInferenceProvider {
  private readonly baseUrl: string;
  private readonly dispatcher: Agent;

  constructor(baseUrl: string = process.env["OLLAMA_BASE_URL"] || "http://127.0.0.1:11434") {
    this.baseUrl = baseUrl;
    this.dispatcher = new Agent({
      headersTimeout: 0,
      bodyTimeout: 0,
      connectTimeout: 30000
    });
  }

  public getProviderType(): InferenceProviderType {
    return "ollama";
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const startMs = Date.now();
    const url = `${this.baseUrl}/api/chat`;

    const body = {
      model: request.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      // 300s keep-alive: holds the model in VRAM for 5 minutes after the request
      // completes. -1 (never evict) was causing cross-task VRAM conflicts when the
      // scheduler switched models -- Ollama had to synchronously evict the previous
      // model before loading the next one, freezing throughput for 30-60s.
      keep_alive: 300,
      options: {
        temperature: request.temperature ?? 0.2,
        num_predict: request.maxTokens ?? 2048
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatcher: this.dispatcher as any,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama generation failed (HTTP ${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      readonly message?: { readonly content?: string; readonly thinking?: string };
      readonly prompt_eval_count?: number;
      readonly eval_count?: number;
      readonly total_duration?: number;
    };

    // If content is empty but thinking exists (e.g. deepseek-r1 reasoning output), use thinking as content fallback
    const rawContent = data.message?.content?.trim()
      ? data.message.content
      : (data.message?.thinking ?? "");

    const latencyMs = Math.max(1, Date.now() - startMs);
    const tokensPrompt = data.prompt_eval_count ?? 0;
    const tokensCompletion = data.eval_count ?? 0;
    const totalTokens = tokensPrompt + tokensCompletion;
    const tokensPerSec = tokensCompletion > 0 ? Number(((tokensCompletion / latencyMs) * 1000).toFixed(2)) : 0;

    return {
      content: rawContent,
      model: request.model,
      tokensPrompt,
      tokensCompletion,
      totalTokens,
      latencyMs,
      tokensPerSec
    };
  }

  public async stream(
    request: InferenceRequest,
    onChunk: (chunk: string) => void
  ): Promise<InferenceResponse> {
    const startMs = Date.now();
    const url = `${this.baseUrl}/api/chat`;

    const body = {
      model: request.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      keep_alive: 300,
      options: {
        temperature: request.temperature ?? 0.2,
        num_predict: request.maxTokens ?? 2048
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatcher: this.dispatcher as any,
      body: JSON.stringify(body)
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`Ollama streaming failed (HTTP ${res.status}): ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedContent = "";
    let tokensPrompt = 0;
    let tokensCompletion = 0;

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as {
            readonly message?: { readonly content?: string; readonly thinking?: string };
            readonly prompt_eval_count?: number;
            readonly eval_count?: number;
            readonly done?: boolean;
          };
          const chunkText = parsed.message?.content || parsed.message?.thinking || "";
          if (chunkText) {
            accumulatedContent += chunkText;
            onChunk(chunkText);
          }
          if (parsed.prompt_eval_count) tokensPrompt = parsed.prompt_eval_count;
          if (parsed.eval_count) tokensCompletion = parsed.eval_count;
        } catch {
          // Ignore JSON chunk parse error
        }
      }
    }

    const latencyMs = Math.max(1, Date.now() - startMs);
    const totalTokens = tokensPrompt + tokensCompletion;
    const tokensPerSec = tokensCompletion > 0 ? Number(((tokensCompletion / latencyMs) * 1000).toFixed(2)) : 0;

    return {
      content: accumulatedContent,
      model: request.model,
      tokensPrompt,
      tokensCompletion,
      totalTokens,
      latencyMs,
      tokensPerSec
    };
  }
}
