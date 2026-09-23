import type { ThermalZone } from "@cacophony/shared-types";
import type { IHardwareTelemetryProvider } from "./IHardwareTelemetryProvider.js";

export interface ThermalEvaluation {
  readonly tempCelsius: number;
  readonly zone: ThermalZone;
  readonly pacingDelaySeconds: number;
}

/**
 * ThermalGovernor
 *
 * Enforces hardware thermal safety thresholds during autonomous 24/7 task execution.
 * Pauses or inserts pacing delays between inference tasks to prevent Vega APU overheating
 * and GPU compute ring watchdog resets.
 */
export class ThermalGovernor {
  private readonly nominalMax: number;
  private readonly warmMax: number;
  private readonly elevatedMax: number;

  constructor(nominalMax = 70, warmMax = 80, elevatedMax = 90) {
    this.nominalMax = nominalMax;
    this.warmMax = warmMax;
    this.elevatedMax = elevatedMax;
  }

  /**
   * Evaluates degrees Celsius against configured thermal limits.
   */
  public evaluate(tempCelsius: number): ThermalEvaluation {
    if (tempCelsius >= this.elevatedMax) {
      return { tempCelsius, zone: "Danger", pacingDelaySeconds: 10 };
    }
    if (tempCelsius >= this.warmMax) {
      return { tempCelsius, zone: "Elevated", pacingDelaySeconds: 15 };
    }
    if (tempCelsius >= this.nominalMax) {
      return { tempCelsius, zone: "Warm", pacingDelaySeconds: 5 };
    }
    return { tempCelsius, zone: "Nominal", pacingDelaySeconds: 0 };
  }

  /**
   * Samples current hardware temperature and applies necessary pacing delay.
   * If in Danger zone (>= 90°C), loops in 10-second intervals until temperature drops below 80°C.
   */
  public async enforcePacing(provider: IHardwareTelemetryProvider): Promise<ThermalEvaluation> {
    let metrics = await provider.sample();
    let evalResult = this.evaluate(metrics.edgeTempCelsius);

    // Danger Zone Emergency Cooling Loop
    while (evalResult.zone === "Danger") {
      await this.sleep(evalResult.pacingDelaySeconds * 1000);
      metrics = await provider.sample();
      evalResult = this.evaluate(metrics.edgeTempCelsius);
      if (evalResult.tempCelsius < this.warmMax) {
        break;
      }
    }

    // Warm / Elevated pacing delay
    if (evalResult.pacingDelaySeconds > 0) {
      await this.sleep(evalResult.pacingDelaySeconds * 1000);
    }

    return evalResult;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
