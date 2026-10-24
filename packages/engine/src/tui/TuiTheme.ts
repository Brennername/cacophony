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
  readonly primary?: string;
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
 * Parses a 3-character or 6-character hexadecimal color string into an sRGB tuple.
 * Returns null if the provided input is invalid or improperly formatted.
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  if (typeof hex !== "string") {
    return null;
  }
  const cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length === 3) {
    if (!/^[0-9a-fA-F]{3}$/.test(cleaned)) {
      return null;
    }
    const r = parseInt(cleaned[0]! + cleaned[0]!, 16);
    const g = parseInt(cleaned[1]! + cleaned[1]!, 16);
    const b = parseInt(cleaned[2]! + cleaned[2]!, 16);
    return [r, g, b];
  } else if (cleaned.length === 6) {
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      return null;
    }
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

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
 * Validates and normalizes color input into an sRGB tuple.
 * Supports hex strings ('#fff', '#ffffff', 'ffffff') and [r, g, b] tuples.
 * Returns null if the color input cannot be safely evaluated.
 */
function normalizeColorToRgb(
  color: unknown,
): [number, number, number] | null {
  if (typeof color === "string") {
    return hexToRgb(color);
  }
  if (Array.isArray(color) && color.length === 3) {
    const [r, g, b] = color;
    if (
      typeof r === "number" &&
      typeof g === "number" &&
      typeof b === "number" &&
      !isNaN(r) &&
      !isNaN(g) &&
      !isNaN(b) &&
      r >= 0 &&
      r <= 255 &&
      g >= 0 &&
      g <= 255 &&
      b >= 0 &&
      b <= 255
    ) {
      return [r, g, b];
    }
  }
  return null;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors.
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter luminance.
 * Accepts sRGB tuples or hex string representations.
 * Returns NaN if either color input is malformed or invalid.
 */
export function calculateContrastRatio(
  color1: string | readonly [number, number, number],
  color2: string | readonly [number, number, number],
): number {
  const rgb1 = normalizeColorToRgb(color1);
  const rgb2 = normalizeColorToRgb(color2);

  if (!rgb1 || !rgb2) {
    return NaN;
  }

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
    primary: ANSI_CODES.brightBlue,
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
    primary: ANSI_CODES.blue,
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
    primary: ANSI_CODES.brightWhite,
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

/**
 * TuiThemeService
 *
 * Encapsulates theme state management, dynamic palette registration, runtime overrides,
 * and high-contrast accessibility switching for terminal user interfaces.
 */
export class TuiThemeService {
  private currentTheme: TuiThemeName = "dark";
  private readonly customPalettes: Map<TuiThemeName, TuiColorPalette>;

  constructor(initialTheme: TuiThemeName = "dark") {
    this.customPalettes = new Map();
    // Initialize clone of predefined palettes to allow isolated overrides
    for (const [key, palette] of Object.entries(TUI_PALETTES)) {
      this.customPalettes.set(key as TuiThemeName, { ...palette });
    }

    if (this.isValidThemeName(initialTheme)) {
      this.currentTheme = initialTheme;
    }
  }

  /**
   * Returns current active theme name.
   */
  public getCurrentTheme(): TuiThemeName {
    return this.currentTheme;
  }

  /**
   * Returns palette corresponding to active theme.
   */
  public getCurrentPalette(): TuiColorPalette {
    return this.getPalette(this.currentTheme);
  }

  /**
   * Retrieves color palette by theme name.
   * If themeName is omitted, returns the current theme palette.
   * If themeName is invalid or unknown, falls back gracefully to dark palette.
   */
  public getPalette(themeName?: string | TuiThemeName | null): TuiColorPalette {
    if (!themeName) {
      return (
        this.customPalettes.get(this.currentTheme) ?? TUI_PALETTES[this.currentTheme]
      );
    }

    if (this.isValidThemeName(themeName)) {
      return (
        this.customPalettes.get(themeName as TuiThemeName) ??
        TUI_PALETTES[themeName as TuiThemeName]
      );
    }

    // Graceful fallback for unexpected or invalid theme identifiers
    return this.customPalettes.get("dark") ?? TUI_PALETTES.dark;
  }

  /**
   * Switches the active theme.
   * Returns false without throwing if the theme name is invalid.
   */
  public setTheme(themeName: string | TuiThemeName | null | undefined): boolean {
    if (this.isValidThemeName(themeName)) {
      this.currentTheme = themeName as TuiThemeName;
      return true;
    }
    return false;
  }

  /**
   * Alias for setTheme to support multiple consumer naming conventions.
   */
  public switchTheme(themeName: string | TuiThemeName | null | undefined): boolean {
    return this.setTheme(themeName);
  }

  /**
   * Overrides specific color entries within a theme palette.
   * Empty or partial override objects are handled gracefully without modifying unspecified tokens.
   */
  public setPalette(
    themeName: string | TuiThemeName,
    overrides?: Partial<TuiColorPalette> | null,
  ): TuiColorPalette {
    const targetTheme: TuiThemeName = this.isValidThemeName(themeName)
      ? (themeName as TuiThemeName)
      : "dark";

    const base = this.customPalettes.get(targetTheme) ?? TUI_PALETTES[targetTheme];
    if (!overrides || typeof overrides !== "object") {
      return base;
    }

    const merged: TuiColorPalette = {
      ...base,
      ...overrides,
      name: targetTheme,
    };

    this.customPalettes.set(targetTheme, merged);
    return merged;
  }

  /**
   * Alias for setPalette for consumer parity.
   */
  public overridePalette(
    themeName: string | TuiThemeName,
    overrides?: Partial<TuiColorPalette> | null,
  ): TuiColorPalette {
    return this.setPalette(themeName, overrides);
  }

  /**
   * Resets customized palettes back to system defaults.
   */
  public resetPalette(themeName?: TuiThemeName): void {
    if (themeName && this.isValidThemeName(themeName)) {
      this.customPalettes.set(themeName, { ...TUI_PALETTES[themeName] });
    } else {
      for (const [key, palette] of Object.entries(TUI_PALETTES)) {
        this.customPalettes.set(key as TuiThemeName, { ...palette });
      }
    }
  }

  private isValidThemeName(val: unknown): val is TuiThemeName {
    return (
      typeof val === "string" &&
      (val === "dark" || val === "light" || val === "high-contrast")
    );
  }
}

/**
 * Alias ThemeService to TuiThemeService for broader consumer compatibility.
 */
export { TuiThemeService as ThemeService };

