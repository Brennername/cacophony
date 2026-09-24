import test from "node:test";
import assert from "node:assert/strict";
import {
  GiteaPermissionGuard,
  GiteaApiClient,
  GiteaWebhookReceiver,
  GiteaIssueIngestionWorker,
  GiteaPackageClient
} from "../gitea/index.js";
import type { TaskRepository } from "@cacophony/db";

test("Phase 29: Gitea Deep API Integration, Permission Guardrails & Automated PR Engine", async (t) => {
  await t.test("T29.1: GiteaPermissionGuard Role-Gated Scope Enforcement", () => {
    // 1. Public Inspector: allowed repository:read, denied repository:write
    const inspectorGuard = new GiteaPermissionGuard("public_inspector");
    assert.doesNotThrow(() => inspectorGuard.assertScope("repository", "read"));
    assert.throws(
      () => inspectorGuard.assertScope("repository", "write"),
      /Gitea Security Violation: Role 'public_inspector' has 'read' access to scope 'repository'. Required: 'write'./
    );
    assert.throws(
      () => inspectorGuard.assertScope("package", "read"),
      /Gitea Security Violation: Role 'public_inspector' has 'none' access to scope 'package'./
    );

    // 2. Autonomous Implementer: allowed repository:write, issue:write, denied admin
    const implementerGuard = new GiteaPermissionGuard("autonomous_implementer");
    assert.doesNotThrow(() => implementerGuard.assertScope("repository", "write"));
    assert.doesNotThrow(() => implementerGuard.assertScope("issue", "write"));
    assert.throws(
      () => implementerGuard.assertScope("admin", "read"),
      /Gitea Security Violation: Role 'autonomous_implementer' has 'none' access to scope 'admin'./
    );

    // 3. Protected Branch Guardrails
    assert.doesNotThrow(() => implementerGuard.assertBranchModificationPermitted("feat/issue-42-auth"));
    assert.doesNotThrow(() => implementerGuard.assertBranchModificationPermitted("fix/timeout-buffer"));
    assert.throws(
      () => implementerGuard.assertBranchModificationPermitted("master"),
      /cannot directly push or commit to protected branch 'master'/
    );
    assert.throws(
      () => implementerGuard.assertBranchModificationPermitted("main"),
      /cannot directly push or commit to protected branch 'main'/
    );
    assert.throws(
      () => implementerGuard.assertBranchModificationPermitted("release/1.0.0"),
      /cannot directly push or commit to protected branch 'release\/1.0.0'/
    );
  });

  await t.test("T29.2: GiteaApiClient Guard Integration & Protected Branch Blocking", async () => {
    const inspectorGuard = new GiteaPermissionGuard("public_inspector");
    const client = new GiteaApiClient({
      baseUrl: "http://127.0.0.1:19634",
      apiToken: "fake_token",
      guard: inspectorGuard
    });

    // Inspector trying to create a branch should be rejected by guard before network call
    await assert.rejects(
      async () => {
        await client.createBranch("cacophony", "core", {
          new_branch_name: "feat/unauthorized"
        });
      },
      /Gitea Security Violation: Role 'public_inspector' has 'read' access to scope 'repository'/
    );

    // Implementer trying to target master should be rejected by protected branch guard
    const implementerGuard = new GiteaPermissionGuard("autonomous_implementer");
    const implementerClient = new GiteaApiClient({
      baseUrl: "http://127.0.0.1:19634",
      apiToken: "fake_token",
      guard: implementerGuard
    });

    await assert.rejects(
      async () => {
        await implementerClient.createBranch("cacophony", "core", {
          new_branch_name: "master"
        });
      },
      /cannot directly push or commit to protected branch 'master'/
    );
  });

  await t.test("T29.3: GiteaWebhookReceiver Expanded Events & Command Parsing", async () => {
    const createdTasks: any[] = [];
    const mockTaskRepo = {
      create: async (task: any) => {
        createdTasks.push(task);
        return task;
      }
    } as unknown as TaskRepository;

    const secret = "test_webhook_secret_key_123";
    const receiver = new GiteaWebhookReceiver(mockTaskRepo, secret);

    // 1. Signature Verification
    const payload = JSON.stringify({ action: "opened" });
    const crypto = await import("node:crypto");
    const validSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    assert.strictEqual(receiver.verifySignature(payload, validSignature), true);
    assert.strictEqual(receiver.verifySignature(payload, "invalid_sig"), false);

    // 2. Issue comment command event
    const commentPayload = {
      action: "created",
      repository: {
        name: "cacophony",
        full_name: "cacophony/core",
        clone_url: "http://gitea/repo.git",
        default_branch: "main"
      },
      issue: {
        number: 45,
        title: "Fix Vega APU VRAM reset",
        body: "Detailed error in sysfs."
      },
      comment: {
        id: 101,
        body: "/cacophony run --profile vega"
      }
    };

    const res = await receiver.handleWebhook("issue_comment", commentPayload);
    assert.strictEqual(res.processed, true);
    assert.strictEqual(res.actionTriggered, "command_task_enqueued");
    assert.strictEqual(createdTasks.length, 1);
    assert.strictEqual(createdTasks[0].priority, "P0");
    assert.ok(createdTasks[0].prompt.includes("/cacophony run --profile vega"));
  });

  await t.test("T29.4: GiteaIssueIngestionWorker Automated Ingestion & Comment Feedback", async () => {
    const postedComments: any[] = [];
    const createdTasks: any[] = [];

    const mockClient = {
      listIssues: async () => [
        {
          id: 1,
          number: 12,
          title: "Optimize tokenizer memory",
          body: "Buffer leak detected in tokenizer stream",
          state: "open",
          labels: [{ id: 1, name: "cacophony" }, { id: 2, name: "performance" }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          number: 13,
          title: "Unrelated documentation typo",
          body: "Fix spelling in readme",
          state: "open",
          labels: [{ id: 3, name: "docs" }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      createIssueComment: async (owner: string, repo: string, num: number, comment: any) => {
        postedComments.push({ owner, repo, num, comment });
        return { id: 99, html_url: "http://url", body: comment.body, user: { id: 1, login: "bot", email: "bot@bot" }, created_at: "" };
      }
    } as unknown as GiteaApiClient;

    const mockTaskRepo = {
      create: async (task: any) => {
        createdTasks.push(task);
        return task;
      }
    } as unknown as TaskRepository;

    const worker = new GiteaIssueIngestionWorker(mockClient, mockTaskRepo);
    const result = await worker.ingestIssues({
      owner: "cacophony",
      repo: "core",
      labelFilter: "cacophony"
    });

    assert.strictEqual(result.totalIngested, 1);
    assert.strictEqual(createdTasks.length, 1);
    assert.strictEqual(createdTasks[0].title, "[Gitea Issue #12] Optimize tokenizer memory");
    assert.strictEqual(postedComments.length, 1);
    assert.ok(postedComments[0].comment.body.includes("Cacophony Taskcade has ingested this issue"));
  });

  await t.test("T29.5: GiteaPackageClient SHA256 & Provenance Summary Generation", async () => {
    const dummyClient = {} as unknown as GiteaApiClient;
    const pkgClient = new GiteaPackageClient(dummyClient, "http://127.0.0.1:19634", "fake_token");

    const content = Buffer.from("console.log('reproducible bundle');");
    const sha256 = pkgClient.calculateSha256(content);
    assert.strictEqual(typeof sha256, "string");
    assert.strictEqual(sha256.length, 64);

    const summary = pkgClient.formatProvenanceSummary({
      packageName: "cacophony-core",
      version: "1.0.0",
      sha256,
      sizeBytes: content.byteLength,
      publishedAt: "2026-09-24T00:00:00Z"
    });

    assert.ok(summary.includes("### Build Artifact Provenance"));
    assert.ok(summary.includes("`cacophony-core` v`1.0.0`"));
    assert.ok(summary.includes(sha256));
  });
});
