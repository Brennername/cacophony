/**
 * Encrypted secret entry stored in database.
 */
export interface SecretVaultRecord {
  readonly id: string;
  readonly secretKey: string;
  readonly encryptedValue: string;
  readonly iv: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Plaintext representation used exclusively in memory.
 */
export interface VaultSecret {
  readonly key: string;
  readonly value: string;
}
