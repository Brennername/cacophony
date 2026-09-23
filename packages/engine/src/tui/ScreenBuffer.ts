import { TUI_PALETTES, type TuiColorPalette, type TuiThemeName } from "./TuiTheme.js";

export interface BoxDimensions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BoxOptions {
  readonly title?: string;
  readonly isActive?: boolean;
  readonly padding?: number;
}

/**
 * ScreenBuffer represents a 2D grid of characters and style escape codes,
 * enabling flicker-free terminal UI rendering with clipping and dirty updates.
 */
export class ScreenBuffer {
  public width: number;
  public height: number;
  private buffer: string[][];
  private palette: TuiColorPalette;

  constructor(width: number, height: number, theme: TuiThemeName = "dark") {
    this.width = Math.max(10, width);
    this.height = Math.max(5, height);
    this.palette = TUI_PALETTES[theme];
    this.buffer = this.createEmptyBuffer();
  }

  public setTheme(theme: TuiThemeName): void {
    this.palette = TUI_PALETTES[theme];
  }

  public getPalette(): TuiColorPalette {
    return this.palette;
  }

  public resize(width: number, height: number): void {
    this.width = Math.max(10, width);
    this.height = Math.max(5, height);
    this.buffer = this.createEmptyBuffer();
  }

  public clear(): void {
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        this.buffer[r]![c] = " ";
      }
    }
  }

  public drawText(x: number, y: number, text: string, stylePrefix = "", maxLength?: number): void {
    if (y < 0 || y >= this.height) return;
    if (x < 0 || x >= this.width) return;

    const visibleLength = maxLength !== undefined ? Math.min(maxLength, this.width - x) : this.width - x;
    const cleanChars = Array.from(text.slice(0, visibleLength));

    for (let i = 0; i < cleanChars.length; i++) {
      const targetCol = x + i;
      if (targetCol >= this.width) break;

      const char = cleanChars[i] ?? " ";
      if (i === 0 && stylePrefix) {
        this.buffer[y]![targetCol] = stylePrefix + char;
      } else if (i === cleanChars.length - 1 && stylePrefix) {
        this.buffer[y]![targetCol] = char + this.palette.reset;
      } else {
        this.buffer[y]![targetCol] = char;
      }
    }
  }

  public drawBox(dim: BoxDimensions, options: BoxOptions = {}): void {
    const { x, y, width, height } = dim;
    if (width < 2 || height < 2) return;

    const borderStyle = options.isActive ? this.palette.activeBorder : this.palette.border;
    const titleStyle = options.isActive ? this.palette.title : this.palette.textMuted;

    // Corners & Horizontal borders
    const topRow = y;
    const botRow = y + height - 1;
    const leftCol = x;
    const rightCol = x + width - 1;

    // Top border
    if (topRow >= 0 && topRow < this.height) {
      for (let col = leftCol; col <= rightCol; col++) {
        if (col < 0 || col >= this.width) continue;
        if (col === leftCol) {
          this.buffer[topRow]![col] = borderStyle + "+" + this.palette.reset;
        } else if (col === rightCol) {
          this.buffer[topRow]![col] = borderStyle + "+" + this.palette.reset;
        } else {
          this.buffer[topRow]![col] = borderStyle + "-" + this.palette.reset;
        }
      }

      // Title overlay on top border
      if (options.title) {
        const titleText = ` [ ${options.title} ] `;
        const titleX = Math.min(leftCol + 2, this.width - titleText.length - 1);
        if (titleX > leftCol) {
          this.drawText(titleX, topRow, titleText, titleStyle);
        }
      }
    }

    // Vertical sides
    for (let r = topRow + 1; r < botRow; r++) {
      if (r < 0 || r >= this.height) continue;
      if (leftCol >= 0 && leftCol < this.width) {
        this.buffer[r]![leftCol] = borderStyle + "|" + this.palette.reset;
      }
      if (rightCol >= 0 && rightCol < this.width) {
        this.buffer[r]![rightCol] = borderStyle + "|" + this.palette.reset;
      }
    }

    // Bottom border
    if (botRow >= 0 && botRow < this.height) {
      for (let col = leftCol; col <= rightCol; col++) {
        if (col < 0 || col >= this.width) continue;
        if (col === leftCol || col === rightCol) {
          this.buffer[botRow]![col] = borderStyle + "+" + this.palette.reset;
        } else {
          this.buffer[botRow]![col] = borderStyle + "-" + this.palette.reset;
        }
      }
    }
  }

  public renderToString(): string {
    return this.buffer.map((row) => row.join("")).join("\n");
  }

  private createEmptyBuffer(): string[][] {
    const grid: string[][] = [];
    for (let r = 0; r < this.height; r++) {
      const row: string[] = [];
      for (let c = 0; c < this.width; c++) {
        row.push(" ");
      }
      grid.push(row);
    }
    return grid;
  }
}
