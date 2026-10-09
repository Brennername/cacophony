import test from "node:test";
import assert from "node:assert/strict";
import { ContractSynthesizer } from "../inference/ContractSynthesizer.js";

test("ContractSynthesizer Suite (T81.3)", async (t) => {
  const synthesizer = new ContractSynthesizer();

  const userModel = {
    name: "UserSession",
    tableName: "user_sessions",
    description: "Represents an authenticated client session.",
    fields: [
      { name: "id", type: "string" as const, isPrimary: true },
      { name: "user_id", type: "string" as const },
      { name: "token_hash", type: "string" as const },
      { name: "is_active", type: "boolean" as const, defaultValue: "true" },
      { name: "created_at", type: "date" as const },
      { name: "metadata", type: "json" as const, isNullable: true }
    ]
  };

  await t.test("should synthesize valid TypeScript interface", () => {
    const tsCode = synthesizer.synthesizeTypescriptInterface(userModel);
    assert.ok(tsCode.includes("export interface UserSession {"));
    assert.ok(tsCode.includes("readonly id: string;"));
    assert.ok(tsCode.includes("readonly metadata?: Record<string, unknown>;"));

    const validation = synthesizer.validateAgainstWorkspace(tsCode);
    assert.strictEqual(validation.valid, true);
  });

  await t.test("should synthesize Zod validation schema", () => {
    const zodCode = synthesizer.synthesizeZodSchema(userModel);
    assert.ok(zodCode.includes("export const UserSessionSchema = z.object({"));
    assert.ok(zodCode.includes("id: z.string()"));
    assert.ok(zodCode.includes("metadata: z.record(z.unknown()).optional()"));
  });

  await t.test("should synthesize dialect-agnostic PostgreSQL and SQLite migrations", () => {
    const pgSql = synthesizer.synthesizeMigration(userModel, "postgres");
    assert.ok(pgSql.includes("CREATE TABLE IF NOT EXISTS user_sessions ("));
    assert.ok(pgSql.includes("id VARCHAR(255) PRIMARY KEY"));
    assert.ok(pgSql.includes("is_active BOOLEAN NOT NULL DEFAULT true"));
    assert.ok(pgSql.includes("metadata JSONB"));
    assert.ok(pgSql.includes("CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);"));

    const sqliteSql = synthesizer.synthesizeMigration(userModel, "sqlite");
    assert.ok(sqliteSql.includes("id TEXT PRIMARY KEY"));
    assert.ok(sqliteSql.includes("is_active INTEGER NOT NULL DEFAULT true"));
  });
});
