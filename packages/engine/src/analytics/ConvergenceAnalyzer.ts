export interface DerivativeResult {
  readonly velocityDelta: number; // 1st derivative (rate of change)
  readonly accelerationDelta: number; // 2nd derivative
}

export interface PlateauResult {
  readonly isPlateaued: boolean;
  readonly deltaRate: number;
  readonly epsilon: number;
  readonly reason: string;
}

export type FailureResolutionStrategy = "IN_SITU_MITIGATION" | "ARCHITECTURAL_TRIAGE";

export interface FailureModeAnalysis {
  readonly signature: string;
  readonly occurrences: number;
  readonly resolutionStrategy: FailureResolutionStrategy;
  readonly mitigationRecommendation: string;
}

/**
 * ConvergenceAnalyzer
 *
 * Calculus-based convergence engine evaluating discrete derivatives (velocity and
 * acceleration of success rates across execution windows), detecting stagnation plateaus,
 * and matching recurring failure patterns to actionable mitigation strategies.
 */
export class ConvergenceAnalyzer {
  /**
   * Computes the first discrete derivative (velocity) and second discrete derivative (acceleration)
   * across chronological rate samples.
   */
  public static calculateDerivatives(rates: readonly number[]): DerivativeResult {
    if (rates.length < 2) {
      return { velocityDelta: 0.0, accelerationDelta: 0.0 };
    }

    const n = rates.length;
    const current = rates[n - 1] ?? 0;
    const prev = rates[n - 2] ?? 0;
    const velocityDelta = Number((current - prev).toFixed(3));

    if (rates.length < 3) {
      return { velocityDelta, accelerationDelta: 0.0 };
    }

    const prevPrev = rates[n - 3] ?? 0;
    const prevVelocity = Number((prev - prevPrev).toFixed(3));
    const accelerationDelta = Number((velocityDelta - prevVelocity).toFixed(3));

    return { velocityDelta, accelerationDelta };
  }

  /**
   * Detects performance stagnation across nested windows (e.g. short vs long window).
   * Stagnation occurs when variance across windows collapses below delta epsilon.
   */
  public static detectPlateau(
    shortWindowRate: number,
    longWindowRate: number,
    epsilon: number = 2.5
  ): PlateauResult {
    const deltaRate = Number(Math.abs(shortWindowRate - longWindowRate).toFixed(2));
    const isPlateaued = deltaRate <= epsilon;

    let reason: string;
    if (isPlateaued) {
      reason = `Success rate difference (${deltaRate}%) is within convergence epsilon (${epsilon}%). Model trajectory has stabilized or stagnated.`;
    } else if (shortWindowRate > longWindowRate) {
      reason = `Short-term window shows upward acceleration (+${deltaRate}%).`;
    } else {
      reason = `Short-term window shows regression (-${deltaRate}%).`;
    }

    return {
      isPlateaued,
      deltaRate,
      epsilon,
      reason,
    };
  }

  /**
   * Identifies recurring failure modes from error log snippets and classifies them into
   * immediate in-situ mitigation versus architectural model triage.
   */
  public static evaluateFailureMode(errorLogs: readonly string[]): FailureModeAnalysis {
    if (errorLogs.length === 0) {
      return {
        signature: "NONE",
        occurrences: 0,
        resolutionStrategy: "IN_SITU_MITIGATION",
        mitigationRecommendation: "No failure signals recorded.",
      };
    }

    const signatures = {
      SYNTAX_OR_IMPORT: 0,
      TYPE_MISMATCH: 0,
      EMPTY_STUB: 0,
      TIMEOUT_HANG: 0,
    };

    for (const log of errorLogs) {
      const lower = log.toLowerCase();
      if (lower.includes("cannot find module") || lower.includes("syntaxerror") || lower.includes("unexpected token")) {
        signatures.SYNTAX_OR_IMPORT++;
      } else if (lower.includes("ts2322") || lower.includes("ts2345") || lower.includes("type '") || lower.includes("is not assignable")) {
        signatures.TYPE_MISMATCH++;
      } else if (lower.includes("stub") || lower.includes("todo") || lower.includes("not implemented")) {
        signatures.EMPTY_STUB++;
      } else if (lower.includes("timeout") || lower.includes("killed") || lower.includes("deadlock")) {
        signatures.TIMEOUT_HANG++;
      }
    }

    // Determine dominant signature
    let maxSig = "SYNTAX_OR_IMPORT";
    let maxCount = signatures.SYNTAX_OR_IMPORT;

    if (signatures.TYPE_MISMATCH > maxCount) {
      maxSig = "TYPE_MISMATCH";
      maxCount = signatures.TYPE_MISMATCH;
    }
    if (signatures.EMPTY_STUB > maxCount) {
      maxSig = "EMPTY_STUB";
      maxCount = signatures.EMPTY_STUB;
    }
    if (signatures.TIMEOUT_HANG > maxCount) {
      maxSig = "TIMEOUT_HANG";
      maxCount = signatures.TIMEOUT_HANG;
    }

    if (maxSig === "EMPTY_STUB" || maxSig === "TIMEOUT_HANG") {
      return {
        signature: maxSig,
        occurrences: maxCount,
        resolutionStrategy: "ARCHITECTURAL_TRIAGE",
        mitigationRecommendation:
          maxSig === "EMPTY_STUB"
            ? "Model repeatedly generates hollow placeholders. Escalate prompt with anti-stub AST constraints or route to higher capacity model."
            : "Task execution frequently exceeds timeout limit. Increase compute reservation or decompose task into smaller units.",
      };
    }

    return {
      signature: maxSig,
      occurrences: maxCount,
      resolutionStrategy: "IN_SITU_MITIGATION",
      mitigationRecommendation:
        maxSig === "SYNTAX_OR_IMPORT"
          ? "Apply automated AST import pruning and syntax scrubbers before re-running verification."
          : "Inject compiler diagnostic feedback into immediate surgical remediation loop.",
    };
  }
}
