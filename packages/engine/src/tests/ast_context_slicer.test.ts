import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AstContextSlicer } from "../context/AstContextSlicer.js";

describe("AstContextSlicer", () => {
  const slicer = new AstContextSlicer();

  describe("Symbol Import Extraction", () => {
    test("should extract named, aliased, and type-only imported symbols", () => {
      const consumerCode = `
        import { TaskQueue, PriorityDispatcher as Dispatcher } from "./scheduler.js";
        import type { QueueConfig } from "./types.js";
        import Logger from "./logger.js";
        import * as Crypto from "./crypto.js";
      `;

      const imports = slicer.extractImportedSymbols(consumerCode, "consumer.ts");
      assert.equal(imports.length, 5);

      const taskQueue = imports.find((i) => i.importedName === "TaskQueue");
      assert.ok(taskQueue);
      assert.equal(taskQueue.localAlias, "TaskQueue");
      assert.equal(taskQueue.isTypeOnly, false);
      assert.equal(taskQueue.moduleSpecifier, "./scheduler.js");

      const dispatcher = imports.find((i) => i.importedName === "PriorityDispatcher");
      assert.ok(dispatcher);
      assert.equal(dispatcher.localAlias, "Dispatcher");

      const config = imports.find((i) => i.importedName === "QueueConfig");
      assert.ok(config);
      assert.equal(config.isTypeOnly, true);

      const defImport = imports.find((i) => i.importedName === "default");
      assert.ok(defImport);
      assert.equal(defImport.localAlias, "Logger");

      const nsImport = imports.find((i) => i.importedName === "*");
      assert.ok(nsImport);
      assert.equal(nsImport.localAlias, "Crypto");
    });
  });

  describe("AST Type Skeleton Generation", () => {
    test("should preserve interfaces, types, and enums while filtering by symbols", () => {
      const dependencyCode = `
        export interface ExecutionContext {
          readonly executionId: string;
          readonly timestamp: number;
        }

        export type ExecutionStatus = "pending" | "running" | "completed";

        export enum PriorityLevel {
          Low = 0,
          Medium = 1,
          High = 2
        }

        export interface UnrelatedType {
          foo: string;
        }
      `;

      const result = slicer.generateTypeSkeleton(
        dependencyCode,
        ["ExecutionContext", "ExecutionStatus"],
        "dep.ts",
      );

      assert.ok(result.skeletonContent.includes("interface ExecutionContext"));
      assert.ok(result.skeletonContent.includes("type ExecutionStatus"));
      assert.ok(!result.skeletonContent.includes("PriorityLevel"));
      assert.ok(!result.skeletonContent.includes("UnrelatedType"));
      assert.ok(result.reductionRatio > 0);
    });

    test("should slice class implementations into member signatures without method bodies", () => {
      const classCode = `
        export class WorkerPool {
          private activeCount = 0;
          public readonly capacity: number;

          constructor(capacity: number) {
            this.capacity = capacity;
            this.activeCount = 0;
            console.log("initializing pool with heavy logic...");
          }

          public async dispatch(jobId: string, payload: unknown): Promise<boolean> {
            this.activeCount++;
            for (let i = 0; i < 100; i++) {
              doInternalWork(payload);
            }
            return true;
          }

          private internalHelper(): void {
            // private details
          }
        }
      `;

      const result = slicer.generateTypeSkeleton(classCode, ["WorkerPool"], "worker.ts");

      assert.ok(result.skeletonContent.includes("class WorkerPool"));
      assert.ok(result.skeletonContent.includes("dispatch(jobId: string, payload: unknown): Promise<boolean>"));
      assert.ok(!result.skeletonContent.includes("for (let i = 0; i < 100; i++)"));
      assert.ok(!result.skeletonContent.includes("initializing pool with heavy logic"));
      assert.ok(result.reductionRatio > 0.3);
    });

    test("should slice standalone functions into signatures stripping bodies", () => {
      const funcCode = `
        export function computeCheckSum(data: Uint8Array, seed: number = 0): string {
          let hash = seed;
          for (let i = 0; i < data.length; i++) {
            hash = (hash * 31 + data[i]!) >>> 0;
          }
          return hash.toString(16);
        }
      `;

      const result = slicer.generateTypeSkeleton(funcCode, ["computeCheckSum"], "crypto.ts");
      assert.ok(result.skeletonContent.includes("computeCheckSum(data: Uint8Array, seed: number = 0): string"));
      assert.ok(!result.skeletonContent.includes("hash = (hash * 31 + data[i]!)"));
    });

    test("should emit fallback marker when no requested symbols match", () => {
      const code = `
        export const SECRET_KEY = "xyz";
      `;
      const result = slicer.generateTypeSkeleton(code, ["NonExistent"], "secret.ts");
      assert.ok(
        result.skeletonContent.includes("[AST Context Slicer: No referenced top-level exports"),
      );
    });
  });
});
