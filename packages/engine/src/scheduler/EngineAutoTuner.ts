import type { ModelProfileRepository } from "@cacophony/db";
import type { ModelHealthRepository } from "@cacophony/db";
import type { ModelTuningProfile } from "@cacophony/shared-types";

export interface HardwareVramSpec {
  readonly totalVramGb: number;
  readonly availableVramGb: number;
}

export interface AutoTunerOptions {
  readonly profileRepo: ModelProfileRepository;
  readonly healthRepo?: ModelHealthRepository | undefined;
  readonly hardwareSpec?: HardwareVramSpec | undefined;
}

/**
 * EngineAutoTuner
 *
 * Analyzes model historical inference efficiency, error/truncation frequency,
 * and host GPU/APU VRAM budget to compute optimal context limits (`num_ctx`)
 * and token generation limits (`num_predict`).
 */
export class EngineAutoTuner {
  private readonly profileRepo: ModelProfileRepository;
  private readonly healthRepo?: ModelHealthRepository | undefined;
  private readonly hardwareSpec: HardwareVramSpec;

  constructor(options: AutoTunerOptions) {
    this.profileRepo = options.profileRepo;
    this.healthRepo = options.healthRepo;
    this.hardwareSpec = options.hardwareSpec || {
      totalVramGb: 16,
      availableVramGb: 12
    };
  }

  /**
   * Computes the mathematically optimal profile given model archetype,
   * hardware capacity, and historical truncation indicators.
   *
   * @param modelName Name of target model (e.g. "deepseek-r1:8b", "qwen2.5-coder:7b")
   * @param role Agent role assignment
   * @param truncationFrequency Optional count of observed truncation failures
   */
  public computeOptimalProfile(
    modelName: string,
    role: "architect" | "implementer" | "reviewer" = "implementer",
    truncationFrequency = 0
  ): Omit<ModelTuningProfile, "createdAt" | "updatedAt"> {
    const isReasoner = role === "architect" || modelName.includes("r1") || modelName.includes("reasoning");
    const vram = this.hardwareSpec.availableVramGb;

    // VRAM-aware context window scaling:
    // >= 24GB VRAM -> 32768 tokens
    // >= 12GB VRAM -> 16384 tokens
    // < 12GB VRAM -> 8192 tokens
    let numCtx = 8192;
    if (vram >= 24) {
      numCtx = 32768;
    } else if (vram >= 12) {
      numCtx = 16384;
    }

    // Constrain by explicit environment setting if provided (e.g. OLLAMA_NUM_CTX=8192)
    const envCtx = process.env["OLLAMA_NUM_CTX"] ? Number(process.env["OLLAMA_NUM_CTX"]) : null;
    if (envCtx && envCtx > 0) {
      numCtx = Math.min(numCtx, envCtx);
    }

    // Default prediction limits:
    // Reasoners require larger prediction limits to prevent thoughts cutting off mid-stream
    let numPredict = isReasoner ? 8192 : 4096;

    // Truncation-adaptive elevation:
    // If the model frequently truncates before code blocks emerge, raise prediction limit
    // Strictly capped at 8192 for coders to prevent multi-thousand token runaway timeouts
    if (truncationFrequency > 0) {
      const maxPredictCap = isReasoner ? 16384 : 8192;
      const elevation = Math.min(maxPredictCap, numPredict + (truncationFrequency * 2048));
      numPredict = elevation;
    }

    // Sampling configuration:
    // Reasoners require higher temperature (0.6) for creative architectural exploration
    // Coders require low temperature (0.05) for deterministic, syntactically clean code
    const temperature = isReasoner ? 0.6 : 0.05;
    const topP = isReasoner ? 0.95 : 0.9;
    const topK = 40;
    const repeatPenalty = 1.1;

    const id = `profile-${modelName.replace(/[^a-zA-Z0-9_-]/g, "_")}-${role}`;

    return {
      id,
      modelName,
      role,
      numPredict,
      numCtx,
      temperature,
      topK,
      topP,
      repeatPenalty,
      autoTuned: true,
      isActive: true
    };
  }

  /**
   * Executes autonomous auto-tuning across a list of target models,
   * querying health profiles if available, and saving tuned configurations to the database.
   */
  public async autoTuneModels(modelNames: readonly string[]): Promise<ModelTuningProfile[]> {
    const tunedProfiles: ModelTuningProfile[] = [];

    for (const model of modelNames) {
      const isReasoner = model.includes("r1") || model.includes("reasoning");
      const role = isReasoner ? "architect" : "implementer";

      let truncationCount = 0;
      if (this.healthRepo) {
        try {
          const health = await this.healthRepo.getProfile(model);
          // Only elevate prediction tokens when specifically encountering truncation errors,
          // rather than general execution timeouts or test failures which require tighter token bounds.
          const customFailures = (health as unknown as { readonly truncationFailures?: number });
          if (customFailures?.truncationFailures && customFailures.truncationFailures > 2) {
            truncationCount = Math.floor(customFailures.truncationFailures / 2);
          }
        } catch {
          // Gracefully default truncationCount to 0
        }
      }

      const optimal = this.computeOptimalProfile(model, role, truncationCount);
      const saved = await this.profileRepo.upsertProfile(optimal);
      tunedProfiles.push(saved);
    }

    return tunedProfiles;
  }
}
