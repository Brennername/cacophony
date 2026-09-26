import type { ThermalZone } from "@cacophony/shared-types";
import type { IHardwareTelemetryProvider } from "./IHardwareTelemetryProvider.js";

export interface ThermalEvaluation {
  readonly tempCelsius: number;
  readonly zone: ThermalZone;
  readonly pacingDelaySeconds: number;
  readonly emergencyHalt: boolean;
}

export interface ThermalGovernorOptions {
  readonly blueMax?: number;
  readonly greenMax?: number;
  readonly yellowMax?: number;
  readonly orangeMax?: number;
  readonly redMax?: number;
  readonly emergencyShutdownTemp?: number;
  readonly coolOffEnabled?: boolean;
}

/**
 * ThermalGovernor
 *
 * Enforces hardware thermal safety thresholds during autonomous 24/7 task execution.
 * Configured with exact fencepost bands:
 * - Below 80°C: Blue (Cool)
 * - 80°C - 85°C: Green (Nominal)
 * - 85°C - 90°C: Yellow (Warm)
 * - 90°C - 95°C: Orange (Hot)
 * - 95°C - 100°C: Red (Critical)
 * - 100°C - 105°C: Fire Engine Red (Danger)
 * - Above 105°C: Emergency Shutdown Cutoff (halts scheduler queue immediately)
 *
 * Cool-off pacing periods are configurable and default to OFF (letting hardware APU
 * governor manage its own throttling).
 */
export class ThermalGovernor {
  public readonly blueMax: number;
  public readonly greenMax: number;
  public readonly yellowMax: number;
  public readonly orangeMax: number;
  public readonly redMax: number;
  public readonly emergencyShutdownTemp: number;
  public readonly coolOffEnabled: boolean;
  private readonly isLegacy3Point: boolean;
  private readonly legacyNominalMax: number;
  private readonly legacyWarmMax: number;
  private readonly legacyElevatedMax: number;

  constructor(
    nominalOrOptions?: number | ThermalGovernorOptions,
    warmMax?: number,
    elevatedMax?: number
  ) {
    if (typeof nominalOrOptions === "number") {
      this.isLegacy3Point = true;
      this.legacyNominalMax = nominalOrOptions;
      this.legacyWarmMax = warmMax ?? 80;
      this.legacyElevatedMax = elevatedMax ?? 90;

      this.blueMax = nominalOrOptions;
      this.greenMax = this.legacyWarmMax;
      this.yellowMax = this.legacyElevatedMax;
      this.orangeMax = 95;
      this.redMax = 100;
      this.emergencyShutdownTemp = 105;
      this.coolOffEnabled = true;
    } else {
      this.isLegacy3Point = false;
      this.legacyNominalMax = 80;
      this.legacyWarmMax = 85;
      this.legacyElevatedMax = 90;

      const opts = nominalOrOptions ?? {};
      this.blueMax = opts.blueMax ?? 80;
      this.greenMax = opts.greenMax ?? 85;
      this.yellowMax = opts.yellowMax ?? 90;
      this.orangeMax = opts.orangeMax ?? 95;
      this.redMax = opts.redMax ?? 100;
      this.emergencyShutdownTemp = opts.emergencyShutdownTemp ?? 105;
      this.coolOffEnabled = opts.coolOffEnabled ?? (process.env["THERMAL_COOLOFF_ENABLED"] === "true");
    }
  }

  /**
   * Evaluates degrees Celsius against configured thermal limits and emergency shutdown threshold.
   */
  public evaluate(tempCelsius: number): ThermalEvaluation {
    const isEmergency = tempCelsius >= this.emergencyShutdownTemp;

    if (this.isLegacy3Point) {
      if (tempCelsius >= this.legacyElevatedMax) {
        return {
          tempCelsius,
          zone: "Danger",
          pacingDelaySeconds: 10,
          emergencyHalt: isEmergency
        };
      }
      if (tempCelsius >= this.legacyWarmMax) {
        return {
          tempCelsius,
          zone: "Elevated",
          pacingDelaySeconds: 15,
          emergencyHalt: false
        };
      }
      if (tempCelsius >= this.legacyNominalMax) {
        return {
          tempCelsius,
          zone: "Warm",
          pacingDelaySeconds: 5,
          emergencyHalt: false
        };
      }
      return {
        tempCelsius,
        zone: "Nominal",
        pacingDelaySeconds: 0,
        emergencyHalt: false
      };
    }

    if (tempCelsius >= this.redMax) {
      return {
        tempCelsius,
        zone: "Danger",
        pacingDelaySeconds: this.coolOffEnabled ? 10 : 0,
        emergencyHalt: isEmergency
      };
    }
    if (tempCelsius >= this.orangeMax) {
      return {
        tempCelsius,
        zone: "Danger",
        pacingDelaySeconds: this.coolOffEnabled ? 5 : 0,
        emergencyHalt: false
      };
    }
    if (tempCelsius >= this.yellowMax) {
      return {
        tempCelsius,
        zone: "Elevated",
        pacingDelaySeconds: this.coolOffEnabled ? 3 : 0,
        emergencyHalt: false
      };
    }
    if (tempCelsius >= this.greenMax) {
      return {
        tempCelsius,
        zone: "Warm",
        pacingDelaySeconds: 0,
        emergencyHalt: false
      };
    }
    return {
      tempCelsius,
      zone: "Nominal",
      pacingDelaySeconds: 0,
      emergencyHalt: false
    };
  }

  /**
   * Samples current hardware temperature and evaluates thermal limits.
   * If cool-off is enabled and temperature is in Danger zone, paces execution.
   * If emergency cutoff is breached, flags emergency halt.
   */
  public async enforcePacing(provider: IHardwareTelemetryProvider): Promise<ThermalEvaluation> {
    const metrics = await provider.sample();
    const evalResult = this.evaluate(metrics.edgeTempCelsius);

    if (evalResult.emergencyHalt) {
      console.error(
        `[ThermalGovernor] CRITICAL OUCH!: Hardware temperature ${metrics.edgeTempCelsius}C exceeds emergency cutoff ${this.emergencyShutdownTemp}C. Triggering queue halt.`
      );
      return evalResult;
    }

    if (!this.coolOffEnabled) {
      return evalResult;
    }

    // Optional active cool-off loop (only when explicitly enabled)
    let currentMetrics = metrics;
    let currentEval = evalResult;
    while (currentEval.zone === "Danger" && !currentEval.emergencyHalt) {
      await this.sleep(currentEval.pacingDelaySeconds * 1000);
      currentMetrics = await provider.sample();
      currentEval = this.evaluate(currentMetrics.edgeTempCelsius);
      if (currentEval.tempCelsius < this.yellowMax) {
        break;
      }
    }

    return currentEval;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
