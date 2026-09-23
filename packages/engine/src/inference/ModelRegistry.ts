import type { IModelRegistry, ModelSpec } from "./IModelRegistry.js";
import type { InferenceProviderType } from "@cacophony/shared-types";

/**
 * ModelRegistry
 *
 * In-memory and database-backed model registry providing:
 * - Dynamic capability discovery
 * - Local inference port scanning (Ollama, LM Studio)
 * - Optimal model selection by context size, tool requirements, and cost/locality preferences
 */
export class ModelRegistry implements IModelRegistry {
  private readonly models = new Map<string, ModelSpec>();

  constructor(initialModels?: readonly ModelSpec[]) {
    if (initialModels) {
      for (const m of initialModels) {
        this.models.set(m.modelId, m);
      }
    } else {
      this.registerDefaults();
    }
  }

  public async register(spec: ModelSpec): Promise<void> {
    this.models.set(spec.modelId, spec);
  }

  public async deregister(modelId: string): Promise<void> {
    this.models.delete(modelId);
  }

  public async getModel(modelId: string): Promise<ModelSpec | undefined> {
    return this.models.get(modelId);
  }

  public async listModels(filter?: { provider?: InferenceProviderType; isLocal?: boolean }): Promise<readonly ModelSpec[]> {
    let list = Array.from(this.models.values());
    if (filter?.provider) {
      list = list.filter((m) => m.provider === filter.provider);
    }
    if (filter?.isLocal !== undefined) {
      list = list.filter((m) => m.isLocal === filter.isLocal);
    }
    return list;
  }

  public async discoverLocalModels(): Promise<readonly ModelSpec[]> {
    const discovered: ModelSpec[] = [];

    // Probe Ollama (11434)
    try {
      const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const data = (await res.json()) as { models?: Array<{ name: string }> };
        for (const m of data.models || []) {
          discovered.push({
            modelId: m.name,
            family: "ollama-local",
            provider: "ollama",
            contextWindowSize: 8192,
            maxOutputTokens: 4096,
            toolCallingCapability: true,
            diffFormatCapability: false,
            costPer1kTokens: 0,
            isLocal: true,
            tags: ["local", "ollama"]
          });
        }
      }
    } catch {
      // Local Ollama unavailable
    }

    // Probe LM Studio (1234)
    try {
      const res = await fetch("http://localhost:1234/v1/models", { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ id: string }> };
        for (const m of data.data || []) {
          discovered.push({
            modelId: m.id,
            family: "lmstudio-local",
            provider: "lmstudio",
            contextWindowSize: 8192,
            maxOutputTokens: 4096,
            toolCallingCapability: true,
            diffFormatCapability: false,
            costPer1kTokens: 0,
            isLocal: true,
            tags: ["local", "lmstudio"]
          });
        }
      }
    } catch {
      // Local LM Studio unavailable
    }

    for (const d of discovered) {
      this.models.set(d.modelId, d);
    }

    return discovered;
  }

  public async getOptimalModelForTask(requirements: {
    contextTokensNeeded: number;
    requiresTools?: boolean;
    prefersLocal?: boolean;
    requiresDiff?: boolean;
  }): Promise<ModelSpec | undefined> {
    const candidates = Array.from(this.models.values()).filter((m) => {
      if (m.contextWindowSize < requirements.contextTokensNeeded) return false;
      if (requirements.requiresTools && !m.toolCallingCapability) return false;
      if (requirements.requiresDiff && !m.diffFormatCapability) return false;
      return true;
    });

    if (candidates.length === 0) {
      return undefined;
    }

    if (requirements.prefersLocal) {
      const localMatch = candidates.find((c) => c.isLocal);
      if (localMatch) return localMatch;
    }

    // Return candidate with lowest cost per token
    return candidates.sort((a, b) => a.costPer1kTokens - b.costPer1kTokens)[0];
  }

  private registerDefaults(): void {
    // Default local candidates
    this.models.set("qwen2.5-coder:7b", {
      modelId: "qwen2.5-coder:7b",
      family: "qwen",
      provider: "ollama",
      contextWindowSize: 32768,
      maxOutputTokens: 8192,
      toolCallingCapability: true,
      diffFormatCapability: false,
      costPer1kTokens: 0,
      isLocal: true,
      tags: ["local", "coding", "default"]
    });

    this.models.set("deepseek-coder:6.7b", {
      modelId: "deepseek-coder:6.7b",
      family: "deepseek",
      provider: "ollama",
      contextWindowSize: 16384,
      maxOutputTokens: 4096,
      toolCallingCapability: false,
      diffFormatCapability: false,
      costPer1kTokens: 0,
      isLocal: true,
      tags: ["local", "coding"]
    });

    // Default frontier candidates
    this.models.set("claude-3-7-sonnet", {
      modelId: "claude-3-7-sonnet",
      family: "claude",
      provider: "anthropic",
      contextWindowSize: 200000,
      maxOutputTokens: 8192,
      toolCallingCapability: true,
      diffFormatCapability: true,
      costPer1kTokens: 0.003,
      isLocal: false,
      tags: ["frontier", "reasoning"]
    });

    this.models.set("gpt-4o", {
      modelId: "gpt-4o",
      family: "gpt4",
      provider: "openai",
      contextWindowSize: 128000,
      maxOutputTokens: 4096,
      toolCallingCapability: true,
      diffFormatCapability: true,
      costPer1kTokens: 0.0025,
      isLocal: false,
      tags: ["frontier", "multimodal"]
    });

    this.models.set("gemini-2.0-flash", {
      modelId: "gemini-2.0-flash",
      family: "gemini",
      provider: "gemini",
      contextWindowSize: 1000000,
      maxOutputTokens: 8192,
      toolCallingCapability: true,
      diffFormatCapability: true,
      costPer1kTokens: 0.0001,
      isLocal: false,
      tags: ["frontier", "long-context"]
    });
  }
}
