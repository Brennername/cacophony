import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver, MigrationRunner, SessionRepository } from "@cacophony/db";
import { SessionManager } from "../inference/SessionManager.js";
import { SessionCompactor } from "../inference/SessionCompactor.js";

describe("Persistent Session Storage & Auto-Compacting Engine", () => {
  describe("SessionCompactor Unit Logic", () => {
    const compactor = new SessionCompactor({
      maxContextTokens: 100, // Small limit for rapid trigger test
      compactionThresholdRatio: 0.8,
      preserveRecentTurns: 2
    });

    test("should detect when token threshold is reached and compact history", () => {
      const messages = [
        { role: "system" as const, content: "You are Cacophony engine assistant." },
        { role: "user" as const, content: "First task: check file src/daemon.ts for memory leaks with exhaustive trace analysis of all timers, pollers, and child process listeners." },
        { role: "assistant" as const, content: "Checked src/daemon.ts, inspected every interval and listener; verified no leaks exist in any component." },
        { role: "user" as const, content: "Second task: verify packages/db/src/index.ts exports all repositories, interfaces, and migration drivers completely without omissions." },
        { role: "assistant" as const, content: "Verified packages/db/src/index.ts exports every repository, driver, and the new MigrationRegistry." },
        { role: "user" as const, content: "Third task: run unit test suite across all four monorepo workspaces and capture full stdout and exit codes." },
        { role: "assistant" as const, content: "All 106 tests across database, engine, tools, and frontend passed cleanly with 0 failures." },
        { role: "user" as const, content: "Current active goal: build new feature." }
      ];

      const initialTokens = compactor.estimateTokens(messages);
      assert.ok(initialTokens > 80);

      const result = compactor.compact(messages);
      assert.equal(result.compacted, true);
      assert.ok(result.postTokens < result.preTokens);
      assert.ok(result.summary.includes("src/daemon.ts") || result.summary.includes("packages/db"));
      assert.ok(result.messages.some((m) => m.content.includes("[SESSION COMPACTION SUMMARY")));

      // Verify system message is preserved
      assert.equal(result.messages[0]?.role, "system");
      // Verify most recent user prompt is intact
      const lastMsg = result.messages[result.messages.length - 1];
      assert.equal(lastMsg?.content, "Current active goal: build new feature.");
    });
  });

  describe("SessionManager Relational Persistence & Multi-Tab LifeCycle", () => {
    let driver: PGliteDriver;
    let repo: SessionRepository;
    let manager: SessionManager;

    before(async () => {
      driver = new PGliteDriver();
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();

      repo = new SessionRepository(driver);
      manager = new SessionManager(repo, 200); // 200 token budget for test
    });

    after(async () => {
      await driver.close();
    });

    test("should create and retrieve multi-tab session", async () => {
      const session = await manager.createSession("Feature Dev: Code Refactor", "master");
      assert.ok(session.id);
      assert.equal(session.title, "Feature Dev: Code Refactor");

      const context = await manager.getSessionContext(session.id);
      assert.ok(context);
      assert.equal(context?.tabs.length, 1);
      assert.equal(context?.tabs[0]?.tab_name, "Main");
    });

    test("should append turns and perform automated compaction in database", async () => {
      const session = await manager.createSession("Compaction Test Session", "dev-branch");

      for (let i = 1; i <= 6; i++) {
        await manager.appendTurn(
          session.id,
          `Turn ${i}: user instruction modifying packages/engine/src/file${i}.ts with some extensive details.`,
          `Turn ${i}: assistant executed modification on packages/engine/src/file${i}.ts successfully.`
        );
      }

      const updatedContext = await manager.getSessionContext(session.id);
      assert.ok(updatedContext);
      assert.ok(updatedContext.messages.length > 0);

      // Verify search across session history
      const searchResults = await manager.searchHistory("file1.ts");
      assert.ok(searchResults.length >= 1);
    });
  });
});
