import type {
  ModelLifecycleRole,
  ModelLifecycleTier,
  UpsertModelRosterInput,
} from "@cacophony/shared-types";

export interface InferredModelConfig {
  readonly modelId: string;
  readonly parameterSizeBillions: number;
  readonly family: string;
  readonly suggestedTier: ModelLifecycleTier;
  readonly suggestedRoles: readonly ModelLifecycleRole[];
  readonly concurrencyLimit: number;
  readonly numCtx: number;
  readonly numPredict: number;
  readonly temperature: number;
  readonly isProtected: boolean;
  readonly notes: string;
}

/**
 * ModelMetadataInferrer
 *
 * Inspects raw model tags (e.g. "phi4", "deepseek-coder-v2:16b", "gemma3:4b")
 * and extracts semantic metadata including parameter size, model family,
 * optimal lifecycle tier, functional roles, context window, and sampling parameters.
 */
export class ModelMetadataInferrer {
  /**
   * Infers comprehensive operational configuration from a raw model tag.
   */
  public static infer(modelId: string, isExistingRosterEmpty: boolean = false): InferredModelConfig {
    const clean = modelId.toLowerCase().trim();

    // 1. Extract parameter size (e.g. 14b, 16b, 7b, 4b, 135m, 22b, phi4)
    let parameterSize = 7.0; // default assumption
    if (clean.includes("135m")) {
      parameterSize = 0.135;
    } else if (clean.includes("270m")) {
      parameterSize = 0.27;
    } else {
      const match = clean.match(/(?:^|[:._\-/])([0-9]+(?:\.[0-9]+)?)(b|m)\b/i);
      if (match && match[1] && match[2]) {
        const val = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        parameterSize = unit === "m" ? val / 1000 : val;
      } else if (clean.includes("phi-4") || clean.includes("phi4")) {
        parameterSize = 14.0;
      }
    }

    // 2. Identify model family
    let family = "unknown";
    if (clean.includes("phi")) family = "phi";
    else if (clean.includes("deepseek")) family = "deepseek";
    else if (clean.includes("qwen")) family = "qwen";
    else if (clean.includes("gemma")) family = "gemma";
    else if (clean.includes("mistral") || clean.includes("codestral")) family = "mistral";
    else if (clean.includes("llama")) family = "llama";
    else if (clean.includes("smollm")) family = "smollm";

    // 3. Infer roles
    const roles: ModelLifecycleRole[] = [];
    const isCoder = clean.includes("coder") || clean.includes("code") || clean.includes("deepseek");
    const isReasoning =
      clean.includes("phi") ||
      clean.includes("r1") ||
      clean.includes("reasoning") ||
      clean.includes("math");
    const isLightweight = parameterSize <= 4.0;

    if (isCoder) {
      roles.push("implementer", "reviewer");
    }
    if (isReasoning) {
      roles.push("architect", "reasoning");
      if (!roles.includes("reviewer")) roles.push("reviewer");
    }
    if (isLightweight) {
      roles.push("doc", "triage");
    }

    // Fallback if no specific role triggered
    if (roles.length === 0) {
      roles.push("implementer", "reviewer");
    }

    // 4. Infer Tier: Core workhorses go to ROSTER; specialized/heavy models go to BULLPEN or BOUTIQUE
    let suggestedTier: ModelLifecycleTier = "BULLPEN";
    if (
      isExistingRosterEmpty ||
      clean.includes("deepseek-coder-v2:16b") ||
      clean.includes("qwen2.5-coder:7b")
    ) {
      suggestedTier = "ROSTER";
    } else if (parameterSize >= 22.0) {
      suggestedTier = "BOUTIQUE";
    }

    // 5. Concurrency limit (16GB APU hardware guardrail)
    const concurrencyLimit = parameterSize >= 14.0 ? 1 : 2;

    // 6. Context window & max output tokens
    let numCtx = 8192;
    if (parameterSize <= 4.0) {
      numCtx = 4096;
    } else if (clean.includes("codestral")) {
      numCtx = 32768;
    } else if (clean.includes("deepseek") || clean.includes("qwen2.5")) {
      numCtx = 16384;
    }
    const numPredict = isReasoning || isCoder ? 4096 : 2048;
    const temperature = isReasoning ? 0.1 : 0.2;

    return {
      modelId,
      parameterSizeBillions: parameterSize,
      family,
      suggestedTier,
      suggestedRoles: roles,
      concurrencyLimit,
      numCtx,
      numPredict,
      temperature,
      isProtected: true,
      notes: `Auto-discovered model (${family}, ~${parameterSize}B). Inferred roles: ${roles.join(", ")}`,
    };
  }

  /**
   * Translates inferred metadata into a database roster entry payload.
   */
  public static toRosterInput(config: InferredModelConfig): UpsertModelRosterInput {
    return {
      modelId: config.modelId,
      tier: config.suggestedTier,
      roles: config.suggestedRoles,
      concurrencyLimit: config.concurrencyLimit,
      isActive: true,
      isProtected: config.isProtected,
      notes: config.notes,
    };
  }
}
