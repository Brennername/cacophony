import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { AstInspectTool } from "../implementations/AstInspectTool.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

describe("AstInspectTool", () => {
  let tempDir: string;
  let tool: AstInspectTool;
  let context: ToolExecutionContext;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-ast-inspect-test-"));
    tool = new AstInspectTool();
    context = {
      workspaceRoot: tempDir,
      taskId: "task-ast-101",
    };
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should extract structural declarations including classes, methods, and interfaces", async () => {
    const filePath = path.join(tempDir, "PaymentProcessor.ts");
    const content = `
      import { Transaction } from "./Transaction.js";
      import { Logger } from "@cacophony/logger";

      export interface IPaymentConfig {
        merchantId: string;
        timeoutMs: number;
      }

      export class PaymentProcessor {
        public async processPayment(tx: Transaction): Promise<boolean> {
          return true;
        }

        private logAudit(): void {}
      }

      export function createProcessor(config: IPaymentConfig): PaymentProcessor {
        return new PaymentProcessor();
      }
    `;
    await fs.writeFile(filePath, content, "utf-8");

    const result = await tool.execute({ path: "PaymentProcessor.ts", extractTypes: true }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("PaymentProcessor.ts"));
    assert.ok(result.output.includes("Transaction"));
    assert.ok(result.output.includes("IPaymentConfig"));
    assert.ok(result.output.includes("class PaymentProcessor:"));
    assert.ok(result.output.includes("processPayment"));
    assert.ok(result.output.includes("createProcessor"));
  });

  it("should omit interfaces when extractTypes is false", async () => {
    const filePath = path.join(tempDir, "TypesSample.ts");
    const content = `
      export interface UserAccount {
        id: string;
      }
      export class AccountService {
        public find(): void {}
      }
    `;
    await fs.writeFile(filePath, content, "utf-8");

    const result = await tool.execute({ path: "TypesSample.ts", extractTypes: false }, context);
    assert.equal(result.success, true);
    assert.ok(!result.output.includes("Interfaces & Types"));
    assert.ok(result.output.includes("class AccountService:"));
  });

  it("should fail gracefully when file does not exist", async () => {
    const result = await tool.execute({ path: "non_existent.ts", extractTypes: true }, context);
    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes("ENOENT") || result.error.includes("no such file"));
  });
});
