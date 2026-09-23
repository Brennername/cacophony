import type { HardwareTelemetrySnapshot } from "@cacophony/shared-types";
import type { ScreenBuffer, BoxDimensions } from "./ScreenBuffer.js";

export interface MarkdownMessage {
  readonly sender: "user" | "assistant" | "system" | "tool";
  readonly content: string;
  readonly timestamp?: string;
}

/**
 * Renders formatted conversation messages with markdown styling and code highlight accents.
 */
export class ConversationPane {
  public messages: MarkdownMessage[] = [];
  public scrollOffset = 0;

  public addMessage(message: MarkdownMessage): void {
    this.messages.push(message);
  }

  public render(buffer: ScreenBuffer, bounds: BoxDimensions, isActive: boolean): void {
    const palette = buffer.getPalette();
    buffer.drawBox(bounds, { title: "Conversation", isActive });

    const innerX = bounds.x + 2;
    const innerY = bounds.y + 1;
    const innerW = bounds.width - 4;
    const innerH = bounds.height - 2;

    if (innerW <= 0 || innerH <= 0) return;

    // Flatten messages into display lines
    const lines: Array<{ text: string; style: string }> = [];
    for (const msg of this.messages) {
      let senderStyle = palette.info;
      let label = "[User]";
      if (msg.sender === "assistant") {
        senderStyle = palette.success;
        label = "[Agent]";
      } else if (msg.sender === "system") {
        senderStyle = palette.warn;
        label = "[System]";
      } else if (msg.sender === "tool") {
        senderStyle = palette.keyword;
        label = "[Tool]";
      }

      lines.push({ text: `${label}:`, style: senderStyle + palette.bold });

      const contentLines = msg.content.split("\n");
      for (const rawLine of contentLines) {
        if (rawLine.startsWith("```")) {
          lines.push({ text: `  ${rawLine}`, style: palette.code });
        } else if (rawLine.startsWith("#")) {
          lines.push({ text: `  ${rawLine}`, style: palette.title });
        } else if (rawLine.startsWith("- ") || rawLine.startsWith("* ")) {
          lines.push({ text: `    * ${rawLine.slice(2)}`, style: palette.text });
        } else {
          // Word wrap line to innerW
          const wrapped = this.wrapText(rawLine, innerW - 4);
          for (const w of wrapped) {
            lines.push({ text: `    ${w}`, style: palette.text });
          }
        }
      }
      lines.push({ text: "", style: palette.reset });
    }

    // Scroll handling: default view is pinned to bottom
    const totalLines = lines.length;
    const visibleCount = Math.min(totalLines, innerH);
    const startIdx = Math.max(0, totalLines - visibleCount - this.scrollOffset);

    for (let i = 0; i < visibleCount; i++) {
      const lineItem = lines[startIdx + i];
      if (!lineItem) break;
      buffer.drawText(innerX, innerY + i, lineItem.text, lineItem.style, innerW);
    }
  }

  private wrapText(text: string, maxWidth: number): string[] {
    if (text.length <= maxWidth) return [text];
    const words = text.split(" ");
    const result: string[] = [];
    let current = "";

    for (const word of words) {
      if ((current + " " + word).trim().length <= maxWidth) {
        current = (current + " " + word).trim();
      } else {
        if (current) result.push(current);
        current = word;
      }
    }
    if (current) result.push(current);
    return result.length > 0 ? result : [text.slice(0, maxWidth)];
  }
}

/**
 * Renders live Vega APU telemetry, thermal zone, and active resident Ollama model.
 */
export class TelemetryBar {
  private telemetry: HardwareTelemetrySnapshot | null = null;

  public update(snapshot: HardwareTelemetrySnapshot): void {
    this.telemetry = snapshot;
  }

  public render(buffer: ScreenBuffer, bounds: BoxDimensions, isActive: boolean): void {
    const palette = buffer.getPalette();
    buffer.drawBox(bounds, { title: "Hardware APU Telemetry", isActive });

    const innerX = bounds.x + 2;
    const innerY = bounds.y + 1;
    const innerW = bounds.width - 4;

    if (!this.telemetry) {
      buffer.drawText(innerX, innerY, "Sampling hardware sensors...", palette.textMuted, innerW);
      return;
    }

    const { gpu, thermalZone, pacingDelaySeconds, activeModel } = this.telemetry;
    const vramMb = Math.round(gpu.vramUsedBytes / (1024 * 1024));
    const vramTot = Math.round(gpu.vramTotalBytes / (1024 * 1024));

    let zoneStyle = palette.success;
    if (thermalZone === "Warm") zoneStyle = palette.warn;
    if (thermalZone === "Elevated" || thermalZone === "Danger") zoneStyle = palette.danger;

    const line1 = `GPU Load: ${gpu.gpuBusyPercent}% | Temp: ${gpu.edgeTempCelsius}C | Power: ${gpu.pptWatts}W | Clock: ${gpu.sclkMhz}MHz`;
    const line2 = `Thermal Zone: [${thermalZone}] (Delay ${pacingDelaySeconds}s) | VRAM: ${vramMb}MB / ${vramTot}MB (${gpu.vramPercent.toFixed(1)}%)`;
    const line3 = activeModel
      ? `Active VRAM Model: ${activeModel.name} (${Math.round(activeModel.vramSizeBytes / (1024 * 1024))}MB resident)`
      : "Active VRAM Model: None (Cold / Standby)";

    buffer.drawText(innerX, innerY, line1, palette.text, innerW);
    buffer.drawText(innerX, innerY + 1, line2, zoneStyle, innerW);
    buffer.drawText(innerX, innerY + 2, line3, palette.info, innerW);
  }
}

/**
 * Inspector pane showing active editable and reference files with token usage estimate.
 */
export class ContextInspectorPane {
  public focusFiles: string[] = [];
  public tokenBudget = { used: 0, limit: 32768 };

  public render(buffer: ScreenBuffer, bounds: BoxDimensions, isActive: boolean): void {
    const palette = buffer.getPalette();
    buffer.drawBox(bounds, { title: "Context & Files", isActive });

    const innerX = bounds.x + 2;
    const innerY = bounds.y + 1;
    const innerW = bounds.width - 4;
    const innerH = bounds.height - 2;

    const budgetPct = ((this.tokenBudget.used / this.tokenBudget.limit) * 100).toFixed(1);
    const budgetStyle = Number(budgetPct) > 80 ? palette.danger : palette.success;

    buffer.drawText(
      innerX,
      innerY,
      `Tokens: ${this.tokenBudget.used} / ${this.tokenBudget.limit} (${budgetPct}%)`,
      budgetStyle,
      innerW
    );

    buffer.drawText(innerX, innerY + 1, "Focus Files:", palette.keyword, innerW);

    if (this.focusFiles.length === 0) {
      buffer.drawText(innerX + 2, innerY + 2, "No files pinned.", palette.textMuted, innerW - 2);
    } else {
      for (let i = 0; i < Math.min(this.focusFiles.length, innerH - 3); i++) {
        buffer.drawText(innerX + 2, innerY + 2 + i, `• ${this.focusFiles[i]}`, palette.text, innerW - 2);
      }
    }
  }
}

/**
 * Streaming drawer showing real-time subprocess output, test failures, and tool calls.
 */
export class StreamingLogDrawer {
  public logs: string[] = [];
  public isVisible = true;

  public append(log: string): void {
    this.logs.push(log);
    if (this.logs.length > 200) {
      this.logs.shift();
    }
  }

  public render(buffer: ScreenBuffer, bounds: BoxDimensions, isActive: boolean): void {
    if (!this.isVisible) return;
    const palette = buffer.getPalette();
    buffer.drawBox(bounds, { title: "Stream Output & Process Drawer", isActive });

    const innerX = bounds.x + 2;
    const innerY = bounds.y + 1;
    const innerW = bounds.width - 4;
    const innerH = bounds.height - 2;

    const visibleLogs = this.logs.slice(-innerH);
    for (let i = 0; i < visibleLogs.length; i++) {
      const line = visibleLogs[i] || "";
      let style = palette.textMuted;
      if (line.includes("ERROR") || line.includes("fail") || line.includes("FAIL")) {
        style = palette.danger;
      } else if (line.includes("SUCCESS") || line.includes("PASS")) {
        style = palette.success;
      }
      buffer.drawText(innerX, innerY + i, line, style, innerW);
    }
  }
}
