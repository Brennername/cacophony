import test from "node:test";
import assert from "node:assert/strict";
import * as http from "node:http";
import { GiteaPrClient } from "../gitea/GiteaPrClient.js";
import { SQLiteDriver } from "@cacophony/db";
import { MigrationRunner } from "@cacophony/db";
import { TaskRepository } from "@cacophony/db";
import { PrReviewRepository } from "@cacophony/db";
import type { TaskRecord } from "@cacophony/shared-types";

test("Phase 64: T64.5 Gitea PR Review Submission & Status Check Integration", async (t) => {
  let server: http.Server;
  let serverPort = 0;
  const recordedReviews: any[] = [];
  const recordedStatuses: any[] = [];

  // Spin up authentic Gitea REST mock server
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

        if (
          req.method === "POST" &&
          req.url === "/api/v1/repos/NeXeN/cacophony/pulls/77/reviews"
        ) {
          recordedReviews.push(bodyJson);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: 888,
              state: bodyJson?.event,
              body: bodyJson?.body,
            }),
          );
        } else if (
          req.method === "POST" &&
          req.url === "/api/v1/repos/NeXeN/cacophony/statuses/commit777"
        ) {
          recordedStatuses.push(bodyJson);
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: 999,
              status: bodyJson?.state,
              context: bodyJson?.context,
              description: bodyJson?.description,
            }),
          );
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "not found" }));
        }
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as any;
      serverPort = addr.port;
      resolve();
    });
  });

  // Set up in-memory DB
  const driver = new SQLiteDriver(":memory:");
  await driver.connect();
  const runner = new MigrationRunner(driver);
  await runner.migrate();

  const taskRepo = new TaskRepository(driver);
  const reviewRepo = new PrReviewRepository(driver);

  const task: TaskRecord = {
    id: "task-flow-77",
    title: "Implement review flow",
    prompt: "Ensure reviews and commit statuses integrate seamlessly",
    role: "implementer",
    status: "RUNNING",
    priority: "P1",
    modelAssigned: "deepseek-r1:8b",
    testCommand: "npm test",
    focusFiles: "src/review_flow.ts",
    targetBranch: "task/p1-task-flow-77",
    prUrl: `http://localhost:${serverPort}/NeXeN/cacophony/pulls/77`,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
  await taskRepo.create(task);

  const prClient = new GiteaPrClient({
    baseUrl: `http://127.0.0.1:${serverPort}`,
    apiToken: "valid_token",
  });

  await t.test(
    "T64.5.1 & T64.5.2 & T64.5.4: Submits review verdict, sets commit status check, and audits review in database",
    async () => {
      // 1. Submit review to Gitea
      await prClient.submitReview({
        owner: "NeXeN",
        repo: "cacophony",
        prIndex: 77,
        review: {
          event: "APPROVED",
          body: "Code passed unit tests and conforms to SOLID design principles.",
        },
      });

      assert.strictEqual(recordedReviews.length, 1);
      assert.strictEqual(recordedReviews[0].event, "APPROVED");

      // 2. Set commit status check to 'success'
      const statusRes = await prClient.setCommitStatus({
        owner: "NeXeN",
        repo: "cacophony",
        sha: "commit777",
        status: {
          state: "success",
          context: "continuous-integration/cacophony-test",
          description: "All unit tests passed with 0 failures",
        },
      });

      assert.strictEqual(statusRes.status, "success");
      assert.strictEqual(recordedStatuses.length, 1);
      assert.strictEqual(recordedStatuses[0].state, "success");

      // 3. Persist review record in database (T64.5.3)
      const auditRecord = await reviewRepo.recordReview({
        taskId: "task-flow-77",
        giteaPrId: 77,
        reviewerModel: "deepseek-r1:8b",
        verdict: "APPROVE",
        reviewNotes:
          "Code passed unit tests and conforms to SOLID design principles.",
        diffAnalyzed:
          "--- a/src/review_flow.ts\n+++ b/src/review_flow.ts\n+export const flow = true;",
      });

      assert.ok(auditRecord.id > 0);
      assert.strictEqual(auditRecord.verdict, "APPROVE");

      // Verify audit query
      const retrieved = await reviewRepo.getReviewsByTaskId("task-flow-77");
      assert.strictEqual(retrieved.length, 1);
      assert.strictEqual(retrieved[0]?.giteaPrId, 77);
      assert.strictEqual(retrieved[0]?.verdict, "APPROVE");
    },
  );

  // Teardown
  await driver.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
