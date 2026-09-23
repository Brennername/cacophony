import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ScreenBuffer } from "../tui/ScreenBuffer.js";
import { TerminalApp } from "../tui/TerminalApp.js";
import { ConversationPane, TelemetryBar, ContextInspectorPane } from "../tui/TuiPanes.js";
import { LivePromptQueue } from "../inference/LivePromptQueue.js";
import { CustomMarkdownCommandEngine } from "../inference/CustomMarkdownCommandEngine.js";

describe("Phase 14: Terminal User Interface & Developer Experience", () => {
  describe("T14.1: Terminal UI Rendering & Layout Engine", () => {
    it("should draw box borders, title, and clip text within screen buffer", () => {
      const buffer = new ScreenBuffer(40, 10, "dark");
      buffer.drawBox({ x: 0, y: 0, width: 30, height: 6 }, { title: "Test Panel", isActive: true });
      buffer.drawText(2, 2, "Hello Cacophony TUI");

      const output = buffer.renderToString();
      assert.ok(output.includes("Test Panel"), "Rendered output should include panel title");
      assert.ok(output.includes("Hello Cacophony TUI"), "Rendered output should contain inner text");
    });

    it("should format markdown messages in ConversationPane", () => {
      const buffer = new ScreenBuffer(50, 15, "dark");
      const pane = new ConversationPane();
      pane.addMessage({ sender: "user", content: "Optimize SQL index" });
      pane.addMessage({
        sender: "assistant",
        content: "```sql\nCREATE INDEX idx ON test(id);\n```"
      });

      pane.render(buffer, { x: 0, y: 0, width: 50, height: 15 }, true);
      const rendered = buffer.renderToString();
      assert.ok(rendered.includes("[User]:"), "Should render user prompt header");
      assert.ok(rendered.includes("[Agent]:"), "Should render agent response header");
      assert.ok(rendered.includes("CREATE INDEX"), "Should render code block contents");
    });

    it("should render hardware telemetry readouts in TelemetryBar", () => {
      const buffer = new ScreenBuffer(80, 8, "dark");
      const bar = new TelemetryBar();

      bar.update({
        timestamp: new Date().toISOString(),
        thermalZone: "Nominal",
        pacingDelaySeconds: 0,
        gpu: {
          gpuBusyPercent: 12,
          vramUsedBytes: 4 * 1024 * 1024 * 1024,
          vramTotalBytes: 16 * 1024 * 1024 * 1024,
          vramPercent: 25.0,
          gttUsedBytes: 0,
          gttTotalBytes: 0,
          edgeTempCelsius: 52,
          vddgfxMilliVolts: 925,
          socMilliVolts: 900,
          pptWatts: 14,
          sclkMhz: 1200
        },
        activeModel: {
          name: "qwen2.5-coder:7b",
          model: "qwen2.5-coder:7b",
          sizeBytes: 4 * 1024 * 1024 * 1024,
          vramSizeBytes: 4400 * 1024 * 1024
        }
      });

      bar.render(buffer, { x: 0, y: 0, width: 80, height: 5 }, false);
      const rendered = buffer.renderToString();
      assert.ok(rendered.includes("GPU Load: 12%"), "Should include GPU busy percent");
      assert.ok(rendered.includes("52C"), "Should include edge temperature");
      assert.ok(rendered.includes("Nominal"), "Should include thermal zone");
      assert.ok(rendered.includes("qwen2.5-coder:7b"), "Should display active model name");
    });

    it("should render pinned files and token budgets in ContextInspectorPane", () => {
      const buffer = new ScreenBuffer(40, 10, "dark");
      const inspector = new ContextInspectorPane();
      inspector.focusFiles = ["packages/engine/src/index.ts", "package.json"];
      inspector.tokenBudget = { used: 4096, limit: 32768 };

      inspector.render(buffer, { x: 0, y: 0, width: 40, height: 10 }, false);
      const rendered = buffer.renderToString();
      assert.ok(rendered.includes("Tokens: 4096 / 32768"), "Should display token budget");
      assert.ok(rendered.includes("index.ts"), "Should list focus file");
    });

    it("should handle key navigation and command palette in TerminalApp", () => {
      const app = new TerminalApp({ width: 100, height: 30, theme: "dark" });
      let executed = false;

      app.registerCommand({
        id: "cmd-test",
        label: "Run Tests",
        description: "Execute automated unit tests",
        handler: () => {
          executed = true;
        }
      });

      assert.strictEqual(app.getActivePane(), "conversation");
      app.handleKeypress("tab");
      assert.strictEqual(app.getActivePane(), "context");

      // Open command palette with Ctrl+P
      app.handleKeypress("p", true);
      assert.strictEqual(app.isCommandPaletteOpen(), true);

      // Execute selected command with Return
      app.handleKeypress("return");
      assert.strictEqual(executed, true, "Registered command handler should have run");
      assert.strictEqual(app.isCommandPaletteOpen(), false, "Palette should close after execution");
    });
  });

  describe("T14.2: Steerable Generation & Live Prompt Queue", () => {
    it("should queue prompts and process them sequentially", () => {
      const queue = new LivePromptQueue();
      const p1 = queue.enqueuePrompt("Task 1");
      const p2 = queue.enqueuePrompt("Task 2");

      const state1 = queue.getPromptQueueState();
      assert.strictEqual(state1.activePrompt?.id, p1.id);
      assert.strictEqual(state1.pendingPrompts.length, 1);
      assert.strictEqual(state1.pendingPrompts[0]?.id, p2.id);

      // Finish active prompt 1
      queue.finishActivePrompt();
      const state2 = queue.getPromptQueueState();
      assert.strictEqual(state2.activePrompt?.id, p2.id);
      assert.strictEqual(state2.pendingPrompts.length, 0);
    });

    it("should allow mid-stream steering guidance injection while streaming", () => {
      const queue = new LivePromptQueue();
      queue.enqueuePrompt("Stream task");
      const abortCtrl = new AbortController();
      queue.startStreaming(abortCtrl);

      queue.injectSteeringGuidance("Ensure code uses TypeScript 5.7+ syntax");
      const guidance = queue.getAndClearSteeringGuidance();
      assert.deepStrictEqual(guidance, ["Ensure code uses TypeScript 5.7+ syntax"]);
    });

    it("should trigger AbortController on mid-stream interruption", () => {
      const queue = new LivePromptQueue();
      queue.enqueuePrompt("Long generation task");
      const abortCtrl = new AbortController();
      queue.startStreaming(abortCtrl);

      assert.strictEqual(abortCtrl.signal.aborted, false);
      const interrupted = queue.interrupt();
      assert.strictEqual(interrupted, true);
      assert.strictEqual(abortCtrl.signal.aborted, true);
      assert.strictEqual(queue.getPromptQueueState().isStreaming, false);
    });
  });

  describe("T14.3: Custom Markdown Commands", () => {
    it("should parse frontmatter metadata and template body", () => {
      const engine = new CustomMarkdownCommandEngine([]);
      const rawMarkdown = `---
name: refactor
description: Refactor targeted symbol to follow SOLID principles
role: user
temperature: 0.2
arguments: targetSymbol, file
---
Please refactor $ARG1 in file $ARG2 following Single Responsibility.
Selection context:
$SELECTION
`;
      const parsed = engine.parseCommandFile(rawMarkdown, "/commands/refactor.md");
      assert.ok(parsed);
      assert.strictEqual(parsed.metadata.name, "refactor");
      assert.strictEqual(parsed.metadata.temperature, 0.2);
      assert.deepStrictEqual(parsed.metadata.arguments, ["targetSymbol", "file"]);

      const interpolated = engine.interpolate(parsed, {
        args: ["SessionManager", "src/SessionManager.ts"],
        selection: "class SessionManager { ... }"
      });

      assert.ok(interpolated.includes("Please refactor SessionManager in file src/SessionManager.ts"));
      assert.ok(interpolated.includes("class SessionManager { ... }"));
    });
  });

  describe("T14.4: Flexible Execution Modes & Safety Guardrails", () => {
    it("should disallow disk modification in Plan Mode and allow in Build/Auto", async () => {
      const { ExecutionSafetyManager } = await import("../inference/ExecutionSafetyManager.js");
      const safety = new ExecutionSafetyManager("plan");

      assert.strictEqual(safety.getMode(), "plan");
      assert.strictEqual(safety.canModifyDisk(), false);
      assert.throws(() => safety.assertCanModifyDisk("applyPatch"), /forbidden in Plan Mode/);

      safety.setMode("build");
      assert.strictEqual(safety.canModifyDisk(), true);
      assert.strictEqual(safety.requiresApprovalForCommit(), true);

      safety.setMode("auto");
      assert.strictEqual(safety.canModifyDisk(), true);
      assert.strictEqual(safety.requiresApprovalForCommit(), false);
    });
  });

  describe("T14.5: Headless Server Protocol & JSON-RPC 2.0 Layer", () => {
    it("should process JSON-RPC request and handle auth tokens", async () => {
      const { HeadlessServerProtocol } = await import("../inference/HeadlessServerProtocol.js");
      const protocol = new HeadlessServerProtocol({ authToken: "secret-token-123" });

      protocol.registerMethod("engine/status", async (params) => {
        return { online: true, echo: params["query"] };
      });

      // Unauthorized request without token
      const unauthRes = await protocol.handleMessage(
        JSON.stringify({ jsonrpc: "2.0", id: 1, method: "engine/status", params: { query: "ping" } })
      );
      assert.ok(unauthRes?.includes("Unauthorized"));

      // Authorized request
      const authRes = await protocol.handleMessage(
        JSON.stringify({ jsonrpc: "2.0", id: 2, method: "engine/status", params: { query: "ping" } }),
        "secret-token-123"
      );
      assert.ok(authRes);
      const parsed = JSON.parse(authRes);
      assert.strictEqual(parsed.id, 2);
      assert.strictEqual(parsed.result.online, true);
      assert.strictEqual(parsed.result.echo, "ping");
    });
  });
});
