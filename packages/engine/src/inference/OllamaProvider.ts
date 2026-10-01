import { Agent } from "undici";
import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType
} from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";
import type { ModelProfileRepository } from "@cacophony/db";

export interface OllamaProviderOptions {
  readonly baseUrl?: string | undefined;
  readonly profileRepository?: ModelProfileRepository | undefined;
}

/**
 * OllamaProvider
 *
 * Dispatches inference requests to local Ollama instance via HTTP API.
 * Dynamically resolves model options (num_predict, num_ctx, temperature)
 * from matched active tuning profiles before falling back to environment defaults.
 */
export class OllamaProvider implements IInferenceProvider {
  private readonly baseUrl: string;
  private readonly dispatcher: Agent;
  private readonly profileRepo?: ModelProfileRepository | undefined;

  constructor(options?: string | OllamaProviderOptions) {
    if (typeof options === "string") {
      this.baseUrl = options;
      this.profileRepo = undefined;
    } else {
      this.baseUrl = options?.baseUrl || process.env["OLLAMA_BASE_URL"] || "http://127.0.0.1:11434";
      this.profileRepo = options?.profileRepository;
    }
    this.dispatcher = new Agent({
      headersTimeout: 0,
      bodyTimeout: 0,
      connectTimeout: 30000
    });
  }

  public getProviderType(): InferenceProviderType {
    return "ollama";
  }

  /**
   * Dynamically resolves model options from the matched active tuning profile before falling back to defaults.
   */
  public async resolveModelOptions(
    model: string,
    role?: string,
    requestedTemperature?: number,
    requestedMaxTokens?: number
  ): Promise<{
    temperature: number;
    num_predict: number;
    num_ctx: number;
    top_k?: number;
    top_p?: number;
    repeat_penalty?: number;
  }> {
    let activeProfile = null;
    if (this.profileRepo) {
      try {
        activeProfile = await this.profileRepo.getActiveProfile(model, role);
      } catch {
        // fallback to defaults
      }
    }

    if (activeProfile && activeProfile.isActive) {
      return {
        temperature: requestedTemperature ?? activeProfile.temperature,
        num_predict: requestedMaxTokens ?? activeProfile.numPredict,
        num_ctx: activeProfile.numCtx,
        top_k: activeProfile.topK,
        top_p: activeProfile.topP,
        repeat_penalty: activeProfile.repeatPenalty
      };
    }

    return {
      temperature: requestedTemperature ?? 0.2,
      num_predict: requestedMaxTokens ?? (process.env["OLLAMA_NUM_PREDICT"] ? Number(process.env["OLLAMA_NUM_PREDICT"]) : 4096),
      num_ctx: Number(process.env["OLLAMA_NUM_CTX"] || 16384)
    };
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const startMs = Date.now();
    const url = `${this.baseUrl}/api/chat`;

    const options = await this.resolveModelOptions(
      request.model,
      undefined,
      request.temperature,
      request.maxTokens
    );

    const body = {
      model: request.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      keep_alive: 300,
      options
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(request.signal ? { signal: request.signal } : {}),
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

    // If thinking exists (e.g. deepseek-r1 reasoning output), enclose in <think> tags so downstream demuxers and parsers preserve reasoning
    const thinking = data.message?.thinking?.trim();
    const content = data.message?.content?.trim() || "";
    let rawContent = content;
    if (thinking) {
      rawContent = `<think>\n${thinking}\n</think>\n${content}`;
    }

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

    const options = await this.resolveModelOptions(
      request.model,
      undefined,
      request.temperature,
      request.maxTokens
    );

    const body = {
      model: request.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      keep_alive: 300,
      options
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(request.signal ? { signal: request.signal } : {}),
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
    let inThinkingChunkMode = false;

    while (true) {
      if (request.signal?.aborted) {
        reader.cancel().catch(() => {});
        throw new Error("Ollama inference streaming aborted by watchdog signal");
      }
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

          const thinking = parsed.message?.thinking;
          const content = parsed.message?.content;

          if (thinking) {
            if (!inThinkingChunkMode) {
              inThinkingChunkMode = true;
              accumulatedContent += "<think>";
              onChunk("<think>");
            }
            accumulatedContent += thinking;
            onChunk(thinking);
          } else if (content) {
            if (inThinkingChunkMode) {
              inThinkingChunkMode = false;
              accumulatedContent += "</think>";
              onChunk("</think>");
            }
            accumulatedContent += content;
            onChunk(content);
          }

          if (parsed.prompt_eval_count) tokensPrompt = parsed.prompt_eval_count;
          if (parsed.eval_count) tokensCompletion = parsed.eval_count;
        } catch {
          // Ignore JSON chunk parse error
        }
      }
    }

    if (inThinkingChunkMode) {
      accumulatedContent += "</think>";
      onChunk("</think>");
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
