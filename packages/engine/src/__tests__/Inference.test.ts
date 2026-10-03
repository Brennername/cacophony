import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { AdaptiveOutputFormatter } from "../inference/AdaptiveOutputFormatter.js";
import { SelfHealingParser } from "../inference/SelfHealingParser.js";
import { ContextMinimizer } from "../inference/ContextMinimizer.js";
import { SecretVault } from "../inference/SecretVault.js";
import { FrontierTaskDecomposer } from "../inference/FrontierTaskDecomposer.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";
import type { InferenceRequest, InferenceResponse } from "@cacophony/shared-types";
import { PGliteDriver, VaultRepository, TaskRepository, MigrationRunner } from "@cacophony/db";

describe("Model Inference & Adaptation Engine", () => {
  describe("AdaptiveOutputFormatter", () => {
    const formatter = new AdaptiveOutputFormatter();

    test("should generate whole-file rewrite instructions for local models", () => {
      const instruction = formatter.getFormatInstruction(true, "src/index.ts");
      assert.ok(instruction.includes("[OUTPUT FORMAT REQUIREMENT - WHOLE FILE REWRITE]"));
      assert.ok(instruction.includes("src/index.ts"));
      assert.ok(instruction.includes("Do NOT use diffs"));
    });

    test("should tailor format instructions to model archetype, withholding think instructions for direct coders", () => {
      const coderInstruction = formatter.getFormatInstruction(true, "src/index.ts", "qwen2.5-coder:3b");
      assert.ok(coderInstruction.includes("[OUTPUT FORMAT REQUIREMENT - WHOLE FILE REWRITE]"));
      assert.equal(coderInstruction.includes("Once </think> is closed"), false);
      assert.ok(coderInstruction.includes("Do NOT emit <think> or </think> tags"));

      const reasonerInstruction = formatter.getFormatInstruction(true, "src/index.ts", "deepseek-r1:8b");
      assert.ok(reasonerInstruction.includes("Once </think> is closed"));
    });

    test("should generate targeted class/method extension instructions for large existing files", () => {
      const instruction = formatter.getFormatInstruction(
        true,
        "packages/engine/src/daemon/CacophonyHttpServer.ts",
        undefined,
        true
      );
      assert.ok(instruction.includes("[OUTPUT FORMAT REQUIREMENT - TARGETED CLASS / METHOD EXTENSION]"));
      assert.ok(instruction.includes("Do NOT output a full rewrite"));
      assert.ok(instruction.includes("Existing unchanged methods and class members will be automatically merged"));
    });

    test("should cleanly strip orphan </think> tags when extracting code blocks", () => {
      const sampleResponse = `
\`\`\`typescript
export function add(a: number, b: number): number {
  return a + b;
}
\`\`\`
---
</think>
`;
      const blocks = formatter.extractCodeBlocks(sampleResponse);
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0]?.language, "typescript");
      assert.ok(blocks[0]?.code.includes("return a + b;"));
      assert.equal(blocks[0]?.code.includes("</think>"), false);
    });
  });

  describe("SelfHealingParser", () => {
    const parser = new SelfHealingParser();

    test("should validate compliant code block", () => {
      const output = "```ts\nconst x: number = 42;\n```";
      const result = parser.validate(output);
      assert.equal(result.valid, true);
      assert.equal(result.code, "const x: number = 42;");
    });

    test("should reject missing code fence and build correction prompt", () => {
      const output = "Just plain text without code fences.";
      const result = parser.validate(output);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes("Missing required markdown code fence"));

      const correction = parser.buildCorrectionPrompt(result.error!);
      assert.ok(correction.includes("[PARSER ERROR DETECTED - CORRECTION REQUIRED]"));
    });

    test("should reject missing code fence and not misclassify orphan </think> as completed thinking block", () => {
      const output = "# Documentation\nSome text\n---\n</think>";
      const result = parser.validate(output);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes("Missing required markdown code fence"));
      assert.equal(result.error?.includes("Thinking block completed"), false);
    });

    test("should reject lazy placeholder comments", () => {
      const output = "```ts\n// ... existing code ...\nexport const y = 1;\n```";
      const result = parser.validate(output);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes("Forbidden placeholder comment detected"));
    });

    test("should drive self-healing retry loop to success", async () => {
      let callCount = 0;
      const mockProvider: IInferenceProvider = {
        getProviderType: () => "ollama",
        generate: async (_req: InferenceRequest): Promise<InferenceResponse> => {
          callCount++;
          if (callCount === 1) {
            // First call fails validation (no fence)
            return {
              content: "I forgot the code fence, here is the code: export const a = 1;",
              model: "test-model",
              tokensPrompt: 10,
              tokensCompletion: 10,
              totalTokens: 20,
              latencyMs: 100,
              tokensPerSec: 100
            };
          }
          // Second call adheres to format
          return {
            content: "```typescript\nexport const a: number = 1;\n```",
            model: "test-model",
            tokensPrompt: 20,
            tokensCompletion: 10,
            totalTokens: 30,
            latencyMs: 100,
            tokensPerSec: 100
          };
        },
        stream: async () => { throw new Error("Not used"); }
      };

      const result = await parser.executeWithSelfHealing(mockProvider, {
        model: "test-model",
        messages: [{ role: "user", content: "Write a" }]
      });

      assert.equal(result.attempts, 2);
      assert.equal(result.code, "export const a: number = 1;");
    });
  });

  describe("ContextMinimizer", () => {
    test("should bundle targeted focus files and compact tree map", () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-ctx-test-"));
      const pkgDir = path.join(tempDir, "src");
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(path.join(pkgDir, "target.ts"), "export const x = 100;\n");

      const minimizer = new ContextMinimizer(tempDir);
      const bundle = minimizer.assembleContext(
        "Update target value",
        ["src/target.ts"],
        ["Zero Emojis"]
      );

      assert.ok(bundle.assembledPrompt.includes("=== TASK OBJECTIVE ==="));
      assert.ok(bundle.assembledPrompt.includes("export const x = 100;"));
      assert.ok(bundle.assembledPrompt.includes("src/"));
      assert.ok(bundle.assembledPrompt.includes("Zero Emojis"));

      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test("T42.1: should slice secondary AST dependencies, preserving type fidelity and achieving >=40% token reduction", async () => {
      const { AstContextSlicer } = await import("../context/AstContextSlicer.js");
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-slicer-test-"));
      const srcDir = path.join(tempDir, "src");
      fs.mkdirSync(srcDir, { recursive: true });

      // Create a hefty secondary dependency file with heavy implementations
      const heavyDependencyCode = `
export interface UserQueryOptions {
  limit: number;
  offset: number;
  includeInactive?: boolean;
}

export type UserStatus = "active" | "suspended" | "pending";

export class UserRepository {
  private cache: Map<string, any> = new Map();
  private connectionPool: any[] = [];

  constructor(connectionString: string) {
    for (let i = 0; i < 50; i++) {
      this.connectionPool.push({ id: i, active: true, buffer: Buffer.alloc(1024) });
    }
  }

  public async findUserById(id: string): Promise<any> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    // Massive complex database logic simulation
    const query = "SELECT * FROM users WHERE id = '" + id + "' AND deleted_at IS NULL";
    const res = await Promise.resolve({ id, name: "Alice", status: "active" });
    this.cache.set(id, res);
    return res;
  }

  public async listUsers(options: UserQueryOptions): Promise<any[]> {
    const results: any[] = [];
    for (let i = 0; i < options.limit; i++) {
      results.push({ id: "user-" + (options.offset + i), status: "active" });
    }
    return results;
  }

  public purgeCache(): void {
    this.cache.clear();
  }
}

export class UnrelatedClassWithHeavyLogic {
  public computeComplexMetrics(): number {
    let acc = 0;
    for (let i = 0; i < 1000; i++) {
      acc += Math.sqrt(i) * Math.sin(i);
    }
    return acc;
  }
}
`;
      fs.writeFileSync(path.join(srcDir, "user-repository.ts"), heavyDependencyCode);

      // Create focus file that only imports UserRepository and UserQueryOptions
      const focusCode = `
import { UserRepository, UserQueryOptions } from "./user-repository.js";

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  public async getUser(id: string) {
    return this.repo.findUserById(id);
  }
}
`;
      fs.writeFileSync(path.join(srcDir, "user-service.ts"), focusCode);

      const slicer = new AstContextSlicer(tempDir);
      const imports = slicer.extractImportedSymbols(focusCode, "src/user-service.ts");
      assert.equal(imports.length, 2);
      assert.ok(imports.some((i: any) => i.importedName === "UserRepository"));
      assert.ok(imports.some((i: any) => i.importedName === "UserQueryOptions"));

      // 1. Direct AST Type Skeleton Verification
      const sliced = slicer.generateTypeSkeleton(
        heavyDependencyCode,
        ["UserRepository", "UserQueryOptions"],
        "src/user-repository.ts"
      );
      assert.ok(sliced.skeletonContent.includes("export interface UserQueryOptions"));
      assert.ok(sliced.skeletonContent.includes("class UserRepository"));
      assert.ok(sliced.skeletonContent.includes("findUserById(id: string): Promise<any>;"));
      assert.ok(sliced.skeletonContent.includes("listUsers(options: UserQueryOptions): Promise<any[]>;"));
      // Ensure private fields and method bodies are pruned
      assert.equal(sliced.skeletonContent.includes("Massive complex database logic"), false);
      assert.equal(sliced.skeletonContent.includes("UnrelatedClassWithHeavyLogic"), false);
      assert.ok(sliced.reductionRatio >= 0.40, `Expected reduction >= 0.40, got ${sliced.reductionRatio}`);

      // 2. Integration with ContextMinimizer
      const minimizer = new ContextMinimizer(tempDir);
      const bundle = minimizer.assembleContext(
        "Implement cached user retrieval",
        ["src/user-service.ts"],
        ["Zero Emojis"],
        true
      );

      assert.ok(bundle.assembledPrompt.includes("=== SLICED DEPENDENCY SKELETONS ==="));
      assert.ok(bundle.assembledPrompt.includes("--- Skeleton: src/user-repository.ts ---"));
      assert.ok(bundle.tokenSavingsEstimate);
      assert.ok(bundle.tokenSavingsEstimate.savingsPercent >= 40);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe("SecretVault AES-256-GCM Encryption", () => {
    let driver: PGliteDriver;
    let vault: SecretVault;

    before(async () => {
      driver = new PGliteDriver();
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();

      const vaultRepo = new VaultRepository(driver);
      vault = new SecretVault(vaultRepo);
    });

    after(async () => {
      await driver.close();
    });

    test("should encrypt, store, and decrypt secrets", async () => {
      const secret = "sk-proj-super-secret-key-123456789";
      await vault.setKey("TEST_API_KEY", secret);

      const decrypted = await vault.getKey("TEST_API_KEY");
      assert.equal(decrypted, secret);
    });
  });

  describe("FrontierTaskDecomposer", () => {
    let driver: PGliteDriver;
    let taskRepo: TaskRepository;

    before(async () => {
      driver = new PGliteDriver();
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();
      taskRepo = new TaskRepository(driver);
    });

    after(async () => {
      await driver.close();
    });

    test("should parse decomposed tasks and persist to database", async () => {
      const mockProvider: IInferenceProvider = {
        getProviderType: () => "openai",
        generate: async () => ({
          content: `
\`\`\`json
[
  {
    "title": "Create User Entity",
    "prompt": "Write UserEntity class in src/entities/User.ts",
    "role": "implementer",
    "priority": "P1",
    "focusFiles": "src/entities/User.ts",
    "testCommand": "npm test"
  },
  {
    "title": "Review User Entity",
    "prompt": "Evaluate code against SOLID principles",
    "role": "reviewer",
    "priority": "P2",
    "focusFiles": "src/entities/User.ts",
    "testCommand": "npm test"
  }
]
\`\`\`
`,
          model: "gpt-4o",
          tokensPrompt: 50,
          tokensCompletion: 80,
          totalTokens: 130,
          latencyMs: 500,
          tokensPerSec: 160
        }),
        stream: async () => { throw new Error("Not used"); }
      };

      const decomposer = new FrontierTaskDecomposer(mockProvider, taskRepo);
      const tasks = await decomposer.decomposeAndPersist("Add User Management", "gpt-4o");

      assert.equal(tasks.length, 2);
      assert.equal(tasks[0]?.title, "Create User Entity");
      assert.equal(tasks[0]?.role, "implementer");
      assert.equal(tasks[1]?.title, "Review User Entity");
      assert.equal(tasks[1]?.role, "reviewer");

      const inDb = await taskRepo.getById(tasks[0]!.id);
      assert.ok(inDb);
      assert.equal(inDb.status, "PENDING");
    });
  });

  describe("Phase 43: Frontier Fallback Router, Circuit Breaker & Quota Tracking (T43.1)", () => {
    test("T43.1.1 & T43.1.2: CircuitBreaker should trip on 429/5xx and route to fallback provider", async () => {
      const { FrontierFallbackRouter } = await import("../inference/FrontierFallbackRouter.js");
      const { ProviderCircuitBreaker } = await import("../inference/CircuitBreaker.js");

      // 1. Unit test ProviderCircuitBreaker transitions
      const breaker = new ProviderCircuitBreaker({ failureThreshold: 2, cooldownMs: 50 });
      assert.equal(breaker.getState(), "CLOSED");
      assert.equal(breaker.canExecute(), true);

      breaker.recordFailure(true);
      assert.equal(breaker.getState(), "CLOSED");

      breaker.recordFailure(true);
      assert.equal(breaker.getState(), "OPEN");
      assert.equal(breaker.canExecute(), false);

      // Wait for cooldown
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(breaker.getState(), "HALF_OPEN");
      assert.equal(breaker.canExecute(), true);

      breaker.recordSuccess();
      assert.equal(breaker.getState(), "CLOSED");

      // 2. Multi-provider Fallback Router
      let primaryAttempts = 0;
      const failingPrimary: IInferenceProvider = {
        getProviderType: () => "openai",
        generate: async () => {
          primaryAttempts++;
          throw new Error("429 Too Many Requests: Rate limit exceeded");
        },
        stream: async () => { throw new Error("429 Too Many Requests"); }
      };

      let fallbackAttempts = 0;
      const workingSecondary: IInferenceProvider = {
        getProviderType: () => "ollama",
        generate: async (req) => {
          fallbackAttempts++;
          return {
            content: "Fallback response generated successfully",
            model: req.model,
            tokensPrompt: 40,
            tokensCompletion: 25,
            totalTokens: 65,
            latencyMs: 150,
            tokensPerSec: 166.7
          };
        },
        stream: async () => { throw new Error("Not implemented"); }
      };

      const router = new FrontierFallbackRouter("deepseek-r1:8b");
      router.registerProvider({ providerType: "openai", provider: failingPrimary, priority: 1 });
      router.registerProvider({ providerType: "ollama", provider: workingSecondary, priority: 2 });

      // Run multiple generation calls to trip the primary circuit
      const res1 = await router.generate({
        model: "deepseek-r1:8b",
        messages: [{ role: "user", content: "Solve problem" }]
      });
      assert.equal(res1.content, "Fallback response generated successfully");
      assert.equal(primaryAttempts, 1);
      assert.equal(fallbackAttempts, 1);

      await router.generate({
        model: "deepseek-r1:8b",
        messages: [{ role: "user", content: "Solve problem again" }]
      });

      await router.generate({
        model: "deepseek-r1:8b",
        messages: [{ role: "user", content: "Solve problem 3rd time" }]
      });

      // Primary breaker should be OPEN
      const primaryBreaker = router.getCircuitBreaker("openai");
      assert.equal(primaryBreaker?.getState(), "OPEN");

      // 3. TokenQuotaTracker accounting verification
      const tracker = router.getQuotaTracker();
      const ollamaUsage = tracker.getUsage("ollama");
      assert.equal(ollamaUsage.requestCount, 3);
      assert.equal(ollamaUsage.totalTokens, 195);

      const allUsage = tracker.getAllUsage();
      assert.ok(allUsage.ollama);

      // Verify circuit status snapshot
      const statuses = router.getAllCircuitStatus();
      assert.ok(statuses.openai);
      assert.equal(statuses.openai.state, "OPEN");
      assert.ok(statuses.ollama);
      assert.equal(statuses.ollama.state, "CLOSED");
    });
  });
});
