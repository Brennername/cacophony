/**
 * @file RadeontopParser.ts
 * Parser for AMD GPU radeontop CLI utility output.
 * Handles varied whitespace, optional prefixes, and percentage tokens.
 */

export interface ParsedRadeontopMetrics {
  readonly gpuBusyPercent: number;
  readonly vramPercent: number;
  readonly vramUsedMb?: number | undefined;
  readonly gttPercent: number;
  readonly gttUsedMb?: number | undefined;
  readonly sclkPercent?: number | undefined;
  readonly mclkPercent?: number | undefined;
}

/**
 * Parses a single dump line from `radeontop -d -`.
 * Tolerates irregular spaces, tabs, missing timestamp prefixes,
 * and varying unit annotations.
 *
 * @param line - Raw line from radeontop output
 * @returns Normalized GPU metric object
 */
export function parseRadeontopLine(line: string): ParsedRadeontopMetrics {
  const defaultMetrics: ParsedRadeontopMetrics = {
    gpuBusyPercent: 0.0,
    vramPercent: 0.0,
    gttPercent: 0.0,
  };

  if (!line || typeof line !== "string") {
    return defaultMetrics;
  }

  // Helper to extract a percentage given a token name (e.g. "gpu 45.00%", "vram  62.50%")
  const extractPercent = (token: string): number => {
    const regex = new RegExp(`\\b${token}\\s+([0-9]+(?:\\.[0-9]+)?)\\s*%`, "i");
    const match = line.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      return Number.isFinite(val) ? Math.min(100.0, Math.max(0.0, val)) : 0.0;
    }
    return 0.0;
  };

  // Helper to extract megabytes given a token name (e.g. "vram 62.50% 1024mb" or "vram 512MB")
  const extractMb = (token: string): number | undefined => {
    const regex = new RegExp(`\\b${token}\\b[^,]*?\\s+([0-9]+(?:\\.[0-9]+)?)\\s*mb`, "i");
    const match = line.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      return Number.isFinite(val) ? val : undefined;
    }
    return undefined;
  };

  const gpuBusyPercent = extractPercent("gpu");
  const vramPercent = extractPercent("vram");
  const vramUsedMb = extractMb("vram");
  const gttPercent = extractPercent("gtt");
  const gttUsedMb = extractMb("gtt");

  const sclkMatch = extractPercent("sclk");
  const mclkMatch = extractPercent("mclk");

  return {
    gpuBusyPercent,
    vramPercent,
    vramUsedMb,
    gttPercent,
    gttUsedMb,
    sclkPercent: sclkMatch > 0 ? sclkMatch : undefined,
    mclkPercent: mclkMatch > 0 ? mclkMatch : undefined,
  };
}
