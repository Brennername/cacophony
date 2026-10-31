import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SignatureStore } from "../signature/SignatureStore.js";

describe("SignatureStore", () => {
  let store: SignatureStore;

  beforeEach(() => {
    store = new SignatureStore();
  });

  describe("Multi-Language Indexing and Symbol Caching", () => {
    test("should index and cache TypeScript signatures by symbol name", () => {
      const code = `
        export interface WorkerPoolConfig {
          maxWorkers: number;
          idleTimeoutMs: number;
        }
        export function createWorkerPool(config: WorkerPoolConfig): void {}
      `;

      const records = store.indexFile("src/pool.ts", code);
      assert.equal(records.length, 2);

      const iface = store.get("WorkerPoolConfig");
      assert.ok(iface);
      assert.equal(iface.identifier, "WorkerPoolConfig");
      assert.equal(iface.kind, "interface");

      const fn = store.get("createWorkerPool");
      assert.ok(fn);
      assert.equal(fn.identifier, "createWorkerPool");
      assert.equal(fn.kind, "function");
    });

    test("should index and cache Go signatures by symbol name", () => {
      const code = `
        package auth
        type AuthClaims struct {
          UserId string
          Role string
        }
        func ValidateClaims(token string) bool {
          return true
        }
      `;

      store.indexFile("pkg/auth/claims.go", code);
      const structRecord = store.get("AuthClaims");
      assert.ok(structRecord);
      assert.equal(structRecord.language, "go");

      const fnRecord = store.get("ValidateClaims");
      assert.ok(fnRecord);
      assert.equal(fnRecord.language, "go");
    });

    test("should index and cache Rust signatures by symbol name", () => {
      const code = `
        pub struct SystemClock {
          pub offset_nanos: i64,
        }
        pub fn read_clock() -> u64 {
          0
        }
      `;

      store.indexFile("src/clock.rs", code);
      const clockRecord = store.get("SystemClock");
      assert.ok(clockRecord);
      assert.equal(clockRecord.language, "rust");

      const fnRecord = store.get("read_clock");
      assert.ok(fnRecord);
      assert.equal(fnRecord.language, "rust");
    });

    test("should index and cache Java signatures by symbol name", () => {
      const code = `
        package com.engine;
        public class CacheManager {
          public void evict(String key) {}
        }
      `;

      store.indexFile("CacheManager.java", code);
      const javaRecord = store.get("CacheManager");
      assert.ok(javaRecord);
      assert.equal(javaRecord.language, "java");
    });

    test("should support scoped lookup with filePath parameter", () => {
      store.indexFile("src/module_a.ts", "export function duplicateName(): void {}");
      store.indexFile("src/module_b.ts", "export function duplicateName(): number { return 1; }");

      const recordA = store.get("duplicateName", "src/module_a.ts");
      assert.ok(recordA);
      assert.equal(recordA.filePath, "src/module_a.ts");

      const recordB = store.get("duplicateName", "src/module_b.ts");
      assert.ok(recordB);
      assert.equal(recordB.filePath, "src/module_b.ts");
    });
  });

  describe("File Invalidation and Re-indexing", () => {
    test("should invalidate signatures when invalidateFile is explicitly called", () => {
      store.indexFile("src/temp.ts", "export function ephemeralFunction(): void {}");
      assert.ok(store.get("ephemeralFunction"));

      store.invalidateFile("src/temp.ts");
      assert.equal(store.get("ephemeralFunction"), undefined);
    });

    test("should automatically invalidate obsolete signatures when a file is re-indexed", () => {
      const v1 = `
        export function oldFunctionA(): void {}
        export function persistentFunction(): void {}
      `;
      store.indexFile("src/feature.ts", v1);
      assert.ok(store.get("oldFunctionA"));
      assert.ok(store.get("persistentFunction"));

      const v2 = `
        export function newFunctionB(): void {}
        export function persistentFunction(): void {}
      `;
      store.indexFile("src/feature.ts", v2);

      // oldFunctionA should have been purged during re-indexing
      assert.equal(store.get("oldFunctionA"), undefined);
      assert.ok(store.get("newFunctionB"));
      assert.ok(store.get("persistentFunction"));
    });

    test("should clear all records when clear is called", () => {
      store.indexFile("src/a.ts", "export function fnA(): void {}");
      store.indexFile("src/b.ts", "export function fnB(): void {}");
      assert.equal(store.getAll().length, 2);

      store.clear();
      assert.equal(store.getAll().length, 0);
      assert.equal(store.get("fnA"), undefined);
    });
  });

  describe("Mini-Specification Formatting", () => {
    test("should generate formatted mini-spec for requested identifiers", () => {
      store.indexFile(
        "src/calc.ts",
        "export function add(a: number, b: number): number { return a + b; }",
      );

      const spec = store.formatTargetMiniSpec(["add"]);
      assert.ok(spec.includes("=== Target Interface Mini-Specification (Strict Signatures) ==="));
      assert.ok(spec.includes("// src/calc.ts"));
      assert.ok(spec.includes("function add(a: number, b: number): number"));
    });
  });
});
