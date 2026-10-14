import * as fs from "node:fs";

export interface SystemMemoryPressureReport {
  readonly isUnderPressure: boolean;
  readonly memAvailableBytes: number;
  readonly memTotalBytes: number;
  readonly thresholdBytes: number;
}

/**
 * OomPredictiveGuard class to monitor system memory and intercept task dispatch
 * if system memory availability drops below 1.5 GB (T68.6).
 */
export class OomPredictiveGuard {
  public static readonly DEFAULT_THRESHOLD_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB in bytes

  private readonly thresholdBytes: number;
  private readonly meminfoPath: string;
  private onPressureWarning?: ((report: SystemMemoryPressureReport) => void) | undefined;

  constructor(options?: {
    thresholdBytes?: number;
    meminfoPath?: string;
    onPressureWarning?: (report: SystemMemoryPressureReport) => void;
  }) {
    this.thresholdBytes = options?.thresholdBytes ?? OomPredictiveGuard.DEFAULT_THRESHOLD_BYTES;
    this.meminfoPath = options?.meminfoPath ?? "/proc/meminfo";
    this.onPressureWarning = options?.onPressureWarning;
  }

  /**
   * Registers a warning callback triggered when memory drops below threshold.
   */
  public setPressureWarningHandler(handler: (report: SystemMemoryPressureReport) => void): void {
    this.onPressureWarning = handler;
  }

  /**
   * Evaluates current system memory pressure (T68.6.2).
   * Parses MemAvailable and MemTotal from /proc/meminfo or mock path.
   */
  public evaluateSystemMemoryPressure(): SystemMemoryPressureReport {
    const memInfo = this.getMemInfo();
    const memAvailableKb = parseInt(memInfo["MemAvailable"] || "0", 10);
    const memTotalKb = parseInt(memInfo["MemTotal"] || "0", 10);

    const memAvailableBytes = memAvailableKb * 1024;
    const memTotalBytes = memTotalKb * 1024;

    const isUnderPressure = memAvailableBytes < this.thresholdBytes;

    const report: SystemMemoryPressureReport = {
      isUnderPressure,
      memAvailableBytes,
      memTotalBytes,
      thresholdBytes: this.thresholdBytes,
    };

    if (isUnderPressure && this.onPressureWarning) {
      this.onPressureWarning(report);
    }

    return report;
  }

  /**
   * Checks the current available memory and throws an error if it falls below the threshold.
   */
  public checkMemoryAvailability(): void {
    const report = this.evaluateSystemMemoryPressure();
    if (report.isUnderPressure) {
      throw new Error(
        `Memory availability is below threshold: ${report.memAvailableBytes} bytes (threshold: ${this.thresholdBytes} bytes)`,
      );
    }
  }

  /**
   * Reads and parses /proc/meminfo to extract memory metrics.
   */
  private getMemInfo(): Record<string, string> {
    try {
      if (!fs.existsSync(this.meminfoPath)) {
        return {
          MemAvailable: (16 * 1024 * 1024).toString(),
          MemTotal: (32 * 1024 * 1024).toString(),
        };
      }
      const memInfoContent = fs.readFileSync(this.meminfoPath, "utf-8");
      const memInfo: Record<string, string> = {};

      for (const line of memInfoContent.split("\n")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim().split(/\s+/)[0] || "";
          memInfo[key] = value;
        }
      }

      return memInfo;
    } catch {
      return {};
    }
  }
}
