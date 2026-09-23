import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 002: Stack Instruction Profiles Schema
 *
 * Establishes persistent storage for language-agnostic stack profiles, custom
 * compiler directives, test runner commands, and scrubber rule exemptions.
 */
export const migration002: Migration = {
  id: "002_stack_profiles",
  name: "Create stack_instruction_profiles relational table",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS stack_instruction_profiles (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        default_test_runner VARCHAR(255) NOT NULL,
        data_json TEXT NOT NULL,
        created_at ${timestampType} NOT NULL,
        updated_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_stack_profiles_name ON stack_instruction_profiles(name);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw("DROP TABLE IF EXISTS stack_instruction_profiles;");
  }
};
