/**
 * ANSI Escape Code to HTML Converter
 *
 * Converts ANSI SGR terminal color/style escape sequences into safe, semantic
 * HTML markup with support for Cacophony theme palettes, dark/light modes,
 * 16 standard colors, RGB truecolor, and strict XSS protection.
 */

export interface AnsiState {
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  invert: boolean;
  fgClass: string | null;
  bgClass: string | null;
  fgStyle: string | null;
  bgStyle: string | null;
}

/**
 * Escapes raw text for safe HTML injection, preventing XSS vulnerabilities.
 */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips non-SGR terminal control codes (cursor movement, clear line, OSC title, etc.)
 * so raw escape characters do not pollute the output text.
 */
export function stripNonSgrCodes(input: string): string {
  return input
    // Remove OSC sequences: ESC ] ... (ESC \ or BEL \x07)
    .replace(/\x1b\].*?(?:\x1b\\|\x07)/g, '')
    // Remove non-SGR CSI sequences: ESC [ ... <letter other than m>
    .replace(/\x1b\[[0-9;?]*[A-LN-Za-ln-z]/g, '')
    // Remove character set shifts: ESC ( B, ESC ) 0, etc.
    .replace(/\x1b[()][0-9A-Za-z]/g, '')
    // Remove stray carriage returns preceding line feeds
    .replace(/\r(?=\n)/g, '')
    // Remove standalone carriage returns
    .replace(/\r/g, '');
}

/**
 * Converts a string containing ANSI escape codes into safe HTML.
 *
 * @param input Raw stream or log string containing ANSI escape sequences
 * @returns Safe HTML string with semantic spans
 */
export function ansiToHtml(input: string | null | undefined): string {
  if (!input) return '';

  // Clean non-SGR terminal control sequences first
  const cleaned = stripNonSgrCodes(input);

  // Match ANSI SGR sequence: ESC [ <params> m
  const sgrRegex = /\x1b\[([0-9;]*)m/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let result = '';

  const state: AnsiState = {
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    strikethrough: false,
    invert: false,
    fgClass: null,
    bgClass: null,
    fgStyle: null,
    bgStyle: null,
  };

  /**
   * Helper to format a text chunk with current active styles.
   */
  const formatChunk = (chunk: string): string => {
    if (!chunk) return '';
    const safeChunk = escapeHtml(chunk);

    const classes: string[] = [];
    if (state.bold) classes.push('ansi-bold');
    if (state.dim) classes.push('ansi-dim');
    if (state.italic) classes.push('ansi-italic');
    if (state.underline) classes.push('ansi-underline');
    if (state.strikethrough) classes.push('ansi-strikethrough');
    if (state.invert) classes.push('ansi-invert');
    if (state.fgClass) classes.push(state.fgClass);
    if (state.bgClass) classes.push(state.bgClass);

    const styles: string[] = [];
    if (state.fgStyle) styles.push(state.fgStyle);
    if (state.bgStyle) styles.push(state.bgStyle);

    if (classes.length === 0 && styles.length === 0) {
      return safeChunk;
    }

    const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    return `<span${classAttr}${styleAttr}>${safeChunk}</span>`;
  };

  while ((match = sgrRegex.exec(cleaned)) !== null) {
    const chunkBefore = cleaned.substring(lastIndex, match.index);
    if (chunkBefore) {
      result += formatChunk(chunkBefore);
    }
    lastIndex = match.index + match[0].length;

    const rawParams = match[1];
    const codes = rawParams.length === 0
      ? [0]
      : rawParams.split(';').map(p => parseInt(p, 10) || 0);

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];

      if (code === 0) {
        // Reset all
        state.bold = false;
        state.dim = false;
        state.italic = false;
        state.underline = false;
        state.strikethrough = false;
        state.invert = false;
        state.fgClass = null;
        state.bgClass = null;
        state.fgStyle = null;
        state.bgStyle = null;
      } else if (code === 1) {
        state.bold = true;
      } else if (code === 2) {
        state.dim = true;
      } else if (code === 3) {
        state.italic = true;
      } else if (code === 4) {
        state.underline = true;
      } else if (code === 7) {
        state.invert = true;
      } else if (code === 9) {
        state.strikethrough = true;
      } else if (code === 21 || code === 22) {
        state.bold = false;
        state.dim = false;
      } else if (code === 23) {
        state.italic = false;
      } else if (code === 24) {
        state.underline = false;
      } else if (code === 27) {
        state.invert = false;
      } else if (code === 29) {
        state.strikethrough = false;
      } else if (code >= 30 && code <= 37) {
        const fgColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
        state.fgClass = `ansi-fg-${fgColors[code - 30]}`;
        state.fgStyle = null;
      } else if (code === 38) {
        // Extended foreground: 38;5;n or 38;2;r;g;b
        if (i + 1 < codes.length) {
          const mode = codes[i + 1];
          if (mode === 2 && i + 4 < codes.length) {
            const r = codes[i + 2];
            const g = codes[i + 3];
            const b = codes[i + 4];
            state.fgStyle = `color: rgb(${r}, ${g}, ${b})`;
            state.fgClass = null;
            i += 4;
          } else if (mode === 5 && i + 2 < codes.length) {
            const colorIdx = codes[i + 2];
            state.fgClass = get256ColorClass(colorIdx, 'fg');
            state.fgStyle = state.fgClass ? null : `color: var(--ansi-256-${colorIdx})`;
            i += 2;
          }
        }
      } else if (code === 39) {
        state.fgClass = null;
        state.fgStyle = null;
      } else if (code >= 40 && code <= 47) {
        const bgColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
        state.bgClass = `ansi-bg-${bgColors[code - 40]}`;
        state.bgStyle = null;
      } else if (code === 48) {
        // Extended background: 48;5;n or 48;2;r;g;b
        if (i + 1 < codes.length) {
          const mode = codes[i + 1];
          if (mode === 2 && i + 4 < codes.length) {
            const r = codes[i + 2];
            const g = codes[i + 3];
            const b = codes[i + 4];
            state.bgStyle = `background-color: rgb(${r}, ${g}, ${b})`;
            state.bgClass = null;
            i += 4;
          } else if (mode === 5 && i + 2 < codes.length) {
            const colorIdx = codes[i + 2];
            state.bgClass = get256ColorClass(colorIdx, 'bg');
            state.bgStyle = state.bgClass ? null : `background-color: var(--ansi-256-${colorIdx})`;
            i += 2;
          }
        }
      } else if (code === 49) {
        state.bgClass = null;
        state.bgStyle = null;
      } else if (code >= 90 && code <= 97) {
        const brightFgColors = ['bright-black', 'bright-red', 'bright-green', 'bright-yellow', 'bright-blue', 'bright-magenta', 'bright-cyan', 'bright-white'];
        state.fgClass = `ansi-fg-${brightFgColors[code - 90]}`;
        state.fgStyle = null;
      } else if (code >= 100 && code <= 107) {
        const brightBgColors = ['bright-black', 'bright-red', 'bright-green', 'bright-yellow', 'bright-blue', 'bright-magenta', 'bright-cyan', 'bright-white'];
        state.bgClass = `ansi-bg-${brightBgColors[code - 100]}`;
        state.bgStyle = null;
      }
    }
  }

  // Trailing text after final ANSI code
  if (lastIndex < cleaned.length) {
    const trailingChunk = cleaned.substring(lastIndex);
    result += formatChunk(trailingChunk);
  }

  return result;
}

/**
 * Maps standard 0-15 256-color palette indices to semantic CSS classes.
 */
function get256ColorClass(index: number, type: 'fg' | 'bg'): string | null {
  const prefix = type === 'fg' ? 'ansi-fg-' : 'ansi-bg-';
  const standard = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
  if (index >= 0 && index <= 7) {
    return `${prefix}${standard[index]}`;
  }
  if (index >= 8 && index <= 15) {
    return `${prefix}bright-${standard[index - 8]}`;
  }
  return null;
}
