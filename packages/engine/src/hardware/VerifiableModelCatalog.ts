import type { VerifiableModelEntry } from "@cacophony/shared-types";

export type { VerifiableModelEntry };

/**
 * Curated catalog of verifiable models across Ollama, local OpenAI-compatible runtimes,
 * and Frontier cloud endpoints.
 */
export const VERIFIABLE_MODEL_CATALOG: readonly VerifiableModelEntry[] = [
  // Local Ollama Models
  {
    tag: "phi4:latest",
    name: "Microsoft Phi-4 (14B)",
    provider: "ollama",
    parameterSize: 14,
    contextWindow: 16384,
    recommendedRoles: ["architect", "reasoning", "reviewer"],
    isFrontier: false,
    isCloudApi: false,
    description: "Highly capable 14B reasoning and synthetic code evaluation model."
  },
  {
    tag: "deepseek-coder-v2:16b",
    name: "DeepSeek Coder V2 (16B Lite)",
    provider: "ollama",
    parameterSize: 16,
    contextWindow: 16384,
    recommendedRoles: ["implementer", "reviewer"],
    isFrontier: false,
    isCloudApi: false,
    description: "MoE coding specialist with strong TypeScript AST synthesis."
  },
  {
    tag: "qwen2.5-coder:7b-instruct-q4_K_M",
    name: "Qwen 2.5 Coder (7B Instruct)",
    provider: "ollama",
    parameterSize: 7,
    contextWindow: 16384,
    recommendedRoles: ["implementer", "reviewer"],
    isFrontier: false,
    isCloudApi: false,
    description: "Fast local code generator optimized for APU and VRAM efficiency."
  },
  {
    tag: "gemma3:4b",
    name: "Google Gemma 3 (4B)",
    provider: "ollama",
    parameterSize: 4,
    contextWindow: 8192,
    recommendedRoles: ["doc", "triage"],
    isFrontier: false,
    isCloudApi: false,
    description: "Lightweight documentation and issue triage specialist."
  },
  {
    tag: "codestral:22b-v0.1-q4_K_M",
    name: "Mistral Codestral (22B)",
    provider: "ollama",
    parameterSize: 22,
    contextWindow: 32768,
    recommendedRoles: ["architect", "implementer"],
    isFrontier: false,
    isCloudApi: false,
    description: "Large 80+ language codebase reasoning model for batched boutique runs."
  },

  // OpenAI-Compatible Local Runtimes (vLLM / LM Studio / LocalAI)
  {
    tag: "vllm-local:qwen2.5-coder-32b",
    name: "vLLM Qwen 2.5 Coder (32B)",
    provider: "openai",
    parameterSize: 32,
    contextWindow: 32768,
    recommendedRoles: ["architect", "implementer"],
    isFrontier: false,
    isCloudApi: false,
    description: "High-throughput vLLM server instance on discrete secondary GPU."
  },

  // Frontier Cloud APIs (Requiring Vault API Key)
  {
    tag: "claude-3-5-sonnet-20241022",
    name: "Anthropic Claude 3.5 Sonnet",
    provider: "anthropic",
    parameterSize: 70,
    contextWindow: 200000,
    recommendedRoles: ["architect", "reviewer"],
    isFrontier: true,
    isCloudApi: true,
    description: "Frontier reasoning and zero-shot code refactoring engine."
  },
  {
    tag: "claude-3-5-haiku-20241022",
    name: "Anthropic Claude 3.5 Haiku",
    provider: "anthropic",
    parameterSize: 20,
    contextWindow: 200000,
    recommendedRoles: ["implementer", "triage"],
    isFrontier: true,
    isCloudApi: true,
    description: "Fast frontier sub-agent for code generation and triage."
  },
  {
    tag: "gpt-4o",
    name: "OpenAI GPT-4o",
    provider: "openai",
    parameterSize: 70,
    contextWindow: 128000,
    recommendedRoles: ["architect", "reviewer"],
    isFrontier: true,
    isCloudApi: true,
    description: "High-intelligence multimodal frontier model."
  },
  {
    tag: "deepseek-ai/DeepSeek-V3",
    name: "DeepSeek V3 (Cloud API)",
    provider: "deepseek",
    parameterSize: 671,
    contextWindow: 64000,
    recommendedRoles: ["implementer", "reviewer"],
    isFrontier: true,
    isCloudApi: true,
    description: "Massive scale MoE frontier model with ultra-low token cost."
  },
  {
    tag: "gemini-1.5-pro-latest",
    name: "Google Gemini 1.5 Pro",
    provider: "gemini",
    parameterSize: 70,
    contextWindow: 1000000,
    recommendedRoles: ["architect", "doc"],
    isFrontier: true,
    isCloudApi: true,
    description: "Frontier model with million-token context for repository ingestion."
  },
  {
    tag: "llama-3.3-70b-versatile",
    name: "Groq Llama 3.3 (70B Versatile)",
    provider: "groq",
    parameterSize: 70,
    contextWindow: 128000,
    recommendedRoles: ["implementer", "reviewer"],
    isFrontier: true,
    isCloudApi: true,
    description: "Ultra-high-speed LPU inference engine running Llama 3.3."
  }
];

export class VerifiableModelCatalog {
  public static getAll(): readonly VerifiableModelEntry[] {
    return VERIFIABLE_MODEL_CATALOG;
  }

  public static findByTag(tag: string): VerifiableModelEntry | undefined {
    return VERIFIABLE_MODEL_CATALOG.find(
      (m) => m.tag.toLowerCase() === tag.toLowerCase() || tag.toLowerCase().startsWith(m.tag.toLowerCase())
    );
  }

  public static getFrontierModels(): readonly VerifiableModelEntry[] {
    return VERIFIABLE_MODEL_CATALOG.filter((m) => m.isFrontier);
  }

  public static getLocalModels(): readonly VerifiableModelEntry[] {
    return VERIFIABLE_MODEL_CATALOG.filter((m) => !m.isCloudApi);
  }

  public static getByProvider(provider: string): readonly VerifiableModelEntry[] {
    return VERIFIABLE_MODEL_CATALOG.filter((m) => m.provider === provider);
  }
}
