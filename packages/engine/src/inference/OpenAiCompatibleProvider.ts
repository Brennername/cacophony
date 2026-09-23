import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType
} from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";

export interface OpenAiCompatibleOptions {
  readonly providerType?: InferenceProviderType;
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly defaultHeaders?: Record<string, string>;
}

/**
 * OpenAiCompatibleProvider
 *
 * Universal driver for any OpenAI-compatible API endpoint:
 * - Local: LM Studio (http://localhost:1234/v1), vLLM (http://localhost:8000/v1), LocalAI
 * - Cloud: Groq (https://api.groq.com/openai/v1), Mistral, Together, OpenRouter, OpenAI
 */
export class OpenAiCompatibleProvider implements IInferenceProvider {
  private readonly providerType: InferenceProviderType;
  private readonly baseUrl: string;
  private readonly apiKey?: string | undefined;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: OpenAiCompatibleOptions) {
    this.providerType = options.providerType || "custom";
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.defaultHeaders = options.defaultHeaders || {};
  }

  public getProviderType(): InferenceProviderType {
    return this.providerType;
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const startMs = Date.now();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const endpoint = `${this.baseUrl}/chat/completions`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Inference request failed for '${this.providerType}' (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      readonly choices?: readonly { readonly message?: { readonly content: string } }[];
      readonly usage?: {
        readonly prompt_tokens: number;
        readonly completion_tokens: number;
        readonly total_tokens: number;
      };
    };

    const latencyMs = Math.max(1, Date.now() - startMs);
    const tokensPrompt = data.usage?.prompt_tokens ?? 0;
    const tokensCompletion = data.usage?.completion_tokens ?? 0;
    const totalTokens = data.usage?.total_tokens ?? (tokensPrompt + tokensCompletion);
    const tokensPerSec = tokensCompletion > 0 ? Number(((tokensCompletion / latencyMs) * 1000).toFixed(2)) : 0;

    return {
      content: data.choices?.[0]?.message?.content ?? "",
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
    const res = await this.generate(request);
    onChunk(res.content);
    return res;
  }
}
