import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";
import { CacophonyHttpServer } from "../daemon/CacophonyHttpServer.js";

describe("HITL API Gateway Integration Tests", () => {
  let daemon: CacophonyDaemon;
  let server: CacophonyHttpServer;
  let tempDir: string;
  const testPort = 24197;
  const baseUrl = `http://127.0.0.1:${testPort}`;
  const adminSecret = "test-admin-secret-token";

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-hitl-"));
    const dbPath = path.join(tempDir, "hitl_test.sqlite");

    process.env.ADMIN_TOKEN = adminSecret;
    daemon = new CacophonyDaemon({
      dbPath,
      startScheduler: false,
    });
    await daemon.start();

    server = new CacophonyHttpServer(daemon, {
      httpPort: testPort,
      httpHost: "127.0.0.1",
    });
    await server.start();
  });

  after(async () => {
    await server.stop();
    await daemon.stop();
    delete process.env.ADMIN_TOKEN;
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("should enforce authorization, ticket lifecycle, and task enqueueing end-to-end", async () => {
    const hitlRepo = daemon.getHitlTicketRepository();

    // 1. Direct ticket creation
    const created = await hitlRepo.createTicket({
      githubIssueNumber: 101,
      githubIssueId: 999101,
      githubIssueUrl: "https://github.com/Cacophony/cacophony/issues/101",
      author: "alice_contributor",
      title: "Fix crash on invalid input",
      rawBody: "Focus File: src/crash.ts\nTest: npm test",
      priority: "P1",
    });
    assert.equal(created.githubIssueNumber, 101);
    assert.equal(created.status, "HITL_PENDING");

    // 2. Reject unauthenticated or unauthorized access to GET /api/hitl/tickets
    const unauthorizedRes = await fetch(`${baseUrl}/api/hitl/tickets`, {
      headers: { Authorization: "Bearer wrong-token" },
    });
    assert.equal(unauthorizedRes.status, 403);

    const missingAuthRes = await fetch(`${baseUrl}/api/hitl/tickets`);
    assert.equal(missingAuthRes.status, 403);

    // 3. Allow authenticated access to GET /api/hitl/tickets
    const authorizedRes = await fetch(`${baseUrl}/api/hitl/tickets`, {
      headers: { Authorization: `Bearer ${adminSecret}` },
    });
    assert.equal(authorizedRes.status, 200);
    const listBody = (await authorizedRes.json()) as any;
    assert.equal(listBody.success, true);
    assert.ok(Array.isArray(listBody.tickets));
    const found = listBody.tickets.find((t: any) => t.id === "hitl-ticket-101");
    assert.ok(found);
    assert.equal(found.author, "alice_contributor");

    // 4. Attach contributor feedback via POST /api/hitl/tickets/:id/feedback
    const feedbackRes = await fetch(
      `${baseUrl}/api/hitl/tickets/hitl-ticket-101/feedback`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: "alice_contributor",
          content: "Here is extra reproduction log: Error: input undefined",
        }),
      },
    );
    assert.equal(feedbackRes.status, 201);
    const feedbackBody = (await feedbackRes.json()) as any;
    assert.equal(feedbackBody.success, true);
    assert.equal(
      feedbackBody.feedback.content,
      "Here is extra reproduction log: Error: input undefined",
    );

    // 5. Approve ticket via POST /api/hitl/tickets/:id/approve and enqueue to arena
    const approveRes = await fetch(
      `${baseUrl}/api/hitl/tickets/hitl-ticket-101/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priority: "P1",
          focusFiles: "src/crash.ts",
          testCommand: "npm test --workspace=@cacophony/engine",
        }),
      },
    );
    assert.equal(approveRes.status, 200);
    const approveBody = (await approveRes.json()) as any;
    assert.equal(approveBody.success, true);
    assert.equal(approveBody.ticket.status, "ENQUEUED");
    assert.ok(approveBody.ticket.associatedTaskId);
    assert.equal(approveBody.task.id, approveBody.ticket.associatedTaskId);

    // Verify task exists in TaskRepository
    const taskRepo = daemon.getTaskRepository();
    const enqueuedTask = await taskRepo.getById(
      approveBody.ticket.associatedTaskId,
    );
    assert.ok(enqueuedTask);
    assert.equal(enqueuedTask.status, "PENDING");
    assert.equal(
      enqueuedTask.testCommand,
      "npm test --workspace=@cacophony/engine",
    );

    // 6. Test rejection of spam ticket
    await hitlRepo.createTicket({
      githubIssueNumber: 102,
      githubIssueId: 999102,
      githubIssueUrl: "https://github.com/Cacophony/cacophony/issues/102",
      author: "spammer_account",
      title: "Free crypto giveaway",
      rawBody: "Click here for free coins",
      priority: "P2",
    });

    const rejectRes = await fetch(
      `${baseUrl}/api/hitl/tickets/hitl-ticket-102/reject`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Spam / irrelevant to project repository.",
        }),
      },
    );
    assert.equal(rejectRes.status, 200);
    const rejectBody = (await rejectRes.json()) as any;
    assert.equal(rejectBody.success, true);
    assert.equal(rejectBody.ticket.status, "REJECTED");
    assert.equal(
      rejectBody.ticket.rejectionReason,
      "Spam / irrelevant to project repository.",
    );
  });
});
