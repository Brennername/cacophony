import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { SecretVaultRecord } from "@cacophony/shared-types";

interface VaultRow {
  readonly id: string;
  readonly secret_key: string;
  readonly encrypted_value: string;
  readonly iv: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * VaultRepository
 *
 * Persists AES-256-GCM encrypted API keys and secrets in the database.
 */
export class VaultRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Sets or updates an encrypted secret in the vault.
   */
  public async setSecret(key: string, encryptedValue: string, iv: string): Promise<void> {
    const now = new Date().toISOString();
    const id = `sec_${key.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

    await this.driver.execute(
      `INSERT INTO secret_vault (id, secret_key, encrypted_value, iv, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (secret_key) DO UPDATE SET
         encrypted_value = EXCLUDED.encrypted_value,
         iv = EXCLUDED.iv,
         updated_at = EXCLUDED.updated_at`,
      [id, key, encryptedValue, iv, now, now]
    );
  }

  /**
   * Retrieves an encrypted secret by its key name.
   */
  public async getSecret(key: string): Promise<SecretVaultRecord | null> {
    const row = await this.driver.queryOne<VaultRow>(
      "SELECT * FROM secret_vault WHERE secret_key = $1",
      [key]
    );
    return row ? this.mapRow(row) : null;
  }

  /**
   * Lists all stored secret keys without revealing encrypted values.
   */
  public async listKeys(): Promise<readonly string[]> {
    const rows = await this.driver.query<{ readonly secret_key: string }>(
      "SELECT secret_key FROM secret_vault ORDER BY secret_key ASC"
    );
    return rows.map((r) => r.secret_key);
  }

  /**
   * Deletes a secret from the vault.
   */
  public async deleteSecret(key: string): Promise<boolean> {
    const result = await this.driver.execute(
      "DELETE FROM secret_vault WHERE secret_key = $1",
      [key]
    );
    return result.rowsAffected > 0;
  }

  private mapRow(row: VaultRow): SecretVaultRecord {
    return {
      id: row.id,
      secretKey: row.secret_key,
      encryptedValue: row.encrypted_value,
      iv: row.iv,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }
}
