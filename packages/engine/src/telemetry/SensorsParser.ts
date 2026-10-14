/**
 * @file SensorsParser.ts
 * Parser for Linux lm-sensors CLI output to extract thermal telemetry
 * across AMD, Intel, and generic hwmon kernel modules.
 */

export interface ParsedSensorsData {
  readonly tctlCelsius?: number | undefined;
  readonly edgeCelsius?: number | undefined;
  readonly packageIdCelsius?: number | undefined;
  readonly readings: Record<string, number>;
}

/**
 * Parses raw string output from the `sensors` command.
 * Extracts Celsius readings for Tctl, edge, and Package id lines,
 * as well as mapping all discovered sensor keys to their float values.
 *
 * @param output - Raw stdout string from lm-sensors
 * @returns Parsed structured thermal readings
 */
export function parseSensorsOutput(output: string): ParsedSensorsData {
  const readings: Record<string, number> = {};
  if (!output || typeof output !== "string") {
    return { readings };
  }

  const lines = output.split("\n");
  // Regex to extract sensor label and Celsius value:
  // e.g. "Tctl:         +45.2°C" or "edge:  +52.0 C" or "Package id 0:  +62.5°C"
  const sensorRegex = /^([a-zA-Z0-9_ -]+):\s*([+-]?\d+(?:\.\d+)?)\s*°?C/i;

  let tctlCelsius: number | undefined;
  let edgeCelsius: number | undefined;
  let packageIdCelsius: number | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("Adapter:") || !line.includes(":")) {
      continue;
    }

    const match = line.match(sensorRegex);
    if (match && match[1] && match[2]) {
      const label = match[1].trim();
      const val = parseFloat(match[2]);
      if (Number.isFinite(val)) {
        readings[label] = val;

        const lowerLabel = label.toLowerCase();
        if (lowerLabel === "tctl" && tctlCelsius === undefined) {
          tctlCelsius = val;
        } else if (lowerLabel === "edge" && edgeCelsius === undefined) {
          edgeCelsius = val;
        } else if (lowerLabel.startsWith("package id") && packageIdCelsius === undefined) {
          packageIdCelsius = val;
        }
      }
    }
  }

  return {
    tctlCelsius,
    edgeCelsius,
    packageIdCelsius,
    readings,
  };
}
