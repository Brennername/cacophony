// packages/engine/src/tests/structured_logger.test.ts

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  StructuredLogger,
  type LogEntry,
} from "../telemetry/StructuredLogger.js";

describe("T74.6.4: StructuredLogger JSON Format, Level Filtering, and Context Propagation", () => {
  it("should format logs as valid JSON matching schema", () => {
    const entries: LogEntry[] = [];
    const rawStrings: string[] = [];

    const logger = new StructuredLogger({
      module: "scheduler",
      minLevel: "DEBUG",
      sink: (entry, raw) => {
        entries.push(entry);
        rawStrings.push(raw);
      },
    });

    logger.info("Task dispatched to worker", { taskId: "task-001", model: "qwen2.5-coder:7b" });

    assert.equal(entries.length, 1);
    const entry = entries[0]!;
    assert.equal(entry.level, "INFO");
    assert.equal(entry.module, "scheduler");
    assert.equal(entry.message, "Task dispatched to worker");
    assert.equal(entry.metadata?.["taskId"], "task-001");
    assert.equal(entry.metadata?.["model"], "qwen2.5-coder:7b");
    assert.ok(entry.timestamp);

    // Verify raw JSON string is parseable
    const rawFirst = rawStrings[0]!;
    const parsed = JSON.parse(rawFirst);
    assert.equal(parsed.message, "Task dispatched to worker");
    assert.equal(parsed.module, "scheduler");
  });

  it("should filter logs below configured minLevel", () => {
    const entries: LogEntry[] = [];
    const logger = new StructuredLogger({
      module: "test",
      minLevel: "WARN",
      sink: (entry) => entries.push(entry),
    });

    logger.debug("Debug message - should be ignored");
    logger.info("Info message - should be ignored");
    logger.warn("Warning message - should be captured");
    logger.error("Error message - should be captured");

    assert.equal(entries.length, 2);
    assert.equal(entries[0]!.level, "WARN");
    assert.equal(entries[1]!.level, "ERROR");
  });

  it("should propagate correlationId across child logger instances", () => {
    const entries: LogEntry[] = [];
    const baseLogger = new StructuredLogger({
      module: "daemon",
      sink: (entry) => entries.push(entry),
    });

    const correlatedLogger = baseLogger.withCorrelationId("corr-req-12345");
    correlatedLogger.info("Request started");

    const subModuleLogger = correlatedLogger.withModule("auth");
    subModuleLogger.info("Token validated");

    assert.equal(entries.length, 2);
    assert.equal(entries[0]!.correlationId, "corr-req-12345");
    assert.equal(entries[0]!.module, "daemon");

    assert.equal(entries[1]!.correlationId, "corr-req-12345");
    assert.equal(entries[1]!.module, "auth");
  });

  it("should serialize error instances with stack trace and message", () => {
    const entries: LogEntry[] = [];
    const logger = new StructuredLogger({
      module: "worker",
      sink: (entry) => entries.push(entry),
    });

    const simulatedError = new Error("Connection timed out to Ollama");
    logger.error("Inference failure occurred", simulatedError, { retryCount: 2 });

    assert.equal(entries.length, 1);
    const entry = entries[0]!;
    assert.equal(entry.level, "ERROR");
    assert.equal(entry.error?.name, "Error");
    assert.equal(entry.error?.message, "Connection timed out to Ollama");
    assert.ok(entry.error?.stack?.includes("Error: Connection timed out to Ollama"));
    assert.equal(entry.metadata?.["retryCount"], 2);
  });
});
