import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType
} from "@cacophony/shared-types";

/**
 * Common abstraction for inference engines (local Ollama or frontier APIs).
 */
export interface IInferenceProvider {
  /**
   * Returns provider identifier (ollama, openai, anthropic, gemini).
   */
  getProviderType(): InferenceProviderType;

  /**
   * Generates a complete inference response.
   */
  generate(request: InferenceRequest): Promise<InferenceResponse>;

  /**
   * Streams token chunks via callback while recording aggregate token stats.
   */
  stream(
    request: InferenceRequest,
    onChunk: (chunk: string) => void
  ): Promise<InferenceResponse>;
}
