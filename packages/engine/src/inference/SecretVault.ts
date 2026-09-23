import * as crypto from "node:crypto";
import type { VaultRepository } from "@cacophony/db";

/**
 * SecretVault
 *
 * Encrypts and decrypts sensitive frontier API keys using AES-256-GCM.
 * Secrets are persisted in encrypted form in the database and never logged.
 */
export class SecretVault {
  private readonly repository: VaultRepository;
  private readonly masterKeyBuffer: Buffer;

  constructor(repository: VaultRepository, masterKeyHex?: string) {
    this.repository = repository;
    const keyHex = masterKeyHex || process.env["VAULT_MASTER_KEY"] || "";
    if (keyHex.length === 64) {
      this.masterKeyBuffer = Buffer.from(keyHex, "hex");
    } else {
      // Fallback deterministic derivation if 64-hex string is not provided
      this.masterKeyBuffer = crypto.createHash("sha256").update(keyHex || "cacophony_local_default_key").digest();
    }
  }

  /**
   * Encrypts and persists an API key in the vault.
   */
  public async setKey(keyName: string, plainValue: string): Promise<void> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.masterKeyBuffer, iv);

    let encrypted = cipher.update(plainValue, "utf-8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    const fullCipherPayload = `${encrypted}:${authTag}`;
    await this.repository.setSecret(keyName, fullCipherPayload, iv.toString("hex"));
  }

  /**
   * Retrieves and decrypts an API key. Falls back to environment variables if not present in DB.
   */
  public async getKey(keyName: string): Promise<string | null> {
    const record = await this.repository.getSecret(keyName);
    if (record) {
      try {
        const [encryptedHex, authTagHex] = record.encryptedValue.split(":");
        if (!encryptedHex || !authTagHex) return null;

        const iv = Buffer.from(record.iv, "hex");
        const decipher = crypto.createDecipheriv("aes-256-gcm", this.masterKeyBuffer, iv);
        decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

        let decrypted = decipher.update(encryptedHex, "hex", "utf-8");
        decrypted += decipher.final("utf-8");
        return decrypted;
      } catch {
        return null;
      }
    }

    // Fallback to process.env
    return process.env[keyName] || null;
  }
}
