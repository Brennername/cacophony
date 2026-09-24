import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SignatureHarvester } from "../signature/SignatureHarvester.js";
import { SignatureStore } from "../signature/SignatureStore.js";
import { SignatureAlignmentScrubber } from "../signature/SignatureAlignmentScrubber.js";

describe("Phase 23: AST Code Signature Compression & Mechanistic Interface Enforcement", () => {
  const harvester = new SignatureHarvester();

  describe("T23.1: Multi-Language Signature Harvesting & Compression", () => {
    test("should harvest deep TypeScript signatures including methods, parameters, and types", () => {
      const tsCode = `
        export interface DatabaseConfig {
          readonly host: string;
          readonly port?: number;
        }

        export class PostgresClient {
          public async query(sql: string, params?: readonly unknown[]): Promise<unknown[]> {
            return [];
          }
        }

        export function hashPassword(plain: string, salt: string): string {
          return plain + salt;
        }
      `;

      const records = harvester.harvestTypeScript("src/db/PostgresClient.ts", tsCode);
      assert.ok(records.length >= 3);

      const iface = records.find((r) => r.identifier === "DatabaseConfig");
      assert.ok(iface);
      assert.equal(iface.kind, "interface");
      assert.ok(iface.properties.some((p) => p.name === "host" && p.type === "string"));

      const cls = records.find((r) => r.identifier === "PostgresClient");
      assert.ok(cls);
      assert.equal(cls.kind, "class");
      const method = cls.callables.find((c) => c.name === "query");
      assert.ok(method);
      assert.equal(method.parameters[0]?.name, "sql");
      assert.equal(method.parameters[0]?.type, "string");
      assert.equal(method.isAsync, true);

      // Verify compact notation
      assert.ok(cls.rawCompressed.includes("class PostgresClient"));
      assert.ok(cls.rawCompressed.includes("query(sql: string, params?: readonly unknown[]): Promise<unknown[]>"));
    });

    test("should harvest Java class signatures and method parameters", () => {
      const javaCode = `
        package com.cacophony.inference;
        public class ModelOrchestrator {
          public String generateResponse(String promptText, int maxTokens) throws Exception {
            return promptText;
          }
        }
      `;

      const records = harvester.harvestJava("ModelOrchestrator.java", javaCode);
      assert.equal(records.length, 1);
      const rec = records[0]!;
      assert.equal(rec.identifier, "ModelOrchestrator");
      assert.equal(rec.callables.length, 1);
      assert.equal(rec.callables[0]?.name, "generateResponse");
      assert.equal(rec.callables[0]?.parameters.length, 2);
      assert.equal(rec.callables[0]?.parameters[0]?.name, "promptText");
    });

    test("should harvest Go struct and function signatures", () => {
      const goCode = `
        package worker
        type ClusterState struct {}
        func DispatchJob(jobId string, priority int) error {
          return nil
        }
      `;

      const records = harvester.harvestGo("worker.go", goCode);
      assert.equal(records.length, 2);
      assert.ok(records.some((r) => r.identifier === "ClusterState" && r.kind === "type"));
      const fn = records.find((r) => r.identifier === "DispatchJob");
      assert.ok(fn);
      assert.equal(fn.callables[0]?.parameters.length, 2);
      assert.equal(fn.callables[0]?.parameters[0]?.name, "jobId");
    });
  });

  describe("T23.2: SignatureStore & Target Mini-Specification Formatting", () => {
    test("should index signatures and format compressed prompt mini-specification", () => {
      const store = new SignatureStore();
      store.indexFile("src/math.ts", "export function add(a: number, b: number): number { return a + b; }");

      const spec = store.formatTargetMiniSpec(["add"]);
      assert.ok(spec.includes("=== Target Interface Mini-Specification"));
      assert.ok(spec.includes("function add(a: number, b: number): number"));
    });
  });

  describe("T23.3: SignatureAlignmentScrubber Mechanistic Hallucination Repair", () => {
    test("should detect and correct parameter typos prior to test execution", () => {
      const store = new SignatureStore();
      store.indexFile(
        "src/api.ts",
        `
        export interface CreateTaskOptions {
          title: string;
          priority: string;
        }
        export function createTask(opts: CreateTaskOptions): void {}
        `
      );

      const scrubber = new SignatureAlignmentScrubber(store);

      // LLM hallucinated 'titl' instead of 'title' and 'prioriy' instead of 'priority'
      const generatedCode = `
        import { createTask } from "./api.js";
        createTask({
          titl: "Implement test loop",
          prioriy: "P0"
        });
      `;

      const result = scrubber.scrubTypeScript("task.ts", generatedCode);
      assert.equal(result.modified, true);
      assert.ok(result.corrections.length >= 2);
      assert.ok(result.code.includes('title: "Implement test loop"'));
      assert.ok(result.code.includes('priority: "P0"'));
    });
  });
});
