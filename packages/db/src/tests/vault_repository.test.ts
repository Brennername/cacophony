import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { VaultRepository } from "../repositories/VaultRepository.js";

describe("VaultRepository", () => {
  let driver: PGliteDriver;
  let repo: VaultRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new VaultRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should store and retrieve encrypted secret by key name", async () => {
    await repo.setSecret("OPENAI_API_KEY", "enc_aes256_payload_123", "iv_vector_456");

    const secret = await repo.getSecret("OPENAI_API_KEY");
    assert.ok(secret);
    assert.equal(secret.secretKey, "OPENAI_API_KEY");
    assert.equal(secret.encryptedValue, "enc_aes256_payload_123");
    assert.equal(secret.iv, "iv_vector_456");
  });

  test("should update existing secret on conflict", async () => {
    await repo.setSecret("GITHUB_TOKEN", "old_encrypted_val", "old_iv");
    await repo.setSecret("GITHUB_TOKEN", "new_encrypted_val", "new_iv");

    const secret = await repo.getSecret("GITHUB_TOKEN");
    assert.ok(secret);
    assert.equal(secret.encryptedValue, "new_encrypted_val");
    assert.equal(secret.iv, "new_iv");
  });

  test("should list all secret keys alphabetically without exposing values", async () => {
    await repo.setSecret("DATABASE_PASSWORD", "enc1", "iv1");
    await repo.setSecret("AWS_SECRET_KEY", "enc2", "iv2");
    await repo.setSecret("JWT_SECRET", "enc3", "iv3");

    const keys = await repo.listKeys();
    assert.equal(keys.length, 3);
    assert.deepEqual(keys, ["AWS_SECRET_KEY", "DATABASE_PASSWORD", "JWT_SECRET"]);
  });

  test("should delete secret from vault and return deletion status", async () => {
    await repo.setSecret("TEMP_SECRET", "val", "iv");
    assert.ok(await repo.getSecret("TEMP_SECRET"));

    const deleted = await repo.deleteSecret("TEMP_SECRET");
    assert.equal(deleted, true);

    const nonExistent = await repo.getSecret("TEMP_SECRET");
    assert.equal(nonExistent, null);

    const deleteAgain = await repo.deleteSecret("TEMP_SECRET");
    assert.equal(deleteAgain, false);
  });
});
