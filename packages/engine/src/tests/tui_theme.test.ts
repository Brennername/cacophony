import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRelativeLuminance,
  calculateContrastRatio,
  TUI_PALETTES,
  TuiThemeService,
  ThemeService,
} from "../tui/TuiTheme.js";

describe("TUI Theme Contrast & Color Palette Calibration Tests (T-S4.3)", () => {
  it("should calculate relative luminance correctly according to WCAG 2.1 specifications", () => {
    const lumBlack = calculateRelativeLuminance(0, 0, 0);
    const lumWhite = calculateRelativeLuminance(255, 255, 255);

    assert.equal(lumBlack, 0);
    assert.equal(lumWhite, 1);

    const lumMidGray = calculateRelativeLuminance(128, 128, 128);
    assert.ok(lumMidGray > 0.2 && lumMidGray < 0.23);
  });

  it("should calculate contrast ratio between black and white as 21:1", () => {
    const ratio = calculateContrastRatio([0, 0, 0], [255, 255, 255]);
    assert.ok(Math.abs(ratio - 21.0) < 0.01);
  });

  it("should verify light theme calibrated colors meet WCAG 2.1 AA (>= 4.5:1) against white background", () => {
    const white: readonly [number, number, number] = [255, 255, 255];

    const warnRatio = calculateContrastRatio([160, 80, 0], white);
    assert.ok(
      warnRatio >= 4.5,
      `Warn contrast ratio ${warnRatio.toFixed(2)} must be >= 4.5:1 against white`,
    );

    const dangerRatio = calculateContrastRatio([180, 0, 0], white);
    assert.ok(
      dangerRatio >= 4.5,
      `Danger contrast ratio ${dangerRatio.toFixed(2)} must be >= 4.5:1 against white`,
    );

    const successRatio = calculateContrastRatio([0, 128, 0], white);
    assert.ok(
      successRatio >= 4.5,
      `Success contrast ratio ${successRatio.toFixed(2)} must be >= 4.5:1 against white`,
    );

    const infoRatio = calculateContrastRatio([0, 64, 192], white);
    assert.ok(
      infoRatio >= 4.5,
      `Info contrast ratio ${infoRatio.toFixed(2)} must be >= 4.5:1 against white`,
    );
  });

  it("should verify dark theme text colors meet WCAG 2.1 AA (>= 4.5:1) against black background", () => {
    const black: readonly [number, number, number] = [0, 0, 0];

    const textRatio = calculateContrastRatio([255, 255, 255], black);
    assert.ok(textRatio >= 20.0);

    const warnRatio = calculateContrastRatio([255, 255, 85], black);
    assert.ok(warnRatio >= 15.0);

    const successRatio = calculateContrastRatio([85, 255, 85], black);
    assert.ok(successRatio >= 12.0);

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
    assert.ok(TUI_PALETTES.dark.primary);
    assert.ok(TUI_PALETTES.light.primary);
  });

  describe("Hex Code Contrast & Edge Case Validation", () => {
    it("should calculate correct contrast ratio for foreground and background colors using 6-digit hex strings", () => {
      const ratio = calculateContrastRatio("#ffffff", "#000000");
      assert.ok(Math.abs(ratio - 21.0) < 0.01);

      const ratioInverse = calculateContrastRatio("#000000", "#ffffff");
      assert.ok(Math.abs(ratioInverse - 21.0) < 0.01);
    });

    it("should calculate correct contrast ratio using 3-digit shorthand hex strings", () => {
      const ratio = calculateContrastRatio("#fff", "#000");
      assert.ok(Math.abs(ratio - 21.0) < 0.01);
    });

    it("should calculate contrast ratio between mixed hex string and RGB tuple", () => {
      const ratio = calculateContrastRatio("#ffffff", [0, 0, 0]);
      assert.ok(Math.abs(ratio - 21.0) < 0.01);
    });

    it("should handle invalid hex codes gracefully (return NaN)", () => {
      assert.ok(Number.isNaN(calculateContrastRatio("#invalid", "#000000")));
      assert.ok(Number.isNaN(calculateContrastRatio("#fff", "not-a-hex")));
      assert.ok(Number.isNaN(calculateContrastRatio("#12345", "#ffffff")));
      assert.ok(Number.isNaN(calculateContrastRatio("", "#ffffff")));
      assert.ok(Number.isNaN(calculateContrastRatio((null as unknown) as string, "#ffffff")));
      assert.ok(Number.isNaN(calculateContrastRatio((undefined as unknown) as string, "#000000")));
    });

    it("should handle invalid color inputs gracefully", () => {
      assert.ok(Number.isNaN(calculateContrastRatio([-1, 0, 0], [255, 255, 255])));
      assert.ok(Number.isNaN(calculateContrastRatio([256, 0, 0], [255, 255, 255])));

      assert.ok(Number.isNaN(calculateContrastRatio(([255, 255] as unknown) as [number, number, number], [0, 0, 0])));
    });
  });

  describe("TuiThemeService & Palette Management", () => {
    it("should define a default color palette and report dark theme as default", () => {
      const service = new TuiThemeService();
      assert.equal(service.getCurrentTheme(), "dark");

      const palette = service.getCurrentPalette();
      assert.equal(palette.name, "dark");
      assert.ok(palette.title);
      assert.ok(palette.border);
      assert.ok(palette.primary);
      assert.ok(palette.text);
      assert.ok(palette.info);
    });

    it("should support ThemeService alias for constructor interoperability", () => {
      const service = new ThemeService();
      assert.equal(service.getCurrentTheme(), "dark");
      assert.equal(service.getPalette().name, "dark");
    });

    it("should allow switching between supported themes", () => {
      const service = new TuiThemeService();
      const switchedToLight = service.switchTheme("light");
      assert.equal(switchedToLight, true);
      assert.equal(service.getCurrentTheme(), "light");
      assert.equal(service.getCurrentPalette().name, "light");

      const switchedToHc = service.setTheme("high-contrast");
      assert.equal(switchedToHc, true);
      assert.equal(service.getCurrentTheme(), "high-contrast");
    });

    it("should handle invalid theme switch requests gracefully", () => {
      const service = new TuiThemeService("dark");
      const result = service.switchTheme("nonexistent-theme");
      assert.equal(result, false);
      assert.equal(service.getCurrentTheme(), "dark");

      const resultNull = service.setTheme(null);
      assert.equal(resultNull, false);
      assert.equal(service.getCurrentTheme(), "dark");

      const fallbackPalette = service.getPalette("unknown-theme");
      assert.equal(fallbackPalette.name, "dark");
    });

    it("should allow overriding the default color palette", () => {
      const service = new TuiThemeService();
      const updated = service.overridePalette("dark", {
        info: "\x1b[38;2;50;150;250m",
      });

      assert.equal(updated.info, "\x1b[38;2;50;150;250m");
      assert.equal(service.getPalette("dark").info, "\x1b[38;2;50;150;250m");
    });

    it("should not throw an error if the override palette is empty", () => {
      const service = new TuiThemeService();
      const palette = service.overridePalette("dark", {});
      assert.ok(palette);
      assert.equal(palette.name, "dark");
      assert.equal(palette.info, TUI_PALETTES.dark.info);
    });

    it("should handle missing colors in the override palette gracefully", () => {
      const service = new TuiThemeService();
      const partial = service.overridePalette("light", {
        warn: "\x1b[33m",
      });

      assert.equal(partial.warn, "\x1b[33m");
      // Unspecified colors should retain standard light theme values
      assert.equal(partial.info, TUI_PALETTES.light.info);
      assert.equal(partial.text, TUI_PALETTES.light.text);
      assert.equal(partial.danger, TUI_PALETTES.light.danger);
    });

    it("should reset palettes back to system defaults", () => {
      const service = new TuiThemeService();
      service.overridePalette("dark", { info: "custom-info" });
      assert.equal(service.getPalette("dark").info, "custom-info");

      service.resetPalette("dark");
      assert.equal(service.getPalette("dark").info, TUI_PALETTES.dark.info);
    });
  });
});
