import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ModelTenancyGuard } from "../scheduler/ModelTenancyGuard.js";
import type { ModelManagementConfig } from "@cacophony/shared-types";

describe("ModelTenancyGuard Suite", () => {
  const baseConfig: ModelManagementConfig = {
    managedModelsEnabled: true,
    protectedModels: ["deepseek-r1:8b-4k", "qwen2.5-coder:7b-instruct-q4_K_M", "custom-internal-*"],
    maxDiskStorageGb: 50,
    autoEvictionEnabled: true,
    minimumSuccessRateThreshold: 0.4,
    maxConsecutiveFailuresBeforeEviction: 3
  };

  test("should correctly recognize protected models by exact tag and wildcard pattern", () => {
    const guard = new ModelTenancyGuard(baseConfig);

    assert.equal(guard.isProtected("deepseek-r1:8b-4k"), true);
    assert.equal(guard.isProtected("qwen2.5-coder:7b-instruct-q4_K_M"), true);
    assert.equal(guard.isProtected("custom-internal-v1"), true);
    assert.equal(guard.isProtected("custom-internal-fast"), true);

    assert.equal(guard.isProtected("qwen2.5-coder:3b"), false);
    assert.equal(guard.isProtected("gemma3:4b-it-qat"), false);
    assert.equal(guard.isProtected("other-model"), false);
  });

  test("should disallow eviction for protected models with explicit justification", () => {
    const guard = new ModelTenancyGuard(baseConfig);

    const protectedOutcome = guard.canEvict("deepseek-r1:8b-4k");
    assert.equal(protectedOutcome.allowed, false);
    assert.match(protectedOutcome.reason || "", /protected under user tenancy whitelist/);

    const unprotectedOutcome = guard.canEvict("qwen2.5-coder:3b");
    assert.equal(unprotectedOutcome.allowed, true);
  });

  test("should disallow eviction when managedModelsEnabled or autoEvictionEnabled is false", () => {
    const disabledGuard = new ModelTenancyGuard({
      ...baseConfig,
      managedModelsEnabled: false
    });
    assert.equal(disabledGuard.canEvict("qwen2.5-coder:3b").allowed, false);

    const noAutoEvictGuard = new ModelTenancyGuard({
      ...baseConfig,
      managedModelsEnabled: true,
      autoEvictionEnabled: false
    });
    assert.equal(noAutoEvictGuard.canEvict("qwen2.5-coder:3b").allowed, false);
  });

  test("should update configuration dynamically and reflect changes", () => {
    const guard = new ModelTenancyGuard(baseConfig);
    assert.equal(guard.isProtected("phi4-mini"), false);

    guard.updateConfig({
      protectedModels: [...baseConfig.protectedModels, "phi4-mini"]
    });

    assert.equal(guard.isProtected("phi4-mini"), true);
  });

  test("should evaluate disk headroom successfully", async () => {
    const guard = new ModelTenancyGuard(baseConfig);
    const result = await guard.checkDiskHeadroom(process.cwd(), 1024 * 1024);
    assert.ok(result.availableBytes > 0);
  });
});
