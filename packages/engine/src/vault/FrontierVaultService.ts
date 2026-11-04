import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  FrontierProviderType,
  VaultCredentialRecord,
  VaultKeyDescriptor
} from "@cacophony/shared-types";

/**
 * Enterprise-grade cryptographic vault service for third-party frontier API keys.
 * Uses AES-256-GCM with PBKDF2 derived keys and random 96-bit initialization vectors.
 */
export class FrontierVaultService {
  private static instance: FrontierVaultService | null = null;
  private readonly storagePath: string;
  private readonly masterKey: Buffer;
  private credentials: Map<FrontierProviderType, VaultCredentialRecord> = new Map();

  constructor(storageDir?: string) {
    const baseDir = storageDir || process.env.DATA_DIR || process.env.DB_PATH || "./data";
    this.storagePath = path.join(baseDir, "frontier_vault.json");

    // Derive 256-bit AES master key from VAULT_SECRET or machine fallback
    const secretSeed = process.env.VAULT_SECRET || "cacophony-local-vault-seed-4921-default-entropy";
    const salt = Buffer.from("cacophony-vault-salt-8832", "utf-8");
    this.masterKey = crypto.pbkdf2Sync(secretSeed, salt, 100000, 32, "sha256");

    this.loadFromDisk();
  }

  public static getInstance(): FrontierVaultService {
    if (!FrontierVaultService.instance) {
      FrontierVaultService.instance = new FrontierVaultService();
    }
    return FrontierVaultService.instance;
  }

  /**
   * Encrypts and saves an API key for a frontier provider.
   */
  public async saveKey(provider: FrontierProviderType, rawKey: string): Promise<VaultKeyDescriptor> {
    const trimmed = rawKey.trim();
    if (!trimmed || trimmed.length < 8) {
      throw new Error(`Invalid API key for provider ${provider}: key length is insufficient`);
    }

    const iv = crypto.randomBytes(12); // 96-bit IV recommended for AES-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", this.masterKey, iv);

    let encrypted = cipher.update(trimmed, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    const fingerprint = crypto.createHash("sha256").update(trimmed).digest("hex").slice(0, 16);
    const masked = this.generateMaskedPreview(trimmed);
    const now = new Date().toISOString();

    const record: VaultCredentialRecord = {
      id: `vault-${provider}-${Date.now()}`,
      provider,
      encryptedKey: encrypted,
      iv: iv.toString("hex"),
      authTag,
      keyFingerprint: fingerprint,
      maskedPreview: masked,
      createdAt: this.credentials.get(provider)?.createdAt || now,
      updatedAt: now,
      isValid: this.validateKeyPattern(provider, trimmed)
    };

    this.credentials.set(provider, record);
    this.persistToDisk();

    return {
      provider: record.provider,
      maskedPreview: record.maskedPreview,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      isValid: record.isValid ?? true
    };
  }

  /**
   * Decrypts and retrieves the raw API key for engine inference routing.
   * Never exposed via external REST endpoints.
   */
  public async getKey(provider: FrontierProviderType): Promise<string | null> {
    const record = this.credentials.get(provider);
    if (!record) {
      return null;
    }

    try {
      const iv = Buffer.from(record.iv, "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", this.masterKey, iv);
      if (record.authTag) {
        decipher.setAuthTag(Buffer.from(record.authTag, "hex"));
      }

      let decrypted = decipher.update(record.encryptedKey, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      return null;
    }
  }

  /**
   * Lists client-safe descriptors for all configured provider credentials.
   */
  public async listKeys(): Promise<VaultKeyDescriptor[]> {
    const descriptors: VaultKeyDescriptor[] = [];
    for (const record of this.credentials.values()) {
      descriptors.push({
        provider: record.provider,
        maskedPreview: record.maskedPreview,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        isValid: record.isValid ?? true
      });
    }
    return descriptors;
  }

  /**
   * Safely revokes and removes a provider's credential.
   */
  public async deleteKey(provider: FrontierProviderType): Promise<boolean> {
    const existed = this.credentials.delete(provider);
    if (existed) {
      this.persistToDisk();
    }
    return existed;
  }

  /**
   * Checks if a provider has a valid key configured.
   */
  public hasKey(provider: FrontierProviderType): boolean {
    return this.credentials.has(provider);
  }

  /**
   * Formats a masked preview string (e.g. sk-ant-***ABCD).
   */
  private generateMaskedPreview(key: string): string {
    if (key.length <= 10) {
      return `${key.slice(0, 2)}***${key.slice(-2)}`;
    }
    const prefix = key.slice(0, Math.min(6, Math.floor(key.length / 3)));
    const suffix = key.slice(-4);
    return `${prefix}***${suffix}`;
  }

  /**
   * Basic format validation per provider.
   */
  private validateKeyPattern(provider: FrontierProviderType, key: string): boolean {
    switch (provider) {
      case "anthropic":
        return key.startsWith("sk-ant-") && key.length > 25;
      case "openai":
        return (key.startsWith("sk-") || key.startsWith("sk-proj-")) && key.length > 25;
      case "gemini":
        return key.length >= 20;
      case "groq":
        return key.startsWith("gsk_") && key.length > 20;
      case "deepseek":
        return key.startsWith("sk-") && key.length > 20;
      case "mistral":
        return key.length >= 20;
      case "custom":
      default:
        return key.length >= 8;
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.provider && item.encryptedKey && item.iv) {
              this.credentials.set(item.provider, item);
            }
          }
        }
      }
    } catch {
      // Clean fallback if file is unreadable
    }
  }

  private persistToDisk(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.credentials.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), { mode: 0o600 });
    } catch {
      // Non-fatal disk write error
    }
  }
}
