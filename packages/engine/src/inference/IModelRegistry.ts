import type { InferenceProviderType } from "@cacophony/shared-types";

export interface ModelSpec {
  readonly modelId: string;
  readonly family: string;
  readonly provider: InferenceProviderType;
  readonly contextWindowSize: number;
  readonly maxOutputTokens: number;
  readonly toolCallingCapability: boolean;
  readonly diffFormatCapability: boolean;
  readonly costPer1kTokens: number;
  readonly isLocal: boolean;
  readonly tags: readonly string[];
}

export interface ModelCapabilityProbeResult {
  readonly modelId: string;
  readonly jsonCompliance: boolean;
  readonly diffCapable: boolean;
  readonly wholeFileOnly: boolean;
  readonly avgLatencyMs: number;
  readonly tokensPerSec: number;
}

export interface IModelRegistry {
  register(spec: ModelSpec): Promise<void>;
  deregister(modelId: string): Promise<void>;
  getModel(modelId: string): Promise<ModelSpec | undefined>;
  listModels(filter?: { provider?: InferenceProviderType; isLocal?: boolean }): Promise<readonly ModelSpec[]>;
  discoverLocalModels(): Promise<readonly ModelSpec[]>;
  getOptimalModelForTask(requirements: {
    contextTokensNeeded: number;
    requiresTools?: boolean;
    prefersLocal?: boolean;
    requiresDiff?: boolean;
  }): Promise<ModelSpec | undefined>;
}
