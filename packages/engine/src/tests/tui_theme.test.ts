import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRelativeLuminance,
  calculateContrastRatio,
  TUI_PALETTES,
} from "../tui/TuiTheme.js";

describe("TUI Theme Contrast & Color Palette Calibration Tests (T-S4.3)", () => {
  it("should calculate relative luminance correctly according to WCAG 2.1 specifications", () => {
    const lumBlack = calculateRelativeLuminance(0, 0, 0);
    const lumWhite = calculateRelativeLuminance(255, 255, 255);

    assert.equal(lumBlack, 0);
    assert.equal(lumWhite, 1);

    // Standard mid-gray sRGB [128, 128, 128]
    const lumMidGray = calculateRelativeLuminance(128, 128, 128);
    assert.ok(lumMidGray > 0.2 && lumMidGray < 0.23);
  });

  it("should calculate contrast ratio between black and white as 21:1", () => {
    const ratio = calculateContrastRatio([0, 0, 0], [255, 255, 255]);
    assert.ok(Math.abs(ratio - 21.0) < 0.01);
  });

  it("should verify light theme calibrated colors meet WCAG 2.1 AA (>= 4.5:1) against white background", () => {
    const white: readonly [number, number, number] = [255, 255, 255];

    // Dark Amber (warning) [160, 80, 0]
    const warnRatio = calculateContrastRatio([160, 80, 0], white);
    assert.ok(
      warnRatio >= 4.5,
      `Warn contrast ratio ${warnRatio.toFixed(2)} must be >= 4.5:1 against white`,
    );

    // Dark Red (danger) [180, 0, 0]
    const dangerRatio = calculateContrastRatio([180, 0, 0], white);
    assert.ok(
      dangerRatio >= 4.5,
      `Danger contrast ratio ${dangerRatio.toFixed(2)} must be >= 4.5:1 against white`,
    );

    // Dark Green (success) [0, 128, 0]
    const successRatio = calculateContrastRatio([0, 128, 0], white);
    assert.ok(
      successRatio >= 4.5,
      `Success contrast ratio ${successRatio.toFixed(2)} must be >= 4.5:1 against white`,
    );

    // Dark Blue (info) [0, 64, 192]
    const infoRatio = calculateContrastRatio([0, 64, 192], white);
    assert.ok(
      infoRatio >= 4.5,
      `Info contrast ratio ${infoRatio.toFixed(2)} must be >= 4.5:1 against white`,
    );
  });

  it("should verify dark theme text colors meet WCAG 2.1 AA (>= 4.5:1) against black background", () => {
    const black: readonly [number, number, number] = [0, 0, 0];

    // Bright White text [255, 255, 255]
    const textRatio = calculateContrastRatio([255, 255, 255], black);
    assert.ok(textRatio >= 20.0);

    // Bright Yellow (warning/code) [255, 255, 85]
    const warnRatio = calculateContrastRatio([255, 255, 85], black);
    assert.ok(warnRatio >= 15.0);

    // Bright Green (success) [85, 255, 85]
    const successRatio = calculateContrastRatio([85, 255, 85], black);
    assert.ok(successRatio >= 12.0);

    // Bright Cyan (info) [85, 255, 255]
    const infoRatio = calculateContrastRatio([85, 255, 255], black);
    assert.ok(infoRatio >= 14.0);
  });

  it("should expose all predefined themes with valid structure", () => {
    assert.ok(TUI_PALETTES.dark);
    assert.ok(TUI_PALETTES.light);
    assert.ok(TUI_PALETTES["high-contrast"]);

    assert.equal(TUI_PALETTES.dark.name, "dark");
    assert.equal(TUI_PALETTES.light.name, "light");
    assert.equal(TUI_PALETTES["high-contrast"].name, "high-contrast");
  });
});
