import * as readline from "node:readline";
import { TerminalApp } from "../tui/TerminalApp.js";
import { AmdVegaTelemetryProvider } from "../telemetry/AmdVegaTelemetryProvider.js";
import { FallbackTelemetryProvider } from "../telemetry/FallbackTelemetryProvider.js";
import { DaemonIPCClient, DEFAULT_SOCKET_PATH } from "../daemon/DaemonIPC.js";
import type { HardwareTelemetrySnapshot } from "@cacophony/shared-types";

/**
 * Interactive full-screen terminal runner for Cacophony TerminalApp.
 */
export async function runInteractiveTui(socketPath = DEFAULT_SOCKET_PATH): Promise<void> {
  // Ensure terminal handles ANSI raw mode
  if (!process.stdin.isTTY) {
    console.error("Error: TUI requires an interactive TTY terminal session.");
    process.exit(1);
  }

  const app = new TerminalApp({
    theme: "dark",
    width: process.stdout.columns || 120,
    height: process.stdout.rows || 36
  });

  // Pre-register standard built-in command palette actions
  app.registerCommand({
    id: "toggle_drawer",
    label: "Toggle Log Drawer",
    description: "Expand or collapse streaming logs (Ctrl+T)",
    handler: () => {
      app.toggleLogDrawer();
      render();
    }
  });

  app.registerCommand({
    id: "cycle_pane",
    label: "Cycle Active Pane",
    description: "Switch focus between Conversation and Context (Tab)",
    handler: () => {
      app.cycleActivePane();
      render();
    }
  });

  app.registerCommand({
    id: "theme_dark",
    label: "Theme: Dark Mode",
    description: "Set low-eye-strain slate and obsidian theme",
    handler: () => {
      app.setTheme("dark");
      render();
    }
  });

  app.registerCommand({
    id: "theme_light",
    label: "Theme: Light Mode",
    description: "Set high-contrast daylight theme",
    handler: () => {
      app.setTheme("light");
      render();
    }
  });

  app.registerCommand({
    id: "theme_high_contrast",
    label: "Theme: High Contrast",
    description: "WCAG AAA compliant stark contrast theme",
    handler: () => {
      app.setTheme("high-contrast");
      render();
    }
  });

  app.registerCommand({
    id: "quit",
    label: "Exit Cacophony TUI",
    description: "Exit terminal application",
    handler: () => {
      cleanupAndExit();
    }
  });

  // Welcome message in conversation pane
  app.addMessage({
    sender: "system",
    content: "# Cacophony Terminal Environment\n- Press **Tab** to cycle pane focus.\n- Press **Ctrl+P** for searchable Command Palette.\n- Press **Ctrl+T** to toggle live logs.\n- Press **Ctrl+C** or **q** to quit.",
    timestamp: new Date().toISOString()
  });

  // Telemetry updates from local sysfs hardware provider
  const vegaProvider = new AmdVegaTelemetryProvider();
  const fallbackProvider = new FallbackTelemetryProvider();
  const isVega = await vegaProvider.isAvailable();
  const activeProvider = isVega ? vegaProvider : fallbackProvider;

  const updateTelemetry = async () => {
    try {
      const gpuMetrics = await activeProvider.sample();
      const temp = gpuMetrics.edgeTempCelsius;
      const thermalZone = temp >= 90 ? "Danger" : temp >= 80 ? "Elevated" : temp >= 70 ? "Warm" : "Nominal";
      const pacingDelaySeconds = temp >= 90 ? 10 : temp >= 80 ? 15 : temp >= 70 ? 5 : 0;
      const snapshot: HardwareTelemetrySnapshot = {
        timestamp: new Date().toISOString(),
        gpu: gpuMetrics,
        thermalZone,
        pacingDelaySeconds,
        activeModel: null
      };
      app.updateTelemetry(snapshot);
      render();
    } catch {
      // Ignore sensor reading hiccups
    }
  };

  await updateTelemetry();
  const telemetryInterval = setInterval(updateTelemetry, 2000);

  // Check if Cacophony daemon is running for IPC logs
  const client = new DaemonIPCClient(socketPath);
  let statusInterval: NodeJS.Timeout | null = null;
  void client.isOnline().then((online) => {
    if (online) {
      app.appendLog("[IPC] Connected to live Cacophony daemon.");
      statusInterval = setInterval(async () => {
        try {
          const statusRes = (await client.request("status", {})) as { activeTask?: { id: string; stage: string } } | undefined;
          if (statusRes?.activeTask) {
            app.appendLog(`[TASK] Active: ${statusRes.activeTask.id} (${statusRes.activeTask.stage})`);
          }
        } catch {
          // ignore transient IPC errors
        }
      }, 3000);
    } else {
      app.appendLog("[TUI] Operating in standalone terminal inspection mode.");
    }
    render();
  });

  // Setup raw mode for keypress
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  // Hide cursor and clear screen
  process.stdout.write("\x1b[?25l\x1b[2J\x1b[H");

  const render = () => {
    const rendered = app.render();
    process.stdout.write("\x1b[H" + rendered);
  };

  const cleanupAndExit = () => {
    clearInterval(telemetryInterval);
    if (statusInterval) clearInterval(statusInterval);
    process.stdin.setRawMode(false);
    process.stdin.pause();
    // Restore cursor and clear
    process.stdout.write("\x1b[?25h\x1b[2J\x1b[H");
    console.log("Cacophony TUI closed.");
    process.exit(0);
  };

  // Resize handler
  process.stdout.on("resize", () => {
    app.resize(process.stdout.columns || 120, process.stdout.rows || 36);
    render();
  });

  // Keypress listener
  process.stdin.on("keypress", (_str: string, key: readline.Key) => {
    if (!key) return;

    if (key.ctrl && key.name === "c") {
      cleanupAndExit();
      return;
    }

    if (!app.isCommandPaletteOpen() && key.name === "q" && !key.ctrl) {
      cleanupAndExit();
      return;
    }

    app.handleKeypress(key.name || "", key.ctrl || false);
    render();
  });

  // Initial draw
  render();
}
