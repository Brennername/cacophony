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
  "gemma3:12b": {
    modelId: "gemma3:12b",
    baseFootprintGb: 8.9,
    baseFootprintMb: 9114,
    kvCachePer1kTokensMb: 160,
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
   * Estimates a ModelVramProfile from raw model tag, parameter size, and byte size.
   * Enables zero-hardcoding dynamic model support for any pulled model.
   */
  public static estimateProfileFromTag(
    modelId: string,
    sizeBytes?: number,
    parameterSizeStr?: string,
  ): ModelVramProfile {
    // 1. If sizeBytes is provided, compute baseline weights directly
    let baseFootprintGb = 4.0;
    let baseFootprintMb = 4096;
    let kvCachePer1kTokensMb = 100;

    if (sizeBytes && sizeBytes > 0) {
      baseFootprintGb = Math.round((sizeBytes / (1024 * 1024 * 1024)) * 10) / 10;
      baseFootprintMb = Math.round(sizeBytes / (1024 * 1024));
    } else {
      // Parse parameter count from tag (e.g. "12b", "7b", "135m", "1.5b")
      const paramMatch =
        (parameterSizeStr || modelId).match(/(\d+(?:\.\d+)?)\s*([bm])/i);
      if (paramMatch && paramMatch[1] && paramMatch[2]) {
        const val = parseFloat(paramMatch[1]);
        const unit = paramMatch[2].toLowerCase();
        if (unit === "m") {
          baseFootprintGb = Math.max(0.3, Math.round((val / 1000) * 2 * 10) / 10);
        } else {
          // Typically ~0.7 to 0.8 GB per billion parameters for 4-bit quantizations
          baseFootprintGb = Math.max(1.0, Math.round(val * 0.75 * 10) / 10);
        }
        baseFootprintMb = Math.round(baseFootprintGb * 1024);
      }
    }

    // Scale KV cache overhead with parameter size / hidden dimension
    if (baseFootprintGb <= 1.5) {
      kvCachePer1kTokensMb = 32;
    } else if (baseFootprintGb <= 4.0) {
      kvCachePer1kTokensMb = 80;
    } else if (baseFootprintGb <= 7.0) {
      kvCachePer1kTokensMb = 128;
    } else if (baseFootprintGb <= 11.0) {
      kvCachePer1kTokensMb = 160;
    } else {
      kvCachePer1kTokensMb = 256;
    }

    return {
      modelId,
      baseFootprintGb,
      baseFootprintMb,
      kvCachePer1kTokensMb,
    };
  }

  /**
   * Dynamically populates or refreshes model profiles from installed models list.
   */
  public syncFromInstalledModels(
    installed: readonly {
      name?: string;
      model?: string;
      sizeBytes?: number;
      size?: number;
      details?: {
        parameter_size?: string;
        parameterSize?: string;
        quantization_level?: string;
        [key: string]: unknown;
      };
    }[],
  ): void {
    for (const item of installed) {
      const tag = item.name || item.model;
      if (!tag) continue;
      const size = item.sizeBytes ?? item.size;
      const paramSize =
        item.details?.parameterSize ?? item.details?.parameter_size;
      const profile = ModelVramCatalog.estimateProfileFromTag(
        tag,
        size,
        paramSize,
      );
      this.registerProfile(profile);
    }
  }

  /**
   * Retrieves profile for given model ID with substring matching fallback and dynamic estimation.
   *
   * @param modelId - Exact or partial model name (e.g., 'qwen2.5-coder:7b-instruct-q4_K_M')
   * @returns ModelVramProfile if resolved, or dynamically estimated.
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
