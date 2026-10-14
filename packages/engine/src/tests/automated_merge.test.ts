import test from "node:test";
import assert from "node:assert/strict";
import * as http from "node:http";
import { AutomatedPrWorkflow } from "../gitea/AutomatedPrWorkflow.js";
import { GiteaApiClient } from "../gitea/GiteaApiClient.js";
import { GitWorktreeManager } from "../gitea/GitWorktreeManager.js";

test("Phase 64: T64.6 Automated Squash-Merge Workflow", async (t) => {
  let server: http.Server;
  let serverPort = 0;
  const recordedMerges: any[] = [];
  const recordedDeletions: string[] = [];

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

        if (
          req.method === "POST" &&
          req.url === "/api/v1/repos/NeXeN/cacophony/pulls/55/merge"
        ) {
          recordedMerges.push(bodyJson);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ merged: true, message: "Pull request merged." }),
          );
        } else if (
          req.method === "DELETE" &&
          req.url?.startsWith("/api/v1/repos/NeXeN/cacophony/branches/")
        ) {
          recordedDeletions.push(req.url);
          res.writeHead(204);
          res.end();
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

  const apiClient = new GiteaApiClient({
    baseUrl: `http://127.0.0.1:${serverPort}`,
    apiToken: "valid_merge_token",
  });
  const worktreeManager = new GitWorktreeManager(
    "/tmp/repo",
    "/tmp/workspaces",
  );
  const workflow = new AutomatedPrWorkflow(apiClient, worktreeManager);

  await t.test(
    "T64.6.2: evaluateMergeEligibility validates pre-conditions strictly",
    () => {
      // Green test + Approved review -> Eligible
      assert.strictEqual(
        workflow.evaluateMergeEligibility("success", "APPROVE"),
        true,
        "success + APPROVE should be eligible",
      );
      assert.strictEqual(
        workflow.evaluateMergeEligibility("success", "APPROVED"),
        true,
        "success + APPROVED should be eligible",
      );

      // Red test -> Ineligible
      assert.strictEqual(
        workflow.evaluateMergeEligibility("failure", "APPROVE"),
        false,
        "failure status check must reject merge",
      );
      assert.strictEqual(
        workflow.evaluateMergeEligibility("pending", "APPROVE"),
        false,
        "pending status check must reject merge",
      );

      // Non-approved review -> Ineligible
      assert.strictEqual(
        workflow.evaluateMergeEligibility("success", "REQUEST_CHANGES"),
        false,
        "REQUEST_CHANGES review verdict must reject merge",
      );
      assert.strictEqual(
        workflow.evaluateMergeEligibility("success", "COMMENT"),
        false,
        "COMMENT review verdict must reject merge",
      );
    },
  );

  await t.test(
    "T64.6.1 & T64.6.3 & T64.6.4: executeSquashMerge executes merge and branch deletion",
    async () => {
      const result = await workflow.executeSquashMerge(
        "NeXeN",
        "cacophony",
        55,
        {
          branchName: "task/p1-task-55-squash",
          commitTitle: "feat(core): auto-merged task 55",
        },
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.merged, true);

      assert.strictEqual(recordedMerges.length, 1);
      assert.strictEqual(recordedMerges[0].Do, "squash");
      assert.strictEqual(
        recordedMerges[0].MergeTitleField,
        "feat(core): auto-merged task 55",
      );

      assert.strictEqual(recordedDeletions.length, 1);
      assert.ok(
        recordedDeletions[0]?.includes("task%2Fp1-task-55-squash"),
        "Should have requested branch deletion for task branch",
      );
    },
  );

  // Close server
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
