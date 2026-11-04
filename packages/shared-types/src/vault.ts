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

/**
 * Supported Frontier and Cloud API Providers requiring API keys.
 */
export type FrontierProviderType =
  | "anthropic"
  | "openai"
  | "deepseek"
  | "gemini"
  | "groq"
  | "mistral"
  | "custom";

/**
 * Encrypted credential record stored in vault.
 */
export interface VaultCredentialRecord {
  readonly id: string;
  readonly provider: FrontierProviderType;
  readonly encryptedKey: string;
  readonly iv: string;
  readonly authTag?: string;
  readonly keyFingerprint: string;
  readonly maskedPreview: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isValid?: boolean;
}

/**
 * Client-safe credential descriptor (never exposes raw keys).
 */
export interface VaultKeyDescriptor {
  readonly provider: FrontierProviderType;
  readonly maskedPreview: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isValid: boolean;
}

/**
 * Usage telemetry item for frontier model invocations.
 */
export interface FrontierUsageRecord {
  readonly id: string;
  readonly provider: FrontierProviderType;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly estimatedCostUsd: number;
  readonly timestamp: string;
}

/**
 * Rolling usage summary across 5-hour and 7-day windows.
 */
export interface VaultUsageSummary {
  readonly provider: FrontierProviderType;
  readonly fiveHourTokens: number;
  readonly fiveHourRequests: number;
  readonly fiveHourCostUsd: number;
  readonly sevenDayTokens: number;
  readonly sevenDayRequests: number;
  readonly sevenDayCostUsd: number;
  readonly weeklyCostLimitUsd: number;
  readonly fiveHourTokenLimit: number;
  readonly fiveHourUsagePercent: number;
  readonly weeklyUsagePercent: number;
}

/**
 * Budget limits configuration for frontier providers.
 */
export interface VaultLimitsConfig {
  readonly weeklyBudgetCeilingUsd: number;
  readonly fiveHourTokenLimit: number;
}

