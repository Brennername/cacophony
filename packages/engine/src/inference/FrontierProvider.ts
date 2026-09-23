import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType
} from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";
import type { SecretVault } from "./SecretVault.js";

/**
 * FrontierProvider
 *
 * Dispatches inference calls to external frontier cloud APIs (OpenAI, Anthropic Claude,
 * or Google Gemini) with dynamic credentials decrypted from the SecretVault.
 */
export class FrontierProvider implements IInferenceProvider {
  private readonly providerType: "openai" | "anthropic" | "gemini";
  private readonly vault: SecretVault;

  constructor(providerType: "openai" | "anthropic" | "gemini", vault: SecretVault) {
    this.providerType = providerType;
    this.vault = vault;
  }

  public getProviderType(): InferenceProviderType {
    return this.providerType;
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    switch (this.providerType) {
      case "openai":
        return this.callOpenAI(request);
      case "anthropic":
        return this.callAnthropic(request);
      case "gemini":
        return this.callGemini(request);
    }
  }

  public async stream(
    request: InferenceRequest,
    onChunk: (chunk: string) => void
  ): Promise<InferenceResponse> {
    // Basic fallback to complete generate for unified contract if streaming not natively handled
    const res = await this.generate(request);
    onChunk(res.content);
    return res;
  }

  private async callOpenAI(request: InferenceRequest): Promise<InferenceResponse> {
    const startMs = Date.now();
    const apiKey = await this.vault.getKey("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured in SecretVault or environment.");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: request.temperature ?? 0.2
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API request failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as {
      readonly choices?: readonly { readonly message?: { readonly content: string } }[];
      readonly usage?: { readonly prompt_tokens: number; readonly completion_tokens: number; readonly total_tokens: number };
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

  private async callAnthropic(request: InferenceRequest): Promise<InferenceResponse> {
    const startMs = Date.now();
    const apiKey = await this.vault.getKey("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured in SecretVault or environment.");

    const systemMessage = request.messages.find((m) => m.role === "system")?.content;
    const nonSystemMessages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens ?? 4096,
        system: systemMessage,
        messages: nonSystemMessages,
        temperature: request.temperature ?? 0.2
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API request failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as {
      readonly content?: readonly { readonly text?: string }[];
      readonly usage?: { readonly input_tokens: number; readonly output_tokens: number };
    };

    const latencyMs = Math.max(1, Date.now() - startMs);
    const tokensPrompt = data.usage?.input_tokens ?? 0;
    const tokensCompletion = data.usage?.output_tokens ?? 0;
    const totalTokens = tokensPrompt + tokensCompletion;
    const tokensPerSec = tokensCompletion > 0 ? Number(((tokensCompletion / latencyMs) * 1000).toFixed(2)) : 0;

    return {
      content: data.content?.[0]?.text ?? "",
      model: request.model,
      tokensPrompt,
      tokensCompletion,
      totalTokens,
      latencyMs,
      tokensPerSec
    };
  }

  private async callGemini(request: InferenceRequest): Promise<InferenceResponse> {
    const startMs = Date.now();
    const apiKey = await this.vault.getKey("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured in SecretVault or environment.");

    const cleanModel = request.model.replace(/^models\//, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    const contents = request.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API request failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as {
      readonly candidates?: readonly { readonly content?: { readonly parts?: readonly { readonly text?: string }[] } }[];
      readonly usageMetadata?: { readonly promptTokenCount?: number; readonly candidatesTokenCount?: number };
    };

    const latencyMs = Math.max(1, Date.now() - startMs);
    const tokensPrompt = data.usageMetadata?.promptTokenCount ?? 0;
    const tokensCompletion = data.usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokens = tokensPrompt + tokensCompletion;
    const tokensPerSec = tokensCompletion > 0 ? Number(((tokensCompletion / latencyMs) * 1000).toFixed(2)) : 0;

    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      model: request.model,
      tokensPrompt,
      tokensCompletion,
      totalTokens,
      latencyMs,
      tokensPerSec
    };
  }
}
