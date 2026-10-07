import test from "node:test";
import assert from "node:assert/strict";
import { HashStubGenerator } from "../context/HashStubGenerator.js";

test("HashStubGenerator Suite (T93.1.1)", async (t) => {
  await t.test("generates deterministic 8-character hex hash", () => {
    const hash1 = HashStubGenerator.generateHash("src/service/Payment.ts", "processCharge");
    const hash2 = HashStubGenerator.generateHash("src/service/Payment.ts", "processCharge");
    const hashDiff = HashStubGenerator.generateHash("src/service/Payment.ts", "refundCharge");

    assert.equal(hash1.length, 8);
    assert.equal(hash1, hash2, "Identical inputs must yield identical hash");
    assert.notEqual(hash1, hashDiff, "Different methods must yield distinct hashes");
    assert.match(hash1, /^[a-f0-9]{8}$/);
  });

  await t.test("creates structured stub comment anchor", () => {
    const comment = HashStubGenerator.createStubComment("src/User.ts", "findById");
    assert.match(comment, /^\/\*\s*\[CACOPHONY_HASH_STUB:[a-f0-9]{8}:findById\]\s*\*\/$/);
  });

  await t.test("creates stubbed method with signature and fallback exception", () => {
    const stubMethod = HashStubGenerator.createStubbedMethod(
      "computeTotal",
      "computeTotal(items: number[]): number",
      "src/Cart.ts"
    );

    assert.ok(stubMethod.includes("public computeTotal(items: number[]): number {"));
    assert.ok(stubMethod.includes("[CACOPHONY_HASH_STUB:"));
    assert.ok(stubMethod.includes("throw new Error('Method not implemented.');"));
  });

  await t.test("extracts multiple stub anchors with correct line numbers", () => {
    const code = [
      "export class DataProcessor {",
      "  public parse(input: string): void {",
      "    /* [CACOPHONY_HASH_STUB:1234abcd:parse] */",
      "    throw new Error('Method not implemented.');",
      "  }",
      "",
      "  public format(input: string): string {",
      "    /* [CACOPHONY_HASH_STUB:5678efab:format] */",
      "    throw new Error('Method not implemented.');",
      "  }",
      "}",
    ].join("\n");

    const stubs = HashStubGenerator.extractStubs(code);
    assert.equal(stubs.length, 2);
    assert.equal(stubs[0]!.methodName, "parse");
    assert.equal(stubs[0]!.hash, "1234abcd");
    assert.equal(stubs[0]!.lineNumber, 3);
    assert.equal(stubs[1]!.methodName, "format");
    assert.equal(stubs[1]!.hash, "5678efab");
    assert.equal(stubs[1]!.lineNumber, 8);
  });
});
