import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { CodeSignatureRecord } from "@cacophony/shared-types";
import { SignatureStore } from "../signature/SignatureStore.js";
import { SignatureAlignmentScrubber } from "../signature/SignatureAlignmentScrubber.js";

describe("SignatureAlignmentScrubber", () => {
  describe("TypeScript Mechanistic Hallucination Repair", () => {
    test("should align misspelled object argument keys against authoritative interface", () => {
      const store = new SignatureStore();
      store.indexFile(
        "src/api/auth.ts",
        `
        export interface LoginOptions {
          username: string;
          rememberMe: boolean;
        }
        export function authenticateUser(opts: LoginOptions): void {}
        `,
      );

      const scrubber = new SignatureAlignmentScrubber(store);
      const generatedCode = `
        import { authenticateUser } from "./api/auth.js";
        authenticateUser({
          usernam: "admin",
          remberMe: true
        });
      `;

      const result = scrubber.scrubTypeScript("test.ts", generatedCode);
      assert.equal(result.modified, true);
      assert.ok(result.corrections.length >= 2);
      assert.ok(result.code.includes('username: "admin"'));
      assert.ok(result.code.includes("rememberMe: true"));
    });

    test("should leave code unmodified when parameter names match exactly", () => {
      const store = new SignatureStore();
      store.indexFile(
        "src/api/items.ts",
        `
        export interface QueryParams {
          limit: number;
        }
        export function fetchItems(opts: QueryParams): void {}
        `,
      );

      const scrubber = new SignatureAlignmentScrubber(store);
      const validCode = `
        import { fetchItems } from "./api/items.js";
        fetchItems({ limit: 10 });
      `;

      const result = scrubber.scrubTypeScript("valid.ts", validCode);
      assert.equal(result.modified, false);
      assert.equal(result.corrections.length, 0);
    });
  });

  describe("Cross-Language Signature Comparison & Drift Warning Emission", () => {
    const store = new SignatureStore();
    const scrubber = new SignatureAlignmentScrubber(store);

    test("should detect identical signatures without emitting warnings", () => {
      const canonRecord: CodeSignatureRecord = {
        id: "src/types.ts#TaskWorker",
        filePath: "src/types.ts",
        language: "typescript",
        identifier: "TaskWorker",
        kind: "interface",
        callables: [
          {
            name: "execute",
            parameters: [{ name: "taskId", type: "string", isOptional: false }],
            returnType: "void",
            isAsync: false,
          },
        ],
        properties: [{ name: "workerId", type: "string", isOptional: false, isReadonly: true }],
        rawCompressed: "interface TaskWorker",
      };

      const targetRecord: CodeSignatureRecord = {
        id: "src/worker.rs#TaskWorker",
        filePath: "src/worker.rs",
        language: "rust",
        identifier: "TaskWorker",
        kind: "interface",
        callables: [
          {
            name: "execute",
            parameters: [{ name: "task_id", type: "&str", isOptional: false }],
            returnType: "()",
            isAsync: false,
          },
        ],
        properties: [{ name: "worker_id", type: "String", isOptional: false, isReadonly: false }],
        rawCompressed: "trait TaskWorker",
      };

      const warnings = scrubber.compareSignatures(canonRecord, targetRecord);
      assert.equal(warnings.length, 0);
    });

    test("should detect missing method and parameter count mismatch", () => {
      const canonRecord: CodeSignatureRecord = {
        id: "src/types.ts#Storage",
        filePath: "src/types.ts",
        language: "typescript",
        identifier: "Storage",
        kind: "interface",
        callables: [
          {
            name: "get",
            parameters: [{ name: "key", type: "string", isOptional: false }],
            returnType: "string",
            isAsync: false,
          },
          {
            name: "set",
            parameters: [
              { name: "key", type: "string", isOptional: false },
              { name: "value", type: "string", isOptional: false },
              { name: "ttl", type: "number", isOptional: true },
            ],
            returnType: "void",
            isAsync: false,
          },
        ],
        properties: [],
        rawCompressed: "interface Storage",
      };

      const targetRecord: CodeSignatureRecord = {
        id: "pkg/storage.go#Storage",
        filePath: "pkg/storage.go",
        language: "go",
        identifier: "Storage",
        kind: "interface",
        callables: [
          // Missing 'get', and 'set' has wrong number of parameters
          {
            name: "set",
            parameters: [{ name: "key", type: "string", isOptional: false }],
            returnType: "void",
            isAsync: false,
          },
        ],
        properties: [],
        rawCompressed: "type Storage interface",
      };

      const warnings = scrubber.compareSignatures(canonRecord, targetRecord);
      assert.ok(warnings.some((w) => w.kind === "missing_method" && w.symbol.includes("Storage.get")));
      assert.ok(
        warnings.some(
          (w) => w.kind === "parameter_count_mismatch" && w.symbol.includes("Storage.set"),
        ),
      );
    });

    test("should detect missing properties and return type drift", () => {
      const canonRecord: CodeSignatureRecord = {
        id: "src/types.ts#Config",
        filePath: "src/types.ts",
        language: "typescript",
        identifier: "Config",
        kind: "interface",
        callables: [
          {
            name: "validate",
            parameters: [],
            returnType: "boolean",
            isAsync: false,
          },
        ],
        properties: [
          { name: "port", type: "number", isOptional: false, isReadonly: false },
          { name: "host", type: "string", isOptional: false, isReadonly: false },
        ],
        rawCompressed: "interface Config",
      };

      const targetRecord: CodeSignatureRecord = {
        id: "src/config.rs#Config",
        filePath: "src/config.rs",
        language: "rust",
        identifier: "Config",
        kind: "type",
        callables: [
          {
            name: "validate",
            parameters: [],
            returnType: "String", // Incompatible with boolean
            isAsync: false,
          },
        ],
        properties: [
          // Missing 'port'
          { name: "host", type: "String", isOptional: false, isReadonly: false },
        ],
        rawCompressed: "struct Config",
      };

      const warnings = scrubber.compareSignatures(canonRecord, targetRecord);
      assert.ok(warnings.some((w) => w.kind === "missing_property" && w.symbol.includes("Config.port")));
      assert.ok(warnings.some((w) => w.kind === "return_type_mismatch" && w.symbol.includes("Config.validate")));
    });

    test("should find drift across arrays of CodeSignatureRecords", () => {
      const canonical: CodeSignatureRecord[] = [
        {
          id: "canon#ServiceA",
          filePath: "service_a.ts",
          language: "typescript",
          identifier: "ServiceA",
          kind: "interface",
          callables: [],
          properties: [],
          rawCompressed: "interface ServiceA",
        },
        {
          id: "canon#ServiceB",
          filePath: "service_b.ts",
          language: "typescript",
          identifier: "ServiceB",
          kind: "interface",
          callables: [],
          properties: [],
          rawCompressed: "interface ServiceB",
        },
      ];

      const target: CodeSignatureRecord[] = [
        {
          id: "target#ServiceA",
          filePath: "service_a.go",
          language: "go",
          identifier: "ServiceA",
          kind: "interface",
          callables: [],
          properties: [],
          rawCompressed: "type ServiceA interface",
        },
      ];

      const drift = scrubber.findDrift(canonical, target);
      assert.equal(drift.length, 1);
      assert.equal(drift[0]!.kind, "missing_method");
      assert.equal(drift[0]!.symbol, "ServiceB");
    });
  });
});
