import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as http from "node:http";
import { EnqueueTaskcadeTaskTool } from "../implementations/EnqueueTaskcadeTaskTool.js";
import { ToolRegistry } from "../ToolRegistry.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("Phase 72: T72.3 EnqueueTaskcadeTaskTool Unit Tests", () => {
  it("should be registered in default ToolRegistry", () => {
    const registry = new ToolRegistry();
    const tool = registry.getTool("enqueue_taskcade_task");
    assert.ok(tool, "enqueue_taskcade_task must be registered in ToolRegistry");
    assert.strictEqual(tool.definition.name, "enqueue_taskcade_task");
  });

  it("should successfully enqueue task with full metadataHints via direct taskRepository", async () => {
    const tool = new EnqueueTaskcadeTaskTool();
    const recordedTasks: TaskRecord[] = [];

    const mockRepo = {
      create: async (record: TaskRecord) => {
        recordedTasks.push(record);
        return record;
      },
    };

    const context: ToolExecutionContext = {
      workspaceRoot: "/tmp/cacophony",
      taskId: "agent-caller-1",
      taskRepository: mockRepo,
    } as any;

    const result = await tool.execute(
      {
        title: "Build auth guard middleware",
        prompt: "Implement robust JWT auth guard [Role: security_auditor]",
        role: "security_auditor",
        priority: "P0",
        metadataHints: {
          modelAffinity: "qwen2.5-coder:14b",
          temperature: 0.2,
          maxTokens: 4096,
          timeoutMs: 600000,
          ruleBypassFlags: ["emoji_scrubber"],
          stack: "nestjs",
        },
      },
      context,
    );

    assert.ok(result.success, `Expected tool execution to succeed: ${result.error}`);
    assert.strictEqual(recordedTasks.length, 1);

    const enqueued = recordedTasks[0]!;
    assert.strictEqual(enqueued.title, "Build auth guard middleware");
    assert.strictEqual(enqueued.role, "security_auditor");
    assert.strictEqual(enqueued.priority, "P0");
    assert.ok(enqueued.metadataHints);
    assert.strictEqual(enqueued.metadataHints.modelAffinity, "qwen2.5-coder:14b");
    assert.strictEqual(enqueued.metadataHints.temperature, 0.2);
    assert.strictEqual(enqueued.metadataHints.maxTokens, 4096);
    assert.strictEqual(enqueued.metadataHints.timeoutMs, 600000);
    assert.deepStrictEqual(enqueued.metadataHints.ruleBypassFlags, ["emoji_scrubber"]);
    assert.strictEqual(enqueued.metadataHints.stack, "nestjs");

    const parsedOutput = JSON.parse(result.output);
    assert.strictEqual(parsedOutput.title, "Build auth guard middleware");
    assert.strictEqual(parsedOutput.metadataHints.modelAffinity, "qwen2.5-coder:14b");
  });

  it("should successfully enqueue task via mock HTTP API when taskRepository is not provided", async () => {
    let receivedPayload: any = null;

    const server = http.createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/tasks") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          receivedPayload = JSON.parse(body);
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: "task-http-created-1",
              ...receivedPayload,
              status: "PENDING",
            }),
          );
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as any;
    const apiUrl = `http://127.0.0.1:${address.port}`;

    try {
      const tool = new EnqueueTaskcadeTaskTool();
      const context: ToolExecutionContext = {
        workspaceRoot: "/tmp/cacophony",
        apiUrl,
      } as any;

      const result = await tool.execute(
        {
          title: "Optimize tree-shaking bundle size",
          prompt: "Analyze rollup build chunks",
          role: "architect",
          priority: "P1",
          metadataHints: {
            modelAffinity: "qwen2.5-coder:7b-instruct-q4_K_M",
            temperature: 0.1,
            maxTokens: 2048,
            ruleBypassFlags: ["empty_file_guard"],
          },
        },
        context,
      );

      assert.ok(result.success, `Expected HTTP enqueue to succeed: ${result.error}`);
      assert.ok(receivedPayload);
      assert.strictEqual(receivedPayload.title, "Optimize tree-shaking bundle size");
      assert.strictEqual(receivedPayload.role, "architect");
      assert.strictEqual(receivedPayload.metadataHints.modelAffinity, "qwen2.5-coder:7b-instruct-q4_K_M");
      assert.deepStrictEqual(receivedPayload.metadataHints.ruleBypassFlags, ["empty_file_guard"]);

      const parsedOutput = JSON.parse(result.output);
      assert.strictEqual(parsedOutput.id, "task-http-created-1");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("should fail gracefully with descriptive error when HTTP API endpoint is unreachable", async () => {
    const tool = new EnqueueTaskcadeTaskTool();
    const context: ToolExecutionContext = {
      workspaceRoot: "/tmp/cacophony",
      apiUrl: "http://127.0.0.1:59999", // Unbound port
    } as any;

    const result = await tool.execute(
      {
        title: "Failing Network Task",
        prompt: "Will fail due to network connection refused",
      },
      context,
    );

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes("Exception enqueuing task"));
  });
});
