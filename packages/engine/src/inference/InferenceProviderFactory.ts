import { IInferenceProvider } from "./IInferenceProvider.js";
import { OllamaProvider } from "./OllamaProvider.js";
import { OpenAICompatibleInferenceProvider } from "./OpenAICompatibleInferenceProvider.js";
import { MockInferenceStreamProvider } from "./MockInferenceStreamProvider.js";

export type SupportedInferenceProviderType = "ollama" | "openai_compatible" | "mock";

export interface InferenceProviderConfig {
  readonly provider?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly apiKey?: string | undefined;
  readonly defaultHeaders?: Record<string, string> | undefined;
}

/**
 * InferenceProviderFactory
 *
 * Dynamically resolves and instantiates the configured inference provider
 * based on environment variables (INFERENCE_PROVIDER, INFERENCE_BASE_URL, INFERENCE_API_KEY)
 * or explicit runtime configurations. Accommodates native Ollama, arbitrary OpenAI-compatible
 * endpoints, and synthetic mock streaming for demonstration showcases.
 */
export class InferenceProviderFactory {
  public static createProvider(config?: InferenceProviderConfig): IInferenceProvider {
    const providerType = (
      config?.provider ||
      process.env["INFERENCE_PROVIDER"] ||
      (process.env["DEMO_MODE"] === "true" ? "mock" : "ollama")
    ).toLowerCase();

    const baseUrl =
      config?.baseUrl ||
      process.env["INFERENCE_BASE_URL"] ||
      (providerType === "ollama" ? "http://127.0.0.1:11434" : "http://localhost:1234/v1");

    const apiKey = config?.apiKey || process.env["INFERENCE_API_KEY"];

    switch (providerType) {
      case "ollama":
        return new OllamaProvider({ baseUrl });

      case "openai_compatible":
        return new OpenAICompatibleInferenceProvider({
          baseUrl,
          apiKey,
          defaultHeaders: config?.defaultHeaders,
        });

      case "mock":
        return new MockInferenceStreamProvider();

      default:
        throw new Error(
          `Unsupported inference provider: '${providerType}'. Supported providers are: 'ollama', 'openai_compatible', 'mock'.`,
        );
    }
  }

  /**
   * Instance method creating provider, supporting both static and instance invocations.
   */
  public createProvider(config?: InferenceProviderConfig): IInferenceProvider {
    return InferenceProviderFactory.createProvider(config);
  }
}
