/**
 * @file NvidiaSmiParser.ts
 * Parser for nvidia-smi CSV telemetry output.
 * Robustly parses CSV rows and safely discards corrupted or malformed lines.
 */

export interface NvidiaGpuSample {
  readonly index: number;
  readonly gpuUtilizationPercent: number;
  readonly memoryUsedMb: number;
  readonly memoryTotalMb: number;
  readonly temperatureCelsius: number;
  readonly powerDrawWatts?: number | undefined;
}

/**
 * Parses multi-line CSV output from `nvidia-smi --query-gpu=... --format=csv,noheader,nounits`.
 * Discards headers, error messages, and corrupted rows missing required delimiter columns.
 *
 * @param csvOutput - Raw CSV string output
 * @returns Array of validated Nvidia GPU metrics
 */
export function parseNvidiaSmiCsv(csvOutput: string): readonly NvidiaGpuSample[] {
  if (!csvOutput || typeof csvOutput !== "string") {
    return [];
  }

  const lines = csvOutput.split("\n");
  const samples: NvidiaGpuSample[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.toLowerCase().includes("nvidia-smi")) {
      continue;
    }

    // Must contain comma delimiter
    if (!line.includes(",")) {
      continue;
    }

    const columns = line.split(",").map((c) => c.trim());
    // Minimum expected columns: index, gpuUtilization, memUsed, memTotal, temp
    if (columns.length < 5) {
      continue;
    }

    const index = parseInt(columns[0] ?? "", 10);
    const gpuUtil = parseFloat(columns[1] ?? "");
    const memUsed = parseFloat(columns[2] ?? "");
    const memTotal = parseFloat(columns[3] ?? "");
    const temp = parseFloat(columns[4] ?? "");
    const power = columns[5] !== undefined ? parseFloat(columns[5]) : undefined;

    // Discard rows with unparseable numeric values
    if (
      !Number.isFinite(index) ||
      !Number.isFinite(gpuUtil) ||
      !Number.isFinite(memUsed) ||
      !Number.isFinite(memTotal) ||
      !Number.isFinite(temp)
    ) {
      continue;
    }

    samples.push({
      index,
      gpuUtilizationPercent: Math.min(100.0, Math.max(0.0, gpuUtil)),
      memoryUsedMb: Math.max(0.0, memUsed),
      memoryTotalMb: Math.max(0.0, memTotal),
      temperatureCelsius: temp,
      powerDrawWatts: power !== undefined && Number.isFinite(power) ? power : undefined,
    });
  }

  return samples;
}
