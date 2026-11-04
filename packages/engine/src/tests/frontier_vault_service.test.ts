import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { FrontierVaultService } from "../vault/FrontierVaultService.js";
import { FrontierUsageTracker } from "../vault/FrontierUsageTracker.js";
import { VerifiableModelCatalog } from "../hardware/VerifiableModelCatalog.js";

describe("FrontierVaultService & UsageTracker Suite", () => {
  let tempDir: string;
  let vaultService: FrontierVaultService;
  let usageTracker: FrontierUsageTracker;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-vault-test-"));
    vaultService = new FrontierVaultService(tempDir);
    usageTracker = new FrontierUsageTracker(tempDir);
  });

  it("should encrypt and save API keys, returning masked preview and metadata", async () => {
    const descriptor = await vaultService.saveKey(
      "anthropic",
      "sk-ant-api03-abcdef1234567890abcdef1234567890"
    );

    assert.strictEqual(descriptor.provider, "anthropic");
    assert.match(descriptor.maskedPreview, /\*\*\*/);
    assert.strictEqual(descriptor.isValid, true);
    assert.strictEqual(vaultService.hasKey("anthropic"), true);
  });

  it("should decrypt and recover original key in memory, but never expose it in listKeys", async () => {
    const rawKey = "sk-ant-api03-abcdef1234567890abcdef1234567890";
    await vaultService.saveKey("anthropic", rawKey);

    const recovered = await vaultService.getKey("anthropic");
    assert.strictEqual(recovered, rawKey);

    const list = await vaultService.listKeys();
    assert.strictEqual(list.length, 1);
    assert.ok(list[0]);
    assert.strictEqual(list[0].provider, "anthropic");
    // Ensure raw key is not in descriptor
    assert.strictEqual((list[0] as any).encryptedKey, undefined);
    assert.strictEqual((list[0] as any).rawKey, undefined);
  });

  it("should safely delete key when requested", async () => {
    await vaultService.saveKey("openai", "sk-proj-1234567890abcdef1234567890");
    assert.strictEqual(vaultService.hasKey("openai"), true);

    const deleted = await vaultService.deleteKey("openai");
    assert.strictEqual(deleted, true);
    assert.strictEqual(vaultService.hasKey("openai"), false);
    assert.strictEqual(await vaultService.getKey("openai"), null);
  });

  it("should track 5-hour and 7-day rolling usage metrics", () => {
    usageTracker.recordUsage({
      provider: "anthropic",
      model: "claude-3-5-sonnet",
      promptTokens: 1000,
      completionTokens: 500,
      estimatedCostUsd: 0.005
    });

    const summaries = usageTracker.getSummaries();
    const anthropicSummary = summaries.find((s) => s.provider === "anthropic");
    assert.ok(anthropicSummary);
    assert.strictEqual(anthropicSummary.fiveHourTokens, 1500);
    assert.strictEqual(anthropicSummary.fiveHourRequests, 1);
    assert.strictEqual(anthropicSummary.fiveHourCostUsd, 0.005);
    assert.strictEqual(anthropicSummary.sevenDayCostUsd, 0.005);
  });

  it("should enforce rate constraint when limits are reached", () => {
    usageTracker.setLimits({
      weeklyBudgetCeilingUsd: 0.01,
      fiveHourTokenLimit: 1000
    });

    usageTracker.recordUsage({
      provider: "openai",
      model: "gpt-4o",
      promptTokens: 800,
      completionTokens: 300,
      estimatedCostUsd: 0.02
    });

    const status = usageTracker.isRateConstrained("openai");
    assert.strictEqual(status.constrained, true);
    assert.match(status.reason || "", /budget/i);
  });

  it("should return verifiable model catalog entries with local and cloud classification", () => {
    const all = VerifiableModelCatalog.getAll();
    assert.ok(all.length >= 8);

    const local = VerifiableModelCatalog.getLocalModels();
    assert.ok(local.some((m) => m.tag === "phi4:latest"));
    assert.ok(local.every((m) => !m.isCloudApi));

    const frontier = VerifiableModelCatalog.getFrontierModels();
    assert.ok(frontier.some((m) => m.tag === "claude-3-5-sonnet-20241022"));
    assert.ok(frontier.every((m) => m.isFrontier));
  });
});
