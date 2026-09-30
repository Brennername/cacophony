import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as http from "node:http";
import { GiteaPlatformProvider } from "../gitea/GiteaPlatformProvider.js";
import { GitHubPlatformProvider } from "../gitea/GitHubPlatformProvider.js";
import { GitPlatformProviderFactory } from "../gitea/GitPlatformProviderFactory.js";
import { GiteaApiClient } from "../gitea/GiteaApiClient.js";

describe("Unified Git Platform Provider Suite (Gitea & GitHub)", () => {
  let mockServer: http.Server;
  const mockPort = 19782;

  before(async () => {
    mockServer = http.createServer((req, res) => {
      const url = req.url ?? "";
      const method = req.method ?? "GET";

      // Gitea mock endpoints
      if (url.includes("/api/v1/repos/test-owner/test-repo/branches") && method === "POST") {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ name: "feature-branch", commit: { id: "sha-1234" } }));
        return;
      }

      if (url.includes("/api/v1/repos/test-owner/test-repo/pulls/1.diff")) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("diff --git a/file.ts b/file.ts\n+added");
        return;
      }

      if (url.includes("/api/v1/repos/test-owner/test-repo/pulls/1/reviews") && method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: 88, status: "APPROVED" }));
        return;
      }

      if (url.includes("/api/v1/repos/test-owner/test-repo/pulls/1/merge") && method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "merged" }));
        return;
      }

      if (url.includes("/api/v1/repos/test-owner/test-repo/pulls") && method === "POST") {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: 1,
            number: 1,
            title: "Test PR",
            body: "PR body",
            state: "open",
            merged: false,
            head: { ref: "feature-branch", sha: "sha-1" },
            base: { ref: "main", sha: "sha-base" },
            html_url: `http://localhost:${mockPort}/pulls/1`,
            diff_url: `http://localhost:${mockPort}/pulls/1.diff`
          })
        );
        return;
      }

      // GitHub mock endpoints
      if (url.includes("/repos/gh-owner/gh-repo/git/ref/heads/main")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ object: { sha: "gh-base-sha" } }));
        return;
      }

      if (url.includes("/repos/gh-owner/gh-repo/git/refs") && method === "POST") {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ref: "refs/heads/gh-feature", object: { sha: "gh-new-sha" } }));
        return;
      }

      if (url.includes("/repos/gh-owner/gh-repo/pulls/42/reviews") && method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: 999, state: "APPROVED" }));
        return;
      }

      if (url.includes("/repos/gh-owner/gh-repo/pulls/42/merge") && method === "PUT") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ merged: true }));
        return;
      }

      if (url.includes("/repos/gh-owner/gh-repo/pulls/42") && method === "GET") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("diff --git a/main.ts b/main.ts\n+gh diff");
        return;
      }

      if (url.includes("/repos/gh-owner/gh-repo/pulls") && method === "POST") {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: 42,
            number: 42,
            title: "GH PR",
            body: "GH Body",
            state: "open",
            merged: false,
            head: { ref: "gh-feature" },
            base: { ref: "main" },
            html_url: "https://github.com/gh-owner/gh-repo/pull/42",
            diff_url: "https://github.com/gh-owner/gh-repo/pull/42.diff"
          })
        );
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => mockServer.listen(mockPort, resolve));
  });

  after(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  });

  it("should create branch, open PR, and submit review via GiteaPlatformProvider", async () => {
    const client = new GiteaApiClient({ baseUrl: `http://localhost:${mockPort}` });
    const provider = new GiteaPlatformProvider(client);

    assert.strictEqual(provider.providerType, "gitea");

    const branch = await provider.createBranch("test-owner", "test-repo", {
      newBranchName: "feature-branch",
      baseBranch: "main"
    });
    assert.strictEqual(branch.name, "feature-branch");
    assert.strictEqual(branch.commitSha, "sha-1234");

    const pr = await provider.openPullRequest("test-owner", "test-repo", {
      title: "Test PR",
      body: "PR body",
      head: "feature-branch",
      base: "main"
    });
    assert.strictEqual(pr.number, 1);
    assert.strictEqual(pr.headRef, "feature-branch");
    assert.strictEqual(pr.merged, false);

    const diff = await provider.getPullRequestDiff("test-owner", "test-repo", 1);
    assert.ok(diff.includes("diff --git"));

    const review = await provider.submitReview("test-owner", "test-repo", 1, {
      body: "Looks solid",
      event: "APPROVED"
    });
    assert.ok(review.id > 0);
    assert.strictEqual(review.status, "APPROVED");

    const merged = await provider.mergePullRequest("test-owner", "test-repo", 1);
    assert.strictEqual(merged, true);
  });

  it("should create branch, open PR, and submit review via GitHubPlatformProvider", async () => {
    const provider = new GitHubPlatformProvider({
      token: "test-gh-token",
      baseUrl: `http://localhost:${mockPort}`
    });

    assert.strictEqual(provider.providerType, "github");

    const branch = await provider.createBranch("gh-owner", "gh-repo", {
      newBranchName: "gh-feature",
      baseBranch: "main"
    });
    assert.strictEqual(branch.name, "gh-feature");
    assert.strictEqual(branch.commitSha, "gh-new-sha");

    const pr = await provider.openPullRequest("gh-owner", "gh-repo", {
      title: "GH PR",
      body: "GH Body",
      head: "gh-feature",
      base: "main"
    });
    assert.strictEqual(pr.number, 42);
    assert.strictEqual(pr.headRef, "gh-feature");

    const diff = await provider.getPullRequestDiff("gh-owner", "gh-repo", 42);
    assert.ok(diff.includes("gh diff"));

    const review = await provider.submitReview("gh-owner", "gh-repo", 42, {
      body: "LGTM",
      event: "APPROVED"
    });
    assert.strictEqual(review.id, 999);
    assert.strictEqual(review.status, "APPROVED");

    const merged = await provider.mergePullRequest("gh-owner", "gh-repo", 42);
    assert.strictEqual(merged, true);
  });

  it("should dynamically instantiate correct provider via GitPlatformProviderFactory", () => {
    const giteaProv = GitPlatformProviderFactory.create({
      platform: "gitea",
      giteaBaseUrl: `http://localhost:${mockPort}`
    });
    assert.strictEqual(giteaProv.providerType, "gitea");

    const githubProv = GitPlatformProviderFactory.create({
      platform: "github",
      githubToken: "mock-token",
      githubBaseUrl: `http://localhost:${mockPort}`
    });
    assert.strictEqual(githubProv.providerType, "github");
  });
});
