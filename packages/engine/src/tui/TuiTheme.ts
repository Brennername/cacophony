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
 * ANSI Escape sequences.
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
  bgBlack: "\x1b[40m",
  bgBlue: "\x1b[44m",
  bgDarkGray: "\x1b[100m"
} as const;

/**
 * Pre-defined theme palettes adhering to system aesthetic standards.
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
    info: ANSI_CODES.brightBlue,
    success: ANSI_CODES.brightGreen,
    warn: ANSI_CODES.brightYellow,
    danger: ANSI_CODES.brightRed,
    highlight: ANSI_CODES.brightCyan
  },
  light: {
    name: "light",
    reset: ANSI_CODES.reset,
    bold: ANSI_CODES.bold,
    dim: ANSI_CODES.dim,
    inverse: ANSI_CODES.inverse,
    border: ANSI_CODES.blue,
    title: ANSI_CODES.blue + ANSI_CODES.bold,
    activeBorder: ANSI_CODES.magenta,
    text: ANSI_CODES.black,
    textMuted: ANSI_CODES.gray,
    code: ANSI_CODES.magenta,
    keyword: ANSI_CODES.blue,
    string: ANSI_CODES.green,
    number: ANSI_CODES.yellow,
    info: ANSI_CODES.blue,
    success: ANSI_CODES.green,
    warn: ANSI_CODES.yellow,
    danger: ANSI_CODES.red,
    highlight: ANSI_CODES.magenta
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
    highlight: ANSI_CODES.brightYellow
  }
};
