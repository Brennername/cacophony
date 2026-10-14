/**
 * Specification for a quantized local model's VRAM memory footprint profile.
 */
export interface ModelVramProfile {
  modelId: string;
  baseFootprintGb: number;
  baseFootprintMb: number;
  /**
   * KV cache memory overhead in megabytes per 1,024 context tokens.
   */
  kvCachePer1kTokensMb: number;
}

/**
 * Standard baseline memory footprints for supported quantized local model families.
 * Footprint estimates correspond to Q4_K_M quantizations with default architecture parameters.
 */
export const MODEL_VRAM_TABLE: Record<string, ModelVramProfile> = {
  "qwen2.5-coder:3b": {
    modelId: "qwen2.5-coder:3b",
    baseFootprintGb: 2.2,
    baseFootprintMb: 2253,
    kvCachePer1kTokensMb: 64,
  },
  "gemma3:4b": {
    modelId: "gemma3:4b",
    baseFootprintGb: 3.1,
    baseFootprintMb: 3174,
    kvCachePer1kTokensMb: 80,
  },
  "qwen2.5-coder:7b": {
    modelId: "qwen2.5-coder:7b",
    baseFootprintGb: 5.2,
    baseFootprintMb: 5325,
    kvCachePer1kTokensMb: 128,
  },
  "deepseek-r1:8b": {
    modelId: "deepseek-r1:8b",
    baseFootprintGb: 6.1,
    baseFootprintMb: 6246,
    kvCachePer1kTokensMb: 144,
  },
};

/**
 * Default fallback profile when a model is not recognized in the static catalog.
 */
const DEFAULT_FALLBACK_PROFILE: ModelVramProfile = {
  modelId: "default",
  baseFootprintGb: 4.0,
  baseFootprintMb: 4096,
  kvCachePer1kTokensMb: 100,
};

/**
 * ModelVramCatalog maintains quantized model memory profiles and calculates
 * dynamic total VRAM requirements accounting for baseline weights and context KV cache.
 */
export class ModelVramCatalog {
  private readonly profiles: Map<string, ModelVramProfile>;

  constructor(customProfiles?: Record<string, ModelVramProfile>) {
    this.profiles = new Map();
    // Pre-populate baseline table
    for (const [key, profile] of Object.entries(MODEL_VRAM_TABLE)) {
      this.profiles.set(key, profile);
    }
    // Overlay custom user profiles if supplied
    if (customProfiles) {
      for (const [key, profile] of Object.entries(customProfiles)) {
        this.profiles.set(key, profile);
      }
    }
  }

  /**
   * Retrieves profile for given model ID with substring matching fallback.
   *
   * @param modelId - Exact or partial model name (e.g., 'qwen2.5-coder:7b-instruct-q4_K_M')
   * @returns ModelVramProfile if resolved, or undefined.
   */
  public getProfile(modelId: string): ModelVramProfile | undefined {
    if (this.profiles.has(modelId)) {
      return this.profiles.get(modelId);
    }
    // Attempt substring matching to support tag variations (e.g. :latest or quantization tags)
    for (const [key, profile] of this.profiles.entries()) {
      if (modelId.includes(key) || key.includes(modelId)) {
        return profile;
      }
    }
    return undefined;
  }

  /**
   * Returns base footprint in gigabytes for a model.
   */
  public getVramForModel(modelId: string): number | undefined {
    const profile = this.getProfile(modelId);
    return profile?.baseFootprintGb;
  }

  /**
   * Returns base footprint in megabytes for a model.
   */
  public getBaseFootprintMb(modelId: string): number {
    const profile = this.getProfile(modelId) ?? DEFAULT_FALLBACK_PROFILE;
    return profile.baseFootprintMb;
  }

  /**
   * Calculates total VRAM in megabytes including model base footprint and
   * dynamic KV-cache scaling for the specified context window.
   *
   * @param modelId - Target model identifier.
   * @param contextTokens - Target context budget in tokens (defaults to 4096).
   * @returns Total estimated VRAM requirement in MB.
   */
  public estimateTotalVramMb(modelId: string, contextTokens: number = 4096): number {
    const profile = this.getProfile(modelId) ?? DEFAULT_FALLBACK_PROFILE;
    const effectiveTokens = Math.max(0, contextTokens);
    const kvOverheadMb = Math.round((effectiveTokens / 1024) * profile.kvCachePer1kTokensMb);
    return profile.baseFootprintMb + kvOverheadMb;
  }

  /**
   * Registers or updates a model VRAM profile in the catalog.
   */
  public registerProfile(profile: ModelVramProfile): void {
    this.profiles.set(profile.modelId, profile);
  }

  /**
   * Removes a model profile from the catalog.
   */
  public removeProfile(modelId: string): boolean {
    return this.profiles.delete(modelId);
  }

  /**
   * Lists all registered model profiles.
   */
  public getAllProfiles(): ModelVramProfile[] {
    return Array.from(this.profiles.values());
  }
}
