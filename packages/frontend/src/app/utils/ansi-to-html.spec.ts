import { describe, it, expect } from 'vitest';
import { ansiToHtml, escapeHtml, stripNonSgrCodes } from './ansi-to-html';

describe('ansiToHtml Utility', () => {
  it('returns empty string for null, undefined, or empty inputs', () => {
    expect(ansiToHtml(null)).toBe('');
    expect(ansiToHtml(undefined)).toBe('');
    expect(ansiToHtml('')).toBe('');
  });

  it('escapes raw HTML entities to strictly prevent XSS', () => {
    const raw = '<script>alert("xss")</script> & "quotes" \'single\'';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quotes&quot; &#39;single&#39;');
    expect(ansiToHtml(raw)).toBe(escaped);
  });

  it('formats single standard foreground ANSI color codes', () => {
    const input = '\u001b[32mPASS\u001b[0m';
    const result = ansiToHtml(input);
    expect(result).toBe('<span class="ansi-fg-green">PASS</span>');
  });

  it('formats standard text styles like bold, dim, and underline', () => {
    const boldInput = '\u001b[1mBold Text\u001b[22m Normal';
    expect(ansiToHtml(boldInput)).toBe('<span class="ansi-bold">Bold Text</span> Normal');

    const dimInput = '\u001b[2mDimmed\u001b[0m';
    expect(ansiToHtml(dimInput)).toBe('<span class="ansi-dim">Dimmed</span>');

    const underlineInput = '\u001b[4mUnderlined\u001b[24m';
    expect(ansiToHtml(underlineInput)).toBe('<span class="ansi-underline">Underlined</span>');
  });

  it('formats combined styles and foreground colors', () => {
    const input = '\u001b[1;31mFATAL ERROR\u001b[0m';
    const result = ansiToHtml(input);
    expect(result).toBe('<span class="ansi-bold ansi-fg-red">FATAL ERROR</span>');
  });

  it('formats background colors and inverse text', () => {
    const input = '\u001b[30;43m WARN \u001b[39;49m';
    const result = ansiToHtml(input);
    expect(result).toBe('<span class="ansi-fg-black ansi-bg-yellow"> WARN </span>');
  });

  it('formats bright / high-intensity foreground and background colors', () => {
    const brightFg = '\u001b[90m// dim comment\u001b[0m';
    expect(ansiToHtml(brightFg)).toBe('<span class="ansi-fg-bright-black">// dim comment</span>');

    const brightBg = '\u001b[102mSUCCESS\u001b[0m';
    expect(ansiToHtml(brightBg)).toBe('<span class="ansi-bg-bright-green">SUCCESS</span>');
  });

  it('supports 24-bit truecolor RGB codes for foreground and background', () => {
    const rgbFg = '\u001b[38;2;255;128;64mCustom RGB\u001b[0m';
    expect(ansiToHtml(rgbFg)).toBe('<span style="color: rgb(255, 128, 64)">Custom RGB</span>');

    const rgbBg = '\u001b[48;2;16;32;48mCustom BG\u001b[0m';
    expect(ansiToHtml(rgbBg)).toBe('<span style="background-color: rgb(16, 32, 48)">Custom BG</span>');
  });

  it('strips non-SGR cursor control and terminal sequences without artifacts', () => {
    const inputWithCursor = '\u001b[2K\r\u001b[32mCompleted stage\u001b[0m';
    expect(stripNonSgrCodes(inputWithCursor)).toBe('\u001b[32mCompleted stage\u001b[0m');
    expect(ansiToHtml(inputWithCursor)).toBe('<span class="ansi-fg-green">Completed stage</span>');
  });

  it('handles multi-line test runner output with interspersed ANSI sequences', () => {
    const vitestOutput = [
      '\u001b[1m\u001b[32m ✓ \u001b[39m\u001b[22msrc/services/model.spec.ts (3 tests)',
      '\u001b[31m ✕ \u001b[39msrc/components/broken.spec.ts (1 test)',
      '   \u001b[90mExpected true but received false\u001b[39m'
    ].join('\n');

    const html = ansiToHtml(vitestOutput);
    expect(html).toContain('class="ansi-bold ansi-fg-green"');
    expect(html).toContain('class="ansi-fg-red"');
    expect(html).toContain('class="ansi-fg-bright-black"');
    expect(html).toContain('src/services/model.spec.ts');
  });
});
