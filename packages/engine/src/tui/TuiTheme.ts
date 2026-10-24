/**
 * Supported color themes for Terminal UI rendering.
 */
export type TuiThemeName = "dark" | "light" | "high-contrast";

/**
 * ANSI Color Palette definitions for TUI themes.
 */
export interface TuiColorPalette {
  readonly name: TuiThemeName;
  readonly reset: string;
  readonly bold: string;
  readonly dim: string;
  readonly inverse: string;
  // Border & Structural colors
  readonly border: string;
  readonly title: string;
  readonly activeBorder: string;
  // Syntax & Content colors
  readonly text: string;
  readonly textMuted: string;
  readonly code: string;
  readonly keyword: string;
  readonly string: string;
  readonly number: string;
  // Status & Telemetry colors
  readonly info: string;
  readonly success: string;
  readonly warn: string;
  readonly danger: string;
  readonly highlight: string;
}

/**
 * ANSI Escape sequences including 24-bit TrueColor and 256-color calibrated shades.
 */
export const ANSI_CODES = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  inverse: "\x1b[7m",
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
  // Calibrated WCAG 2.1 AA compliant truecolor shades for light theme (on white background)
  darkAmber: "\x1b[38;2;160;80;0m", // contrast > 4.5:1 on white
  darkGreen: "\x1b[38;2;0;128;0m",  // contrast > 4.5:1 on white
  darkBlue: "\x1b[38;2;0;64;192m",  // contrast > 4.5:1 on white
  darkRed: "\x1b[38;2;180;0;0m",    // contrast > 4.5:1 on white
  darkMagenta: "\x1b[38;2;140;0;140m", // contrast > 4.5:1 on white
  darkGray: "\x1b[38;2;80;80;80m",  // contrast > 4.5:1 on white
  bgBlack: "\x1b[40m",
  bgBlue: "\x1b[44m",
  bgDarkGray: "\x1b[100m",
} as const;

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB color.
 */
export function calculateRelativeLuminance(r: number, g: number, b: number): number {
  const normalize = (c: number): number => {
    const val = c / 255;
    return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
}

/**
 * Calculates WCAG 2.1 contrast ratio between two sRGB colors.
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter luminance.
 */
export function calculateContrastRatio(
  rgb1: readonly [number, number, number],
  rgb2: readonly [number, number, number],
): number {
  const l1 = calculateRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = calculateRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Pre-defined theme palettes adhering to WCAG 2.1 AA standards (Phase S4 T-S4.3).
 * Normal text elements maintain at least 4.5:1 contrast against theme background.
 * Large text and structural borders maintain at least 3.0:1 contrast.
 */
export const TUI_PALETTES: Record<TuiThemeName, TuiColorPalette> = {
  dark: {
    name: "dark",
    reset: ANSI_CODES.reset,
    bold: ANSI_CODES.bold,
    dim: ANSI_CODES.dim,
    inverse: ANSI_CODES.inverse,
    border: ANSI_CODES.gray,
    title: ANSI_CODES.brightCyan + ANSI_CODES.bold,
    activeBorder: ANSI_CODES.cyan,
    text: ANSI_CODES.brightWhite,
    textMuted: ANSI_CODES.gray,
    code: ANSI_CODES.brightYellow,
    keyword: ANSI_CODES.brightMagenta,
    string: ANSI_CODES.brightGreen,
    number: ANSI_CODES.brightYellow,
    info: ANSI_CODES.brightCyan,
    success: ANSI_CODES.brightGreen,
    warn: ANSI_CODES.brightYellow,
    danger: ANSI_CODES.brightRed,
    highlight: ANSI_CODES.brightCyan,
  },
  light: {
    name: "light",
    reset: ANSI_CODES.reset,
    bold: ANSI_CODES.bold,
    dim: ANSI_CODES.dim,
    inverse: ANSI_CODES.inverse,
    border: ANSI_CODES.darkGray,
    title: ANSI_CODES.darkBlue + ANSI_CODES.bold,
    activeBorder: ANSI_CODES.darkBlue,
    text: ANSI_CODES.black,
    textMuted: ANSI_CODES.darkGray,
    code: ANSI_CODES.darkMagenta,
    keyword: ANSI_CODES.darkBlue,
    string: ANSI_CODES.darkGreen,
    number: ANSI_CODES.darkAmber,
    info: ANSI_CODES.darkBlue,
    success: ANSI_CODES.darkGreen,
    warn: ANSI_CODES.darkAmber,
    danger: ANSI_CODES.darkRed,
    highlight: ANSI_CODES.darkMagenta,
  },
  "high-contrast": {
    name: "high-contrast",
    reset: ANSI_CODES.reset,
    bold: ANSI_CODES.bold,
    dim: "",
    inverse: ANSI_CODES.inverse,
    border: ANSI_CODES.brightWhite,
    title: ANSI_CODES.brightYellow + ANSI_CODES.bold,
    activeBorder: ANSI_CODES.brightYellow,
    text: ANSI_CODES.brightWhite,
    textMuted: ANSI_CODES.brightWhite,
    code: ANSI_CODES.brightGreen,
    keyword: ANSI_CODES.brightCyan,
    string: ANSI_CODES.brightYellow,
    number: ANSI_CODES.brightMagenta,
    info: ANSI_CODES.brightCyan,
    success: ANSI_CODES.brightGreen,
    warn: ANSI_CODES.brightYellow,
    danger: ANSI_CODES.brightRed,
    highlight: ANSI_CODES.brightYellow,
  },
};
