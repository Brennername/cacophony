import {
  OpenAiCompatibleProvider,
  OpenAiCompatibleOptions,
} from "./OpenAiCompatibleProvider.js";

export type OpenAICompatibleOptions = OpenAiCompatibleOptions;

/**
 * OpenAICompatibleInferenceProvider
 *
 * Generic HTTP inference provider supporting arbitrary OpenAI-compatible
 * server endpoints (LM Studio, vLLM, LocalAI, Groq, OpenRouter, Together, OpenAI).
 */
export class OpenAICompatibleInferenceProvider extends OpenAiCompatibleProvider {
  constructor(options: OpenAICompatibleOptions) {
    super(options);
  }
}
