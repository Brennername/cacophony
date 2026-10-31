import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { RustSignatureHarvester } from "../signature/RustSignatureHarvester.js";

describe("RustSignatureHarvester", () => {
  const harvester = new RustSignatureHarvester();

  describe("Struct Declarations", () => {
    test("should harvest pub struct and private struct definitions with fields", () => {
      const code = `
        pub struct WorkerNode {
          pub id: String,
          pub address: String,
          port: u16,
          pub fallback_url: Option<String>,
        }
      `;

      const records = harvester.harvest("src/cluster/worker.rs", code);
      assert.equal(records.length, 1);
      const structRecord = records[0]!;
      assert.equal(structRecord.id, "src/cluster/worker.rs#WorkerNode");
      assert.equal(structRecord.language, "rust");
      assert.equal(structRecord.identifier, "WorkerNode");
      assert.equal(structRecord.kind, "type");
      assert.equal(structRecord.properties.length, 4);

      const idProp = structRecord.properties.find((p) => p.name === "id");
      assert.ok(idProp);
      assert.equal(idProp.type, "String");
      assert.equal(idProp.isOptional, false);

      const fallbackProp = structRecord.properties.find((p) => p.name === "fallback_url");
      assert.ok(fallbackProp);
      assert.equal(fallbackProp.isOptional, true);

      assert.ok(structRecord.rawCompressed.includes("pub struct WorkerNode"));
      assert.ok(structRecord.rawCompressed.includes("id: String"));
    });

    test("should handle generic struct declarations", () => {
      const code = `
        pub struct Queue<T> {
          items: Vec<T>,
          capacity: usize,
        }
      `;

      const records = harvester.harvest("src/queue.rs", code);
      assert.equal(records.length, 1);
      assert.equal(records[0]!.identifier, "Queue");
      assert.equal(records[0]!.properties.length, 2);
    });
  });

  describe("Trait Definitions", () => {
    test("should harvest pub trait methods with parameter types and return types", () => {
      const code = `
        pub trait TaskScheduler {
          fn schedule(&self, task_id: &str, priority: u32) -> Result<(), SchedulerError>;
          async fn cancel(&mut self, task_id: &str) -> bool;
        }
      `;

      const records = harvester.harvest("src/scheduler.rs", code);
      assert.equal(records.length, 1);
      const traitRecord = records[0]!;
      assert.equal(traitRecord.identifier, "TaskScheduler");
      assert.equal(traitRecord.kind, "interface");
      assert.equal(traitRecord.callables.length, 2);

      const scheduleMethod = traitRecord.callables.find((c) => c.name === "schedule");
      assert.ok(scheduleMethod);
      assert.equal(scheduleMethod.isAsync, false);
      assert.equal(scheduleMethod.returnType, "Result<(), SchedulerError>");
      // &self should be skipped, so 2 parameters
      assert.equal(scheduleMethod.parameters.length, 2);
      assert.equal(scheduleMethod.parameters[0]?.name, "task_id");
      assert.equal(scheduleMethod.parameters[0]?.type, "&str");
      assert.equal(scheduleMethod.parameters[1]?.name, "priority");
      assert.equal(scheduleMethod.parameters[1]?.type, "u32");

      const cancelMethod = traitRecord.callables.find((c) => c.name === "cancel");
      assert.ok(cancelMethod);
      assert.equal(cancelMethod.isAsync, true);
      assert.equal(cancelMethod.returnType, "bool");
      assert.equal(cancelMethod.parameters.length, 1);
      assert.equal(cancelMethod.parameters[0]?.name, "task_id");
    });
  });

  describe("Standalone Functions", () => {
    test("should harvest pub fn and async fn with signatures", () => {
      const code = `
        pub async fn fetch_metrics(endpoint: &str, timeout_ms: u64) -> MetricsReport {
          MetricsReport::default()
        }

        fn compute_sha256(payload: &[u8]) -> String {
          String::new()
        }
      `;

      const records = harvester.harvest("src/metrics.rs", code);
      assert.equal(records.length, 2);

      const fetchMetrics = records.find((r) => r.identifier === "fetch_metrics");
      assert.ok(fetchMetrics);
      assert.equal(fetchMetrics.kind, "function");
      assert.equal(fetchMetrics.callables.length, 1);
      assert.equal(fetchMetrics.callables[0]?.isAsync, true);
      assert.equal(fetchMetrics.callables[0]?.returnType, "MetricsReport");
      assert.equal(fetchMetrics.callables[0]?.parameters.length, 2);
      assert.equal(fetchMetrics.callables[0]?.parameters[0]?.name, "endpoint");
      assert.equal(fetchMetrics.callables[0]?.parameters[0]?.type, "&str");

      const shaFn = records.find((r) => r.identifier === "compute_sha256");
      assert.ok(shaFn);
      assert.equal(shaFn.callables[0]?.isAsync, false);
      assert.equal(shaFn.callables[0]?.returnType, "String");
    });

    test("should handle function with no return type defaulting to ()", () => {
      const code = `
        pub fn reset_system() {
          // logic
        }
      `;
      const records = harvester.harvest("src/system.rs", code);
      assert.equal(records.length, 1);
      assert.equal(records[0]!.callables[0]?.returnType, "()");
      assert.equal(records[0]!.callables[0]?.parameters.length, 0);
    });
  });
});
