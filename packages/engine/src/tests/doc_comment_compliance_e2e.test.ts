import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { SQLiteDriver, MigrationRunner, DocCommentCandidateRepository } from "@cacophony/db";
import { FunctionAstLocator } from "../ast/FunctionAstLocator.js";
import { DocCommentInjector } from "../ast/DocCommentInjector.js";
import { ComplianceReviewStage } from "../scheduler/ComplianceReviewStage.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";

describe("T-S13.7: End-to-End Function Doc-Comment & Advisory Compliance Suite", () => {
  let driver: SQLiteDriver;
  let candidateRepo: DocCommentCandidateRepository;
  let tempDir: string;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-s13-e2e-"));
    driver = new SQLiteDriver(":memory:");
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    candidateRepo = new DocCommentCandidateRepository(driver);
  });

  after(async () => {
    await driver.close();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("should never mutate function implementation lines during comment generation and injection", async () => {
    const testFilePath = path.join(tempDir, "PaymentProcessor.ts");
    const originalBody = [
      "export class PaymentProcessor {",
      "  public processCharge(amountCents: number, currency = 'USD'): boolean {",
      "    if (amountCents <= 0) {",
      "      throw new Error('Invalid charge amount');",
      "    }",
      "    return true;",
      "  }",
      "}",
    ].join("\n");

    await fs.writeFile(testFilePath, originalBody, "utf-8");

    const locator = new FunctionAstLocator();
    const boundary = locator.findFunctionByName(originalBody, "processCharge", testFilePath);
    assert.ok(boundary);
    assert.equal(boundary.name, "processCharge");
    assert.equal(boundary.parameters.length, 2);

    const generatedDoc = [
      "/**",
      " * Validates and authorizes customer payment transaction.",
      " * @param amountCents Transaction amount in minor units",
      " * @param currency ISO-4217 currency code",
      " */",
    ].join("\n");

    const injector = new DocCommentInjector(locator);
    const result = injector.injectDocComment(originalBody, "processCharge", generatedDoc, testFilePath);
    assert.equal(result.success, true);
    assert.ok(result.injectedAtLine > 0);

    // Verify all original lines inside the function remain byte-for-byte intact
    assert.ok(result.modifiedContent.includes("if (amountCents <= 0) {"));
    assert.ok(result.modifiedContent.includes("throw new Error('Invalid charge amount');"));
    assert.ok(result.modifiedContent.includes("return true;"));

    // Write injected code to disk and re-verify AST boundary
    await fs.writeFile(testFilePath, result.modifiedContent, "utf-8");
    const reParsedContent = await fs.readFile(testFilePath, "utf-8");
    const reBoundary = locator.findFunctionByName(reParsedContent, "processCharge", testFilePath);
    assert.ok(reBoundary);
    assert.ok(reBoundary.existingComment?.includes("Validates and authorizes customer payment transaction."));
  });

  it("should handle reroll guidance, persist candidate variants, and track state transitions", async () => {
    const filePath = "packages/engine/src/auth/token.ts";
    const functionIdentifier = "verifySignature";

    // Candidate 1: initial generation
    const c1 = await candidateRepo.createCandidate({
      filePath,
      functionIdentifier,
      candidateText: "/** Verifies cryptographic token signature. */",
      modelId: "qwen2.5-coder:7b",
      createdAt: new Date(Date.now() - 5000).toISOString(),
    });

    // Candidate 2: reroll with operator guidance
    const c2 = await candidateRepo.createCandidate({
      filePath,
      functionIdentifier,
      candidateText: "/** Validates HMAC signature against public key, preventing algorithm confusion. */",
      userGuidance: "explain algorithm confusion prevention and decoupling",
      modelId: "qwen2.5-coder:7b",
      createdAt: new Date().toISOString(),
    });

    // Check candidate query
    const list = await candidateRepo.getCandidatesForFunction(filePath, functionIdentifier);
    assert.equal(list.length, 2);
    assert.equal(list[0]?.id, c2.id); // Descending order
    assert.equal(list[1]?.id, c1.id);

    // Accept candidate 2
    const accepted = await candidateRepo.acceptCandidate(c2.id);
    assert.ok(accepted);
    assert.equal(accepted.status, "ACCEPTED");

    // Candidate 1 should now be DISCARDED
    const updatedC1 = await candidateRepo.getCandidateById(c1.id);
    assert.ok(updatedC1);
    assert.equal(updatedC1.status, "DISCARDED");
    assert.ok(updatedC1.discardedAt);
  });

  it("should enforce compliance audit and auto-merge cooldown gating when advisory suggestions arise", async () => {
    const mockReviewer: IInferenceProvider = {
      modelId: "qwen2.5-coder:7b-instruct-q4_K_M",
      generate: async () => ({
        content: JSON.stringify({
          verdict: "ADVISORY_QUESTION",
          notes: "Implementation satisfies constraints, but suggested adding an optional timeout configuration.",
          items: [
            {
              title: "Decouple AST parsing",
              satisfied: true,
              severity: "info",
            },
            {
              title: "Timeout parameter",
              satisfied: false,
              feedback: "Non-blocking consideration for next milestone",
              severity: "info",
            },
          ],
        }),
        tokensPrompt: 120,
        tokensCompletion: 60,
        totalTokens: 180,
        latencyMs: 90,
        tokensPerSec: 50,
      }),
    } as any;

    const complianceStage = new ComplianceReviewStage(mockReviewer, {
      cooldownWindowMs: 200, // Short cooldown for test speed
    });

    const auditResult = await complianceStage.auditCompliance({
      taskId: "task-s13-e2e",
      targetBranch: "main",
      diff: "diff --git a/service.ts b/service.ts\n+ // new logic",
      guidanceList: [
        {
          id: "guidance-e2e-1",
          taskId: "task-s13-e2e",
          author: "Operator",
          commentText: "Decouple AST parsing and injector logic.",
          advisoryType: "CONSTRAINT",
          requiresComplianceAudit: true,
          createdAt: new Date().toISOString(),
        },
      ],
      reviewerModel: "qwen2.5-coder:7b",
    });

    assert.equal(auditResult.verdict, "ADVISORY_QUESTION");
    assert.equal(auditResult.isPausedForAdvisory, true);

    const pausedAt = new Date().toISOString();

    // 1. Immediate tick: should be paused
    const immediateDecision = complianceStage.evaluateMergeReadiness({
      complianceResult: auditResult,
      prTestsPassed: true,
      pausedAt,
    });
    assert.equal(immediateDecision.canMerge, false);
    assert.equal(immediateDecision.isPaused, true);

    // 2. Wait for cooldown to expire
    await new Promise((r) => setTimeout(r, 250));

    // 3. Subsequent tick with no operator intervention: should auto-merge!
    const elapsedDecision = complianceStage.evaluateMergeReadiness({
      complianceResult: auditResult,
      prTestsPassed: true,
      pausedAt,
    });
    assert.equal(elapsedDecision.canMerge, true);
    assert.equal(elapsedDecision.autoMergedAfterCooldown, true);
  });
});
