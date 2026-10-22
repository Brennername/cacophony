import { Agent } from "undici";
import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType,
} from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";
import type { ModelProfileRepository } from "@cacophony/db";

export interface OllamaProviderOptions {
  readonly baseUrl?: string | undefined;
  readonly profileRepository?: ModelProfileRepository | undefined;
  readonly fetchFn?: typeof fetch | undefined;
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
  private readonly fetchFn: typeof fetch;

  constructor(options?: string | OllamaProviderOptions) {
    if (typeof options === "string") {
      this.baseUrl = options;
      this.profileRepo = undefined;
      this.fetchFn = fetch;
    } else {
      this.baseUrl =
        options?.baseUrl ||
        process.env["OLLAMA_BASE_URL"] ||
        "http://127.0.0.1:11434";
      this.profileRepo = options?.profileRepository;
      this.fetchFn = options?.fetchFn ?? fetch;
    }
    this.dispatcher = new Agent({
      headersTimeout: 0,
      bodyTimeout: 0,
      connectTimeout: 30000,
    });
  }

  private readonly resolvedTagCache = new Map<string, string>();
  private availableTagsCache: { tags: string[]; fetchedAt: number } | null =
    null;

  public getProviderType(): InferenceProviderType {
    return "ollama";
  }

  /**
   * Resolves requested model tag against active installed Ollama tags (e.g. qwen2.5-coder:7b -> qwen2.5-coder:7b-instruct-q4_K_M).
   */
  public async resolveModelTag(requestedModel: string): Promise<string> {
    if (!requestedModel) return requestedModel;
    const cached = this.resolvedTagCache.get(requestedModel);
    if (cached) return cached;

    // Static known aliases for local Ollama environments
    const staticAliases: Record<string, string> = {
      "qwen2.5-coder:7b": "qwen2.5-coder:7b-instruct-q4_K_M",
      "qwen2.5-coder:latest": "qwen2.5-coder:7b-instruct-q4_K_M",
      "gemma3:4b": "gemma3:4b-it-qat",
      "gemma3:4b-it": "gemma3:4b-it-qat",
      "gemma3:12b": "gemma3:12b-it-qat",
      "gemma3:12b-it": "gemma3:12b-it-qat",
      "deepseek-coder-v2:latest": "deepseek-coder-v2:16b",
      "deepseek-r1:latest": "deepseek-r1:8b",
    };

    if (staticAliases[requestedModel]) {
      this.resolvedTagCache.set(requestedModel, staticAliases[requestedModel]!);
      return staticAliases[requestedModel]!;
    }

    try {
      const now = Date.now();
      if (
        !this.availableTagsCache ||
        now - this.availableTagsCache.fetchedAt > 30000
      ) {
        const res = await (this.fetchFn ?? fetch)(`${this.baseUrl}/api/tags`, {
          dispatcher: this.dispatcher as any,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            models?: Array<{ name: string }>;
          };
          const tags = (data.models || []).map((m) => m.name);
          this.availableTagsCache = { tags, fetchedAt: now };
        }
      }

      if (this.availableTagsCache && this.availableTagsCache.tags.length > 0) {
        const tags = this.availableTagsCache.tags;
        if (tags.includes(requestedModel)) {
          this.resolvedTagCache.set(requestedModel, requestedModel);
          return requestedModel;
        }

        const prefixMatch = tags.find(
          (t) =>
            t.startsWith(requestedModel) ||
            t.startsWith(`${requestedModel}:`) ||
            requestedModel.startsWith(t),
        );
        if (prefixMatch) {
          this.resolvedTagCache.set(requestedModel, prefixMatch);
          return prefixMatch;
        }
      }
    } catch {
      // Fallback silently if tags endpoint is unreachable
    }

    return requestedModel;
  }

  /**
   * Dynamically resolves model options from the matched active tuning profile before falling back to defaults.
   */
  /**
   * Dynamically resolves model options from the matched active tuning profile before falling back to defaults.
   */
  public async resolveModelOptions(
    model: string,
    role?: string,
    requestedTemperature?: number,
    requestedMaxTokens?: number,
    requestedContextTokens?: number,
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
      } catch {}
    }

    const defaultNumCtx = process.env["OLLAMA_NUM_CTX"]
      ? Number(process.env["OLLAMA_NUM_CTX"])
      : 4096;

    if (activeProfile && activeProfile.isActive) {
      return {
        temperature: requestedTemperature ?? activeProfile.temperature,
        num_predict: requestedMaxTokens ?? activeProfile.numPredict,
        num_ctx: requestedContextTokens ?? activeProfile.numCtx,
        top_k: activeProfile.topK,
        top_p: activeProfile.topP,
        repeat_penalty: activeProfile.repeatPenalty,
      };
    }

    return {
      temperature: requestedTemperature ?? 0.2,
      num_predict:
        requestedMaxTokens ??
        (process.env["OLLAMA_NUM_PREDICT"]
          ? Number(process.env["OLLAMA_NUM_PREDICT"])
          : 4096),
      num_ctx: requestedContextTokens ?? defaultNumCtx,
    };
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const startMs = Date.now();
    const url = `${this.baseUrl}/api/chat`;

    const resolvedModel = await this.resolveModelTag(request.model);
    const options = await this.resolveModelOptions(
      resolvedModel,
      undefined,
      request.temperature,
      request.maxTokens,
      request.contextTokens ?? request.numCtx,
    );

    const body = {
      model: resolvedModel,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      keep_alive: 300,
      options,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(request.signal ? { signal: request.signal } : {}),

      dispatcher: this.dispatcher as any,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Ollama generation failed (HTTP ${res.status}): ${errText}`,
      );
    }

    const data = (await res.json()) as {
      readonly message?: {
        readonly content?: string;
        readonly thinking?: string;
      };
      readonly prompt_eval_count?: number;
      readonly eval_count?: number;
      readonly total_duration?: number;
    };

    // If thinking exists (e.g. deepseek-r1 or qwen reasoning output), enclose in <think> tags so downstream demuxers and parsers preserve reasoning
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
    const tokensPerSec =
      tokensCompletion > 0
        ? Number(((tokensCompletion / latencyMs) * 1000).toFixed(2))
        : 0;

    return {
      content: rawContent,
      model: request.model,
      tokensPrompt,
      tokensCompletion,
      totalTokens,
      latencyMs,
      tokensPerSec,
    };
  }

  public async stream(
    request: InferenceRequest,
    onChunk: (chunk: string) => void,
  ): Promise<InferenceResponse> {
    const startMs = Date.now();
    const url = `${this.baseUrl}/api/chat`;

    const resolvedModel = await this.resolveModelTag(request.model);
    const options = await this.resolveModelOptions(
      resolvedModel,
      undefined,
      request.temperature,
      request.maxTokens,
      request.contextTokens ?? request.numCtx,
    );

    const body = {
      model: resolvedModel,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      keep_alive: 300,
      options,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(request.signal ? { signal: request.signal } : {}),
      dispatcher: this.dispatcher as any,
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(
        `Ollama streaming failed (HTTP ${res.status}): ${errText}`,
      );
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
        throw new Error(
          "Ollama inference streaming aborted by watchdog signal",
        );
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
            readonly message?: {
              readonly content?: string;
              readonly thinking?: string;
            };
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
          // Ignore JSON chunk parse error on partial lines
        }
      }
    }

    if (inThinkingChunkMode) {
      accumulatedContent += "</think>";
      onChunk("</think>");
    }

    const latencyMs = Math.max(1, Date.now() - startMs);
    const totalTokens = tokensPrompt + tokensCompletion;
    const tokensPerSec =
      tokensCompletion > 0
        ? Number(((tokensCompletion / latencyMs) * 1000).toFixed(2))
        : 0;

    return {
      content: accumulatedContent,
      model: request.model,
      tokensPrompt,
      tokensCompletion,
      totalTokens,
      latencyMs,
      tokensPerSec,
    };
  }

  /**
   * Unloads the specified model from VRAM by dispatching an empty generate request with keep_alive: 0.
   * Fulfills task T68.4.1.
   *
   * @param modelName Name of the model to unload from memory.
   */
  public async unloadModel(modelName: string): Promise<void> {
    const url = `${this.baseUrl}/api/generate`;
    const res = await this.fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      dispatcher: this.dispatcher as any,
      body: JSON.stringify({
        model: modelName,
        keep_alive: 0,
      }),
    } as RequestInit);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Failed to unload model '${modelName}' (HTTP ${res.status}): ${errText}`,
      );
    }
  }

  /**
   * Polls Ollama GET /api/ps with 500ms backoff verifying the model has been purged from GPU memory (T68.4.3).
   *
   * @param modelName - The model tag to verify eviction for.
   * @param timeoutMs - Maximum duration in milliseconds to poll before timing out (default 10,000ms).
   * @returns Promise resolving to true if purged, or false if timed out.
   */
  public async waitForModelEviction(
    modelName: string,
    timeoutMs: number = 10000,
  ): Promise<boolean> {
    const url = `${this.baseUrl}/api/ps`;
    const startTime = Date.now();
    const pollIntervalMs = 500;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const res = await this.fetchFn(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          dispatcher: this.dispatcher as any,
        } as RequestInit);

        if (res.ok) {
          const body = (await res.json()) as {
            models?: Array<{ name?: string; model?: string }>;
          };
          const activeModels = body.models ?? [];
          const isResident = activeModels.some(
            (m) =>
              m.name === modelName ||
              m.model === modelName ||
              (m.name &&
                (m.name.startsWith(modelName) ||
                  modelName.startsWith(m.name))) ||
              (m.model &&
                (m.model.startsWith(modelName) ||
                  modelName.startsWith(m.model))),
          );

          if (!isResident) {
            return true;
          }
        }
      } catch {
        // Transient network error; continue polling until timeout
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return false;
  }

  /**
   * Pre-loads model weights into memory/VRAM by initiating an empty generation request (T87.1.1, T87.1.3).
   *
   * @param modelName Name of the model to warm up in memory.
   * @param keepAlive Duration to keep model loaded (e.g. "10m", -1, or number of seconds). Defaults to "10m".
   */
  public async preloadModel(
    modelName: string,
    keepAlive: string | number = "10m",
  ): Promise<void> {
    const url = `${this.baseUrl}/api/generate`;
    const res = await this.fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      dispatcher: this.dispatcher as any,
      body: JSON.stringify({
        model: modelName,
        keep_alive: keepAlive,
      }),
    } as RequestInit);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Failed to preload model '${modelName}' (HTTP ${res.status}): ${errText}`,
      );
    }
  }

  /**
   * Checks whether a given model is currently resident in VRAM by querying GET /api/ps.
   *
   * @param modelName Name or tag of the model to check.
   * @returns Promise resolving to true if resident, false otherwise.
   */
  public async isModelResident(modelName: string): Promise<boolean> {
    const url = `${this.baseUrl}/api/ps`;
    try {
      const res = await this.fetchFn(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        dispatcher: this.dispatcher as any,
      } as RequestInit);

      if (!res.ok) {
        return false;
      }

      const body = (await res.json()) as {
        models?: Array<{ name?: string; model?: string }>;
      };
      const activeModels = body.models ?? [];
      return activeModels.some(
        (m) =>
          m.name === modelName ||
          m.model === modelName ||
          (m.name &&
            (m.name.startsWith(modelName) ||
              modelName.startsWith(m.name))) ||
          (m.model &&
            (m.model.startsWith(modelName) ||
              modelName.startsWith(m.model))),
      );
    } catch {
      return false;
    }
  }
}


