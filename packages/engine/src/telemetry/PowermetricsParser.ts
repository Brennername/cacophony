/**
 * @file PowermetricsParser.ts
 * Parser for Apple Silicon macOS powermetrics sampler output dumps.
 * Safely handles arbitrary multi-line dumps, unexpected headers, and missing sections.
 */

export interface PowermetricsDump {
  readonly thermalPressureLevel: string;
  readonly dieTempCelsius?: number | undefined;
  readonly cpuTempCelsius?: number | undefined;
  readonly gpuTempCelsius?: number | undefined;
  readonly cpuPowerMw?: number | undefined;
  readonly gpuPowerMw?: number | undefined;
  readonly combinedPowerMw?: number | undefined;
}

/**
 * Parses multi-line stdout dumps from `powermetrics`.
 * Extracts thermal and power metrics defensively without throwing exceptions on malformed input.
 *
 * @param dump - Raw text output from powermetrics
 * @returns Parsed PowermetricsDump object with available metrics
 */
export function parsePowermetricsDump(dump: string): PowermetricsDump {
  const result: {
    thermalPressureLevel: string;
    dieTempCelsius?: number;
    cpuTempCelsius?: number;
    gpuTempCelsius?: number;
    cpuPowerMw?: number;
    gpuPowerMw?: number;
    combinedPowerMw?: number;
  } = {
    thermalPressureLevel: "Nominal",
  };

  if (!dump || typeof dump !== "string") {
    return result;
  }

  try {
    const lines = dump.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Extract thermal pressure: "Current pressure level: Nominal"
      const pressureMatch = line.match(/Current pressure level:\s*([a-zA-Z0-9_-]+)/i);
      if (pressureMatch && pressureMatch[1]) {
        result.thermalPressureLevel = pressureMatch[1];
        continue;
      }

      // Extract die temperature: "Die temperature: 48.50 C"
      const dieMatch = line.match(/Die temperature:\s*([0-9]+(?:\.[0-9]+)?)\s*C/i);
      if (dieMatch && dieMatch[1]) {
        const val = parseFloat(dieMatch[1]);
        if (Number.isFinite(val)) result.dieTempCelsius = val;
        continue;
      }

      // Extract CPU temperature
      const cpuTempMatch = line.match(/CPU temperature:\s*([0-9]+(?:\.[0-9]+)?)\s*C/i);
      if (cpuTempMatch && cpuTempMatch[1]) {
        const val = parseFloat(cpuTempMatch[1]);
        if (Number.isFinite(val)) result.cpuTempCelsius = val;
        continue;
      }

      // Extract GPU temperature
      const gpuTempMatch = line.match(/GPU temperature:\s*([0-9]+(?:\.[0-9]+)?)\s*C/i);
      if (gpuTempMatch && gpuTempMatch[1]) {
        const val = parseFloat(gpuTempMatch[1]);
        if (Number.isFinite(val)) result.gpuTempCelsius = val;
        continue;
      }

      // Extract CPU Power in mW
      const cpuPowerMatch = line.match(/CPU Power:\s*([0-9]+(?:\.[0-9]+)?)\s*mW/i);
      if (cpuPowerMatch && cpuPowerMatch[1]) {
        const val = parseFloat(cpuPowerMatch[1]);
        if (Number.isFinite(val)) result.cpuPowerMw = val;
        continue;
      }

      // Extract GPU Power in mW
      const gpuPowerMatch = line.match(/GPU Power:\s*([0-9]+(?:\.[0-9]+)?)\s*mW/i);
      if (gpuPowerMatch && gpuPowerMatch[1]) {
        const val = parseFloat(gpuPowerMatch[1]);
        if (Number.isFinite(val)) result.gpuPowerMw = val;
        continue;
      }

      // Extract Combined Power in mW
      if (line.includes("Combined Power")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx !== -1) {
          const afterColon = line.slice(colonIdx + 1).trim();
          const combinedMatch = afterColon.match(/^([0-9]+(?:\.[0-9]+)?)\s*mW/i);
          if (combinedMatch && combinedMatch[1]) {
            const val = parseFloat(combinedMatch[1]);
            if (Number.isFinite(val)) result.combinedPowerMw = val;
            continue;
          }
        }
      }
    }
  } catch {
    // Return graceful partial result on any parser anomaly
  }

  return result;
}
