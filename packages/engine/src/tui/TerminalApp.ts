import { ScreenBuffer, type BoxDimensions } from "./ScreenBuffer.js";
import {
  ConversationPane,
  TelemetryBar,
  ContextInspectorPane,
  StreamingLogDrawer,
  type MarkdownMessage
} from "./TuiPanes.js";
import type { TuiThemeName } from "./TuiTheme.js";
import type { HardwareTelemetrySnapshot } from "@cacophony/shared-types";

export type ActivePane = "conversation" | "context" | "drawer";

export interface CommandPaletteItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly handler: () => void | Promise<void>;
}

export interface TerminalAppOptions {
  readonly theme?: TuiThemeName;
  readonly width?: number;
  readonly height?: number;
}

/**
 * TerminalApp manages responsive layout calculation, pane rendering,
 * searchable command palette, and keyboard navigation.
 */
export class TerminalApp {
  public readonly conversationPane = new ConversationPane();
  public readonly telemetryBar = new TelemetryBar();
  public readonly contextInspector = new ContextInspectorPane();
  public readonly logDrawer = new StreamingLogDrawer();

  private buffer: ScreenBuffer;
  private activePane: ActivePane = "conversation";
  private commandPaletteOpen = false;
  private commandPaletteFilter = "";
  private selectedPaletteIndex = 0;
  private readonly commandPaletteItems: CommandPaletteItem[] = [];

  constructor(options: TerminalAppOptions = {}) {
    const termWidth = options.width ?? (process.stdout?.columns || 120);
    const termHeight = options.height ?? (process.stdout?.rows || 36);
    this.buffer = new ScreenBuffer(termWidth, termHeight, options.theme || "dark");
  }

  public registerCommand(item: CommandPaletteItem): void {
    this.commandPaletteItems.push(item);
  }

  public setTheme(theme: TuiThemeName): void {
    this.buffer.setTheme(theme);
  }

  public resize(width: number, height: number): void {
    this.buffer.resize(width, height);
  }

  public getActivePane(): ActivePane {
    return this.activePane;
  }

  public cycleActivePane(): void {
    if (this.activePane === "conversation") {
      this.activePane = "context";
    } else if (this.activePane === "context") {
      this.activePane = this.logDrawer.isVisible ? "drawer" : "conversation";
    } else {
      this.activePane = "conversation";
    }
  }

  public toggleLogDrawer(): void {
    this.logDrawer.isVisible = !this.logDrawer.isVisible;
    if (!this.logDrawer.isVisible && this.activePane === "drawer") {
      this.activePane = "conversation";
    }
  }

  public openCommandPalette(): void {
    this.commandPaletteOpen = true;
    this.commandPaletteFilter = "";
    this.selectedPaletteIndex = 0;
  }

  public closeCommandPalette(): void {
    this.commandPaletteOpen = false;
  }

  public isCommandPaletteOpen(): boolean {
    return this.commandPaletteOpen;
  }

  public updateTelemetry(snapshot: HardwareTelemetrySnapshot): void {
    this.telemetryBar.update(snapshot);
  }

  public addMessage(msg: MarkdownMessage): void {
    this.conversationPane.addMessage(msg);
  }

  public appendLog(log: string): void {
    this.logDrawer.append(log);
  }

  /**
   * Dispatches keyboard shortcuts.
   */
  public handleKeypress(keyName: string, ctrl = false): void {
    if (this.commandPaletteOpen) {
      if (keyName === "escape") {
        this.closeCommandPalette();
      } else if (keyName === "up") {
        this.selectedPaletteIndex = Math.max(0, this.selectedPaletteIndex - 1);
      } else if (keyName === "down") {
        const matches = this.getFilteredCommands();
        this.selectedPaletteIndex = Math.min(matches.length - 1, this.selectedPaletteIndex + 1);
      } else if (keyName === "return") {
        const matches = this.getFilteredCommands();
        const selected = matches[this.selectedPaletteIndex];
        if (selected) {
          this.closeCommandPalette();
          void selected.handler();
        }
      }
      return;
    }

    if (ctrl && keyName === "p") {
      this.openCommandPalette();
      return;
    }

    if (ctrl && keyName === "t") {
      this.toggleLogDrawer();
      return;
    }

    if (keyName === "tab") {
      this.cycleActivePane();
      return;
    }
  }

  public render(): string {
    this.buffer.clear();
    const w = this.buffer.width;
    const h = this.buffer.height;

    // Top: Telemetry Bar (fixed height 5)
    const telemetryBounds: BoxDimensions = { x: 0, y: 0, width: w, height: 5 };
    this.telemetryBar.render(this.buffer, telemetryBounds, false);

    // Remaining height split between conversation/context and bottom drawer
    const availableHeight = h - 5;
    const drawerHeight = this.logDrawer.isVisible ? Math.max(6, Math.floor(availableHeight * 0.28)) : 0;
    const mainHeight = availableHeight - drawerHeight;

    // Left: Conversation Pane (70% width)
    const leftWidth = Math.floor(w * 0.7);
    const rightWidth = w - leftWidth;

    const convBounds: BoxDimensions = {
      x: 0,
      y: 5,
      width: leftWidth,
      height: mainHeight
    };
    this.conversationPane.render(this.buffer, convBounds, this.activePane === "conversation");

    // Right: Context & File Inspector
    const contextBounds: BoxDimensions = {
      x: leftWidth,
      y: 5,
      width: rightWidth,
      height: mainHeight
    };
    this.contextInspector.render(this.buffer, contextBounds, this.activePane === "context");

    // Bottom: Drawer
    if (this.logDrawer.isVisible) {
      const drawerBounds: BoxDimensions = {
        x: 0,
        y: 5 + mainHeight,
        width: w,
        height: drawerHeight
      };
      this.logDrawer.render(this.buffer, drawerBounds, this.activePane === "drawer");
    }

    // Modal: Command Palette overlay
    if (this.commandPaletteOpen) {
      this.renderCommandPaletteModal();
    }

    return this.buffer.renderToString();
  }

  private renderCommandPaletteModal(): void {
    const palette = this.buffer.getPalette();
    const modalW = Math.min(70, this.buffer.width - 4);
    const modalH = Math.min(14, this.buffer.height - 4);
    const modalX = Math.floor((this.buffer.width - modalW) / 2);
    const modalY = Math.floor((this.buffer.height - modalH) / 2);

    this.buffer.drawBox(
      { x: modalX, y: modalY, width: modalW, height: modalH },
      { title: "Search Commands (Ctrl+P)", isActive: true }
    );

    const innerX = modalX + 2;
    const innerY = modalY + 1;
    const innerW = modalW - 4;

    this.buffer.drawText(
      innerX,
      innerY,
      `> ${this.commandPaletteFilter}_`,
      palette.title,
      innerW
    );

    const items = this.getFilteredCommands();
    for (let i = 0; i < Math.min(items.length, modalH - 4); i++) {
      const item = items[i];
      if (!item) continue;
      const isSelected = i === this.selectedPaletteIndex;
      const prefix = isSelected ? " > " : "   ";
      const style = isSelected ? palette.inverse + palette.bold : palette.text;

      this.buffer.drawText(
        innerX,
        innerY + 2 + i,
        `${prefix}${item.label.padEnd(20)} ${item.description}`,
        style,
        innerW
      );
    }
  }

  private getFilteredCommands(): CommandPaletteItem[] {
    if (!this.commandPaletteFilter) return this.commandPaletteItems;
    const q = this.commandPaletteFilter.toLowerCase();
    return this.commandPaletteItems.filter(
      (it) => it.label.toLowerCase().includes(q) || it.description.toLowerCase().includes(q)
    );
  }
}
