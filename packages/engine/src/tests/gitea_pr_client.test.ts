import test from "node:test";
import assert from "node:assert/strict";
import * as http from "node:http";
import { GiteaPrClient } from "../gitea/GiteaPrClient.js";

test("Phase 64: T64.3 & T64.5 & T64.6 GiteaPrClient REST Integration", async (t) => {
  let server: http.Server;
  let serverPort = 0;
  const recordedRequests: Array<{
    method: string;
    url: string;
    headers: http.IncomingHttpHeaders;
    body: any;
  }> = [];

  // Spin up authentic HTTP server simulating Gitea REST API
  await new Promise<void>((resolve) => {
    server = http.createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const bodyStr = Buffer.concat(chunks).toString("utf-8");
        let bodyJson = null;
        try {
          bodyJson = bodyStr ? JSON.parse(bodyStr) : null;
        } catch {
          bodyJson = bodyStr;
        }

        recordedRequests.push({
          method: req.method || "GET",
          url: req.url || "/",
          headers: req.headers,
          body: bodyJson,
        });

        // Route responses
        if (
          req.method === "POST" &&
          req.url === "/api/v1/repos/NeXeN/cacophony/pulls"
        ) {
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: 101,
              number: 42,
              title: bodyJson?.title,
              body: bodyJson?.body,
              state: "open",
              merged: false,
              head: { ref: bodyJson?.head, sha: "abc1234" },
              base: { ref: bodyJson?.base, sha: "main1234" },
              html_url: `http://localhost:${serverPort}/NeXeN/cacophony/pulls/42`,
              diff_url: `http://localhost:${serverPort}/NeXeN/cacophony/pulls/42.diff`,
            }),
          );
        } else if (
          req.method === "POST" &&
          req.url === "/api/v1/repos/NeXeN/cacophony/statuses/abc1234"
        ) {
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: 501,
              status: bodyJson?.state,
              context: bodyJson?.context,
              description: bodyJson?.description,
              target_url: bodyJson?.target_url || "",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          );
        } else if (
          req.method === "POST" &&
          req.url === "/api/v1/repos/NeXeN/cacophony/pulls/42/reviews"
        ) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ id: 901, state: bodyJson?.event }));
        } else if (
          req.method === "POST" &&
          req.url === "/api/v1/repos/NeXeN/cacophony/pulls/42/merge"
        ) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({}));
        } else if (
          req.method === "GET" &&
          req.url === "/api/v1/repos/NeXeN/cacophony/pulls/42"
        ) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: 101,
              number: 42,
              title: "Test PR",
              body: "Body",
              state: "open",
              merged: true,
              head: { ref: "task/p1-task-42", sha: "abc1234" },
              base: { ref: "main", sha: "main1234" },
              html_url: `http://localhost:${serverPort}/NeXeN/cacophony/pulls/42`,
              diff_url: `http://localhost:${serverPort}/NeXeN/cacophony/pulls/42.diff`,
            }),
          );
        } else if (
          req.method === "DELETE" &&
          req.url?.startsWith("/api/v1/repos/NeXeN/cacophony/branches/")
        ) {
          res.writeHead(204);
          res.end();
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Not found" }));
        }
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as any;
      serverPort = addr.port;
      resolve();
    });
  });

  const prClient = new GiteaPrClient({
    baseUrl: `http://127.0.0.1:${serverPort}`,
    apiToken: "secret_token_12345",
  });

  await t.test(
    "T64.3.1 & T64.3.3: openPullRequest sends correct REST payload",
    async () => {
      const pr = await prClient.openPullRequest({
        owner: "NeXeN",
        repo: "cacophony",
        title: "feat(core): implement autonomous PR client",
        body: "## Task Verification\nPassed 10/10 tests.",
        head: "task/p1-task-42",
        base: "main",
      });

      assert.strictEqual(pr.number, 42);
      assert.strictEqual(
        pr.title,
        "feat(core): implement autonomous PR client",
      );
      assert.ok(pr.html_url.includes("/pulls/42"));

      const prReq = recordedRequests.find(
        (r) =>
          r.method === "POST" &&
          r.url === "/api/v1/repos/NeXeN/cacophony/pulls",
      );
      assert.ok(prReq, "Should have received POST /pulls request");
      assert.strictEqual(
        prReq?.headers["authorization"],
        "token secret_token_12345",
      );
      assert.strictEqual(prReq?.body?.head, "task/p1-task-42");
      assert.strictEqual(prReq?.body?.base, "main");
    },
  );

  await t.test(
    "T64.5.2: setCommitStatus sends correct status check payload",
    async () => {
      const status = await prClient.setCommitStatus({
        owner: "NeXeN",
        repo: "cacophony",
        sha: "abc1234",
        status: {
          state: "success",
          context: "continuous-integration/cacophony-test",
          description: "All unit and integration tests passed",
        },
      });

      assert.strictEqual(status.status, "success");
      assert.strictEqual(
        status.context,
        "continuous-integration/cacophony-test",
      );

      const statusReq = recordedRequests.find(
        (r) =>
          r.method === "POST" &&
          r.url === "/api/v1/repos/NeXeN/cacophony/statuses/abc1234",
      );
      assert.ok(statusReq, "Should have received POST /statuses request");
      assert.strictEqual(statusReq?.body?.state, "success");
    },
  );

  await t.test(
    "T64.5.1: submitReview submits structured code review comment to Gitea",
    async () => {
      await prClient.submitReview({
        owner: "NeXeN",
        repo: "cacophony",
        prIndex: 42,
        review: {
          event: "APPROVED",
          body: "Code adheres to SOLID principles and zero-emoji compliance.",
        },
      });

      const reviewReq = recordedRequests.find(
        (r) =>
          r.method === "POST" &&
          r.url === "/api/v1/repos/NeXeN/cacophony/pulls/42/reviews",
      );
      assert.ok(reviewReq, "Should have received POST /reviews request");
      assert.strictEqual(reviewReq?.body?.event, "APPROVED");
    },
  );

  await t.test(
    "T64.6.1 & T64.6.3: mergePullRequest executes squash-merge and branch deletion",
    async () => {
      await prClient.mergePullRequest({
        owner: "NeXeN",
        repo: "cacophony",
        prIndex: 42,
        mergeStyle: "squash",
        deleteBranch: true,
      });

      const mergeReq = recordedRequests.find(
        (r) =>
          r.method === "POST" &&
          r.url === "/api/v1/repos/NeXeN/cacophony/pulls/42/merge",
      );
      assert.ok(mergeReq, "Should have received POST /merge request");
      assert.strictEqual(mergeReq?.body?.Do, "squash");

      const deleteReq = recordedRequests.find(
        (r) =>
          r.method === "DELETE" &&
          r.url?.includes("/branches/task%2Fp1-task-42"),
      );
      assert.ok(deleteReq, "Should have deleted remote task branch");
    },
  );

  // Close mock server
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
