import test from "node:test";
import assert from "node:assert/strict";
import { HashStubMethodSplicer } from "../context/HashStubMethodSplicer.js";

test("HashStubMethodSplicer Suite (T93.2.1)", async (t) => {
  const originalCode = `import { Database } from "./db.js";

export class AccountService {
  private balance: number = 0;

  public getBalance(): number {
    return this.balance;
  }

  public deposit(amount: number): void {
    /* [CACOPHONY_HASH_STUB:4f3b2a19:deposit] */
    throw new Error("Method not implemented.");
  }

  public withdraw(amount: number): void {
    /* [CACOPHONY_HASH_STUB:8c7d6e5a:withdraw] */
    throw new Error("Method not implemented.");
  }
}
`;

  await t.test("successfully splices replacement method into target hash position", () => {
    const replacement = `  public deposit(amount: number): void {
    if (amount <= 0) throw new Error("Invalid amount");
    this.balance += amount;
  }`;

    const result = HashStubMethodSplicer.splice(originalCode, "4f3b2a19", replacement);
    assert.equal(result.spliced, true);
    assert.equal(result.methodName, "deposit");
    assert.ok(result.updatedCode.includes("this.balance += amount;"));
    assert.ok(!result.updatedCode.includes("CACOPHONY_HASH_STUB:4f3b2a19"));
    // Sibling methods must be preserved
    assert.ok(result.updatedCode.includes("public getBalance(): number"));
    assert.ok(result.updatedCode.includes("/* [CACOPHONY_HASH_STUB:8c7d6e5a:withdraw] */"));
  });

  await t.test("matches by method name when hash is provided as method name", () => {
    const replacement = `  public withdraw(amount: number): void {
    if (amount > this.balance) throw new Error("Insufficient funds");
    this.balance -= amount;
  }`;

    const result = HashStubMethodSplicer.splice(originalCode, "withdraw", replacement);
    assert.equal(result.spliced, true);
    assert.equal(result.methodName, "withdraw");
    assert.ok(result.updatedCode.includes("Insufficient funds"));
    assert.ok(!result.updatedCode.includes("CACOPHONY_HASH_STUB:8c7d6e5a"));
  });

  await t.test("returns spliced: false when target hash does not exist in code", () => {
    const result = HashStubMethodSplicer.splice(originalCode, "nonexistent_hash", "code");
    assert.equal(result.spliced, false);
    assert.equal(result.updatedCode, originalCode);
  });
});
