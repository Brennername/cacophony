import { readFileSync } from "fs";

/**
 * OomPredictiveGuard class to monitor system memory and intercept task dispatch if memory availability drops below 1.5 GB.
 */
export class OomPredictiveGuard {
  private static readonly MEM_THRESHOLD = 1.5 * 1024 * 1024 * 1024; // 1.5 GB in bytes

  /**
   * Checks the current available memory and throws an error if it falls below the threshold.
   */
  public checkMemoryAvailability(): void {
    const memInfo = this.getMemInfo();
    const memAvailable = parseInt(memInfo["MemAvailable"] || "0", 10) * 1024; // Convert from KB to bytes

    if (memAvailable < OomPredictiveGuard.MEM_THRESHOLD) {
      throw new Error(
        `Memory availability is below threshold: ${memAvailable} bytes`,
      );
    }
  }

  /**
   * Reads and parses the /proc/meminfo file to get memory information.
   * @returns An object containing memory information from /proc/meminfo.
   */
  private getMemInfo(): Record<string, string> {
    const memInfoContent = readFileSync("/proc/meminfo", "utf-8");
    const memInfo: Record<string, string> = {};

    memInfoContent.split("\n").forEach((line) => {
      const [key, value] = line.split(":");
      if (key && value) {
        memInfo[key.trim()] = value.trim();
      }
    });

    return memInfo;
  }
}
