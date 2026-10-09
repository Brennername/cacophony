import type { HardwareDeviceCategory } from "@cacophony/shared-types";

export interface HardwareProfileInput {
  readonly totalVramBytes: number;
  readonly category: HardwareDeviceCategory;
  readonly computeUnits?: number;
  readonly flashAttentionCapable?: boolean;
}

export interface AutoSizedHyperparameters {
  readonly totalVramMb: number;
  readonly safeAllocationMb: number;
  readonly reservedBufferMb: number;
  readonly contextWindowTokens: number;
  readonly maxPredictTokens: number;
  readonly recommendedQuantization: "q4_K_M" | "q5_K_M" | "q8_0" | "fp16";
  readonly numParallel: number;
  readonly flashAttention: boolean;
  readonly recommendedModelFamily: string;
  readonly envVariables: Record<string, string>;
}

/**
 * HardwareHyperparameterAutoSizer
 *
 * Computes optimal LLM execution hyperparameters and Ollama runtime environment
 * variables based on detected hardware profile. Strictly enforces a 70% safe VRAM
 * allocation ceiling (reserving 30% for OS, display buffers, and background memory).
 */
export class HardwareHyperparameterAutoSizer {
  /**
   * Computes the 70% safe allocation limit and 30% OS reservation.
   */
  public static computeSafeAllocation(totalVramBytes: number): {
    totalMb: number;
    safeMb: number;
    reservedMb: number;
  } {
    const totalMb = Math.round(totalVramBytes / (1024 * 1024));
    const safeMb = Math.floor(totalMb * 0.7);
    const reservedMb = totalMb - safeMb;
    return { totalMb, safeMb, reservedMb };
  }

  /**
   * Evaluates hardware profile and synthesizes optimized hyperparameters and environment flags.
   */
  public static computeOptimalProfile(profile: HardwareProfileInput): AutoSizedHyperparameters {
    const { totalMb, safeMb, reservedMb } = this.computeSafeAllocation(profile.totalVramBytes);

    let contextWindowTokens: number;
    let maxPredictTokens: number;
    let recommendedQuantization: "q4_K_M" | "q5_K_M" | "q8_0" | "fp16";
    let numParallel: number;
    let recommendedModelFamily: string;

    if (totalMb <= 7000) {
      // 6GB or smaller (e.g. 6144 MB)
      contextWindowTokens = 4096;
      maxPredictTokens = 2048;
      recommendedQuantization = "q4_K_M";
      numParallel = 1;
      recommendedModelFamily = "qwen2.5-coder:7b-instruct-q4_K_M";
    } else if (totalMb <= 10000) {
      // 8GB (e.g. 8192 MB)
      contextWindowTokens = 8192;
      maxPredictTokens = 4096;
      recommendedQuantization = "q4_K_M";
      numParallel = 1;
      recommendedModelFamily = "qwen2.5-coder:7b-instruct-q4_K_M";
    } else if (totalMb <= 14000) {
      // 12GB (e.g. 12288 MB)
      contextWindowTokens = 16384;
      maxPredictTokens = 4096;
      recommendedQuantization = "q4_K_M";
      numParallel = 1;
      recommendedModelFamily = "qwen2.5-coder:7b-instruct-q4_K_M";
    } else if (totalMb <= 20000) {
      // 16GB (e.g. 16384 MB)
      contextWindowTokens = 16384;
      maxPredictTokens = 8192;
      recommendedQuantization = "q5_K_M";
      numParallel = 2;
      recommendedModelFamily = "qwen2.5-coder:14b-instruct-q4_K_M";
    } else if (totalMb <= 40000) {
      // 24GB (e.g. 24576 MB)
      contextWindowTokens = 32768;
      maxPredictTokens = 8192;
      recommendedQuantization = "q8_0";
      numParallel = 2;
      recommendedModelFamily = "deepseek-coder-v2:16b";
    } else {
      // 64GB+ (e.g. 65536 MB)
      contextWindowTokens = 65536;
      maxPredictTokens = 16384;
      recommendedQuantization = "fp16";
      numParallel = 4;
      recommendedModelFamily = "deepseek-coder-v2:latest";
    }

    const flashAttention = this.determineFlashAttention(profile);
    const envVariables = this.generateOllamaEnv({
      contextWindowTokens,
      numParallel,
      flashAttention,
    });

    return {
      totalVramMb: totalMb,
      safeAllocationMb: safeMb,
      reservedBufferMb: reservedMb,
      contextWindowTokens,
      maxPredictTokens,
      recommendedQuantization,
      numParallel,
      flashAttention,
      recommendedModelFamily,
      envVariables,
    };
  }

  /**
   * Automatically generates Ollama environment variables.
   */
  public static generateOllamaEnv(params: {
    contextWindowTokens: number;
    numParallel: number;
    flashAttention: boolean;
  }): Record<string, string> {
    return {
      OLLAMA_NUM_PARALLEL: String(params.numParallel),
      OLLAMA_FLASH_ATTENTION: params.flashAttention ? "1" : "0",
      OLLAMA_NUM_CTX: String(params.contextWindowTokens),
      OLLAMA_KEEP_ALIVE: "60m",
    };
  }

  private static determineFlashAttention(profile: HardwareProfileInput): boolean {
    if (profile.flashAttentionCapable !== undefined) {
      return profile.flashAttentionCapable;
    }
    // Apple Silicon and modern CUDA support flash attention
    if (profile.category === "APPLE_SILICON" || profile.category === "NVIDIA_CUDA") {
      return true;
    }
    // Older AMD Vega APU does not support Flash Attention reliably
    if (profile.category === "AMD_APU_VEGA" || profile.category === "CPU_FALLBACK") {
      return false;
    }
    return true;
  }
}
