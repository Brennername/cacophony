import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as http from "node:http";
import { GiteaPlatformProvider } from "../gitea/GiteaPlatformProvider.js";
import { GiteaApiClient } from "../gitea/GiteaApiClient.js";

describe("T108.5: Gitea PR Threads & Review Query Suite", () => {
  let mockServer: http.Server;
  const mockPort = 19788;
  let client: GiteaApiClient;
  let provider: GiteaPlatformProvider;

  before(async () => {
    mockServer = http.createServer((req, res) => {
      const url = req.url ?? "";
      const method = req.method ?? "GET";

      if (
        url.includes("/api/v1/repos/test-owner/test-repo/pulls/10/reviews/55/comments") &&
        method === "GET"
      ) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify([
            {
              id: 101,
              pull_request_review_id: 55,
              user: { id: 2, login: "SecurityBot" },
              body: "Potential path traversal with relative .. segments",
              path: "src/security.ts",
              line: 42,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]),
        );
        return;
      }

      if (
        url.includes("/api/v1/repos/test-owner/test-repo/pulls/10/reviews") &&
        method === "GET"
      ) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify([
            {
              id: 55,
              user: { id: 2, login: "SecurityBot" },
              state: "REQUEST_CHANGES",
              body: "Security review requested changes",
              html_url: "http://localhost:19788/reviews/55",
              submitted_at: new Date().toISOString(),
              comments_count: 1,
            },
          ]),
        );
        return;
      }

      if (
        url.includes("/api/v1/repos/test-owner/test-repo/issues/10/comments") &&
        method === "GET"
      ) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify([
            {
              id: 201,
              html_url: "http://localhost:19788/issues/10#issuecomment-201",
              body: "Playwright E2E test suites passed across all viewports.",
              user: { id: 3, login: "PlaywrightBot" },
              created_at: new Date().toISOString(),
            },
          ]),
        );
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(mockPort, () => resolve());
    });

    client = new GiteaApiClient({
      baseUrl: `http://localhost:${mockPort}`,
      apiToken: "mock-token",
    });
    provider = new GiteaPlatformProvider(client);
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      mockServer.close(() => resolve());
    });
  });

  it("should query PR reviews via GiteaApiClient and GiteaPlatformProvider", async () => {
    const reviews = await client.listPullRequestReviews("test-owner", "test-repo", 10);
    assert.strictEqual(reviews.length, 1);
    assert.strictEqual(reviews[0]!.id, 55);
    assert.strictEqual(reviews[0]!.user.login, "SecurityBot");
    assert.strictEqual(reviews[0]!.state, "REQUEST_CHANGES");

    const providerReviews = await provider.listPullRequestReviews!("test-owner", "test-repo", 10);
    assert.strictEqual(providerReviews.length, 1);
    assert.strictEqual(providerReviews[0]!.authorName, "SecurityBot");
    assert.strictEqual(providerReviews[0]!.state, "REQUEST_CHANGES");
  });

  it("should query PR review comments via GiteaApiClient", async () => {
    const comments = await client.listPullRequestReviewComments("test-owner", "test-repo", 10, 55);
    assert.strictEqual(comments.length, 1);
    assert.strictEqual(comments[0]!.id, 101);
    assert.strictEqual(comments[0]!.path, "src/security.ts");
    assert.strictEqual(comments[0]!.line, 42);
    assert.strictEqual(comments[0]!.user.login, "SecurityBot");
  });

  it("should query issue/PR discussion comments via GiteaPlatformProvider", async () => {
    const comments = await provider.listPullRequestComments!("test-owner", "test-repo", 10);
    assert.strictEqual(comments.length, 1);
    assert.strictEqual(comments[0]!.id, 201);
    assert.strictEqual(comments[0]!.authorName, "PlaywrightBot");
    assert.ok(comments[0]!.body.includes("Playwright E2E"));
  });
});
