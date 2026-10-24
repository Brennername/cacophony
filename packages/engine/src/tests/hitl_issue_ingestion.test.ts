import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDriver } from "@cacophony/db";
import { HitlTicketRepository } from "@cacophony/db";
import { HitlIssueIngestionService } from "../gitea/HitlIssueIngestionService.js";
import { migration022 } from "@cacophony/db";

describe("HitlIssueIngestionService Unit Tests", () => {
  let driver: SQLiteDriver;
  let ticketRepo: HitlTicketRepository;
  let service: HitlIssueIngestionService;

  beforeEach(async () => {
    driver = new SQLiteDriver(":memory:");
    await driver.connect();
    await migration022.up(driver);

    ticketRepo = new HitlTicketRepository(driver);
    service = new HitlIssueIngestionService(ticketRepo, {
      internalAccounts: ["NeXeN", "Cacophony", "cacophony-bot"],
    });
  });

  it("should classify internal admin and bot accounts accurately", () => {
    assert.equal(service.classifyAuthor("NeXeN"), "INTERNAL_ADMIN");
    assert.equal(service.classifyAuthor("cacophony"), "INTERNAL_ADMIN");
    assert.equal(service.classifyAuthor("cacophony-bot"), "INTERNAL_BOT");
    assert.equal(
      service.classifyAuthor("external_developer"),
      "EXTERNAL_CONTRIBUTOR",
    );
  });

  it("should skip ingestion if the issue author is an internal account", async () => {
    const res = await service.ingestIssue({
      id: 101,
      number: 1,
      title: "Internal maintenance task",
      body: "Normal internal work",
      state: "open",
      html_url: "https://github.com/Cacophony/cacophony/issues/1",
      user: { login: "NeXeN" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    assert.equal(res.ingested, false);
    const count = await ticketRepo.listTickets();
    assert.equal(count.length, 0);
  });

  it("should skip pull requests", async () => {
    const res = await service.ingestIssue({
      id: 102,
      number: 2,
      title: "Community pull request",
      body: "Fixing something",
      state: "open",
      html_url: "https://github.com/Cacophony/cacophony/pull/2",
      user: { login: "contributor_123" },
      pull_request: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    assert.equal(res.ingested, false);
    const count = await ticketRepo.listTickets();
    assert.equal(count.length, 0);
  });

  it("should ingest external contributor issue as HITL_PENDING ticket with sanitized prompt", async () => {
    const res = await service.ingestIssue({
      id: 103,
      number: 42,
      title: "Bug in AST parsing",
      body: "Focus File: packages/engine/src/ast.ts\nTest Command: npm test\n\nMethod throws on syntax error.",
      state: "open",
      html_url: "https://github.com/Cacophony/cacophony/issues/42",
      user: {
        login: "contributor_jane",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
      },
      labels: [{ name: "bug" }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    assert.equal(res.ingested, true);
    assert.ok(res.ticket);
    assert.equal(res.ticket.status, "HITL_PENDING");
    assert.equal(res.ticket.githubIssueNumber, 42);
    assert.equal(res.ticket.author, "contributor_jane");
    assert.equal(res.ticket.priority, "P1");
    assert.ok(
      res.ticket.sanitizedPrompt?.includes("[EXTERNAL USER ISSUE TITLE]"),
    );

    // Verify retrieval by GitHub issue number
    const retrieved = await ticketRepo.getByGithubIssueNumber(42);
    assert.ok(retrieved);
    assert.equal(retrieved.title, "Bug in AST parsing");
  });

  it("should prevent duplicate ticket creation on re-ingestion", async () => {
    const rawIssue = {
      id: 104,
      number: 55,
      title: "Duplicate check issue",
      body: "Some body",
      state: "open" as const,
      html_url: "https://github.com/Cacophony/cacophony/issues/55",
      user: { login: "contributor_bob" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const first = await service.ingestIssue(rawIssue);
    assert.equal(first.ingested, true);

    const second = await service.ingestIssue(rawIssue);
    assert.equal(second.ingested, false);
    assert.ok(second.ticket);
    assert.equal(second.ticket.id, first.ticket?.id);

    const all = await ticketRepo.listTickets();
    assert.equal(all.length, 1);
  });
});
