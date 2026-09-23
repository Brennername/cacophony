import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as http from "node:http";
import * as crypto from "node:crypto";

import { GiteaApiClient } from "../gitea/GiteaApiClient.js";
import { AutomatedPrWorkflow } from "../gitea/AutomatedPrWorkflow.js";
import { AutomatedPrReviewLoop } from "../gitea/AutomatedPrReviewLoop.js";
import { GiteaWebhookReceiver } from "../gitea/GiteaWebhookReceiver.js";
import { GiteaOAuthProvider } from "../gitea/GiteaOAuthProvider.js";
import type { GitWorktreeManager, WorktreeDescriptor } from "../gitea/GitWorktreeManager.js";
import type { OllamaProvider } from "../inference/OllamaProvider.js";
import type { TaskRepository } from "@cacophony/db";

describe("Gitea Integration & Automated Development Cycle", () => {
  let mockServer: http.Server;
  const mockPort = 19699;
  let giteaClient: GiteaApiClient;

  before(async () => {
    // Setup Mock Gitea HTTP Server
    mockServer = http.createServer((req, res) => {
      const url = req.url ?? "";

      if (url.includes("/api/v1/repos/cacophony/core/pulls/1.diff")) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("diff --git a/index.ts b/index.ts\n+console.log('clean');");
        return;
      }

      if (url.includes("/api/v1/repos/cacophony/core/pulls/1/reviews") && req.method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: 101, status: "APPROVED" }));
        return;
      }

      if (url.includes("/api/v1/repos/cacophony/core/pulls/1/merge") && req.method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Pull request merged" }));
        return;
      }

      if (url.includes("/api/v1/repos/cacophony/core/pulls") && req.method === "POST") {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: 1,
            number: 1,
            title: "Automated PR",
            body: "PR body",
            state: "open",
            merged: false,
            head: { ref: "task-branch-1" },
            base: { ref: "main" },
            html_url: `http://localhost:${mockPort}/pulls/1`,
            diff_url: `http://localhost:${mockPort}/pulls/1.diff`
          })
        );
        return;
      }

      if (url.includes("/login/oauth/access_token") && req.method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            access_token: "mock-oauth-token-xyz",
            token_type: "bearer"
          })
        );
        return;
      }

      if (url.includes("/api/v1/user") && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: 42,
            login: "alice_developer",
            email: "alice@example.com",
            full_name: "Alice Dev"
          })
        );
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(mockPort, "127.0.0.1", () => resolve());
    });

    giteaClient = new GiteaApiClient({
      baseUrl: `http://127.0.0.1:${mockPort}`,
      apiToken: "mock-secret-token"
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      mockServer.close(() => resolve());
    });
  });

  it("should publish Pull Request with AutomatedPrWorkflow", async () => {
    const mockWorktreeManager: Partial<GitWorktreeManager> = {
      commitWorktree: async () => "commit ok",
      pushBranch: async () => {}
    };

    const workflow = new AutomatedPrWorkflow(giteaClient, mockWorktreeManager as GitWorktreeManager);
    const mockWorktree: WorktreeDescriptor = {
      taskId: "task-001",
      branchName: "task-branch-1",
      worktreePath: "/tmp/workspaces/task-001"
    };

    const result = await workflow.publishPullRequest(mockWorktree, {
      owner: "cacophony",
      repo: "core",
      taskId: "task-001",
      title: "Feature A implementation",
      testSummary: "All 12 unit tests passing",
      commitMessage: "feat: add feature A"
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.pullRequest?.number, 1);
  });

  it("should evaluate PR diff and submit approved review loop", async () => {
    const mockOllama: Partial<OllamaProvider> = {
      generate: async () => ({
        content: JSON.stringify({
          verdict: "APPROVE",
          reviewNotes: "Clean SOLID design with strict typing.",
          comments: []
        }),
        model: "qwen2.5-coder:7b",
        tokensPrompt: 50,
        tokensCompletion: 80,
        totalTokens: 130,
        latencyMs: 120,
        tokensPerSec: 800
      })
    };

    const reviewLoop = new AutomatedPrReviewLoop(giteaClient, mockOllama as OllamaProvider);
    const reviewResult = await reviewLoop.evaluatePullRequest({
      owner: "cacophony",
      repo: "core",
      prNumber: 1,
      taskId: "task-001",
      reviewerModel: "qwen2.5-coder:7b",
      autoMergeOnApproval: true
    });

    assert.strictEqual(reviewResult.verdict, "APPROVE");
    assert.strictEqual(reviewResult.merged, true);
    assert.strictEqual(reviewResult.remediationRequired, false);
  });

  it("should handle Gitea webhook issue events and enqueue arena tasks", async () => {
    const enqueuedTasks: any[] = [];
    const mockTaskRepo: Partial<TaskRepository> = {
      create: async (task: any) => {
        enqueuedTasks.push(task);
        return task;
      }
    };

    const webhookReceiver = new GiteaWebhookReceiver(mockTaskRepo as TaskRepository, "test-webhook-secret");

    const validPayload = JSON.stringify({
      action: "opened",
      issue: {
        number: 404,
        title: "Fix APU memory leak",
        body: "Investigate DRM sysfs buffer"
      },
      repository: {
        name: "core",
        full_name: "cacophony/core",
        default_branch: "main"
      }
    });

    const signature = "sha256=" + crypto
      .createHmac("sha256", "test-webhook-secret")
      .update(validPayload)
      .digest("hex");

    assert.strictEqual(webhookReceiver.verifySignature(validPayload, signature.slice(7)), true);

    const result = await webhookReceiver.handleWebhook("issues", JSON.parse(validPayload));
    assert.strictEqual(result.processed, true);
    assert.strictEqual(enqueuedTasks.length, 1);
    assert.ok(enqueuedTasks[0].prompt.includes("Fix APU memory leak"));
  });

  it("should execute Gitea OAuth2 code exchange and generate signed JWT session", async () => {
    const oauthProvider = new GiteaOAuthProvider(giteaClient, {
      clientId: "cacophony-client",
      clientSecret: "client-secret-123",
      redirectUri: "http://localhost:24072/auth/callback",
      giteaPublicUrl: "http://localhost:19634",
      jwtSecret: "cacophony-jwt-secret-xyz"
    });

    const authUrl = oauthProvider.getAuthorizationUrl("random-state-123");
    assert.ok(authUrl.includes("client_id=cacophony-client"));
    assert.ok(authUrl.includes("state=random-state-123"));

    const session = await oauthProvider.handleCallback("sample-auth-code");
    assert.strictEqual(session.user.username, "alice_developer");
    assert.strictEqual(session.user.email, "alice@example.com");

    const verification = oauthProvider.verifySessionJwt(session.token);
    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.payload?.username, "alice_developer");
  });
});
