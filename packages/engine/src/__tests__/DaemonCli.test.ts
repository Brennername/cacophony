import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";
import { StreamTapManager } from "../inference/StreamTapManager.js";
import { DaemonIPCServer, DaemonIPCClient } from "../daemon/DaemonIPC.js";
import { CacophonyCli } from "../cli/CacophonyCli.js";

describe("Daemon IPC, Stream Tapping & Cacophony CLI", () => {
  const socketPath = path.join(os.tmpdir(), `cacophony-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.sock`);
  const streamTapManager = new StreamTapManager();
  let server: DaemonIPCServer;
  let client: DaemonIPCClient;

  let schedulerPaused = false;
  const mockTasks: Array<{ id: string; title: string; prompt: string }> = [];

  before(async () => {
    server = new DaemonIPCServer({
      socketPath,
      streamTapManager,
      handler: async (cmd, params) => {
        switch (cmd) {
          case "status":
            return {
              status: "ONLINE",
              uptimeSeconds: 42,
              pendingTasksCount: mockTasks.length,
              activeTaskId: streamTapManager.getActiveTask(),
              schedulerPaused
            };
          case "pause":
            schedulerPaused = true;
            return { message: "Task scheduler paused" };
          case "resume":
            schedulerPaused = false;
            return { message: "Task scheduler resumed" };
          case "tasks.enqueue": {
            const newTask = {
              id: `task_${Date.now()}`,
              title: String(params?.title || ""),
              prompt: String(params?.prompt || "")
            };
            mockTasks.push(newTask);
            return newTask;
          }
          case "tasks.list":
            return mockTasks;
          case "models":
            return [{ modelId: "qwen2.5-coder:7b", status: "HEALTHY" }];
          case "telemetry":
            return { edgeTempC: 45, gpuBusyPct: 15 };
          case "stream.suspend":
            return { suspended: streamTapManager.suspend(params?.taskId as string) };
          case "stream.resume":
            return { resumed: streamTapManager.resume(params?.taskId as string) };
          default:
            throw new Error(`Unknown mock command: ${cmd}`);
        }
      }
    });

    await server.start();
    client = new DaemonIPCClient(socketPath);
  });

  after(async () => {
    await server.stop();
  });

  describe("StreamTapManager Flow Control & Token Auditing", () => {
    test("should emit tokens to active listeners", () => {
      const tapMgr = new StreamTapManager();
      const tokens: string[] = [];

      const untap = tapMgr.tap((e) => {
        tokens.push(e.token);
      });

      tapMgr.emitToken("task-123", "const ");
      tapMgr.emitToken("task-123", "x = ");
      tapMgr.emitToken("task-123", "42;");

      untap();
      tapMgr.emitToken("task-123", "ignored");

      assert.deepEqual(tokens, ["const ", "x = ", "42;"]);
    });

    test("should manage suspend and resume states", () => {
      const tapMgr = new StreamTapManager();
      tapMgr.setActiveTask("task-audit-1");

      assert.equal(tapMgr.isSuspended(), false);
      tapMgr.suspend();
      assert.equal(tapMgr.isSuspended(), true);
      tapMgr.resume();
      assert.equal(tapMgr.isSuspended(), false);
    });
  });

  describe("DaemonIPCServer & DaemonIPCClient Protocol", () => {
    test("should report online status when socket is connected", async () => {
      const isOnline = await client.isOnline();
      assert.equal(isOnline, true);
    });

    test("should execute status query over IPC", async () => {
      const res = await client.request("status") as { status: string; uptimeSeconds: number };
      assert.equal(res.status, "ONLINE");
      assert.equal(res.uptimeSeconds, 42);
    });

    test("should execute pause and resume lifecycle transitions", async () => {
      const pauseRes = await client.request("pause") as { message: string };
      assert.ok(pauseRes.message.includes("paused"));

      const statusAfterPause = await client.request("status") as { schedulerPaused: boolean };
      assert.equal(statusAfterPause.schedulerPaused, true);

      const resumeRes = await client.request("resume") as { message: string };
      assert.ok(resumeRes.message.includes("resumed"));

      const statusAfterResume = await client.request("status") as { schedulerPaused: boolean };
      assert.equal(statusAfterResume.schedulerPaused, false);
    });

    test("should enqueue task and query tasks list", async () => {
      const enqueueRes = await client.request("tasks.enqueue", {
        title: "Test Task 1",
        prompt: "Fix database index"
      }) as { id: string; title: string };

      assert.ok(enqueueRes.id.startsWith("task_"));
      assert.equal(enqueueRes.title, "Test Task 1");

      const listRes = await client.request("tasks.list") as Array<{ id: string; title: string }>;
      assert.ok(listRes.some((t) => t.title === "Test Task 1"));
    });

    test("should tap live LLM stream over IPC socket in real time", async () => {
      const receivedTokens: string[] = [];

      const untap = client.tapStream((token) => {
        receivedTokens.push(token);
      });

      // Wait 50ms for socket registration
      await new Promise((r) => setTimeout(r, 50));

      streamTapManager.emitToken("task-live-1", "function ");
      streamTapManager.emitToken("task-live-1", "arena() ");
      streamTapManager.emitToken("task-live-1", "{}");

      // Allow flush
      await new Promise((r) => setTimeout(r, 100));
      untap();

      assert.deepEqual(receivedTokens, ["function ", "arena() ", "{}"]);
    });

    test("should support remote stream suspend and resume", async () => {
      streamTapManager.setActiveTask("task-live-2");

      const suspendRes = await client.request("stream.suspend", { taskId: "task-live-2" }) as { suspended: boolean };
      assert.equal(suspendRes.suspended, true);
      assert.equal(streamTapManager.isSuspended("task-live-2"), true);

      const resumeRes = await client.request("stream.resume", { taskId: "task-live-2" }) as { resumed: boolean };
      assert.equal(resumeRes.resumed, true);
      assert.equal(streamTapManager.isSuspended("task-live-2"), false);
    });
  });

  describe("CacophonyCli Command Dispatcher", () => {
    let cli: CacophonyCli;

    before(() => {
      cli = new CacophonyCli(socketPath);
    });

    test("should return 0 for help command", async () => {
      const code = await cli.run(["--help"]);
      assert.equal(code, 0);
    });

    test("should dispatch status command successfully", async () => {
      const code = await cli.run(["status"]);
      assert.equal(code, 0);
    });

    test("should dispatch pause and resume commands", async () => {
      const pauseCode = await cli.run(["pause"]);
      assert.equal(pauseCode, 0);

      const resumeCode = await cli.run(["resume"]);
      assert.equal(resumeCode, 0);
    });

    test("should dispatch models query", async () => {
      const code = await cli.run(["models"]);
      assert.equal(code, 0);
    });

    test("should dispatch scrub command on a local source file", async () => {
      const testFile = path.join(os.tmpdir(), `scrub-test-${Date.now()}.ts`);
      fs.writeFileSync(testFile, 'import { a } from "./a";\nconst hello = "world \u{1F389}";\n');

      const code = await cli.run(["scrub", testFile, "--allow-emojis"]);
      assert.equal(code, 0);

      // Clean up
      try {
        fs.unlinkSync(testFile);
      } catch {
        // Ignore
      }
    });
  });
});
