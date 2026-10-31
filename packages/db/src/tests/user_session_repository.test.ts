import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { UserSessionRepository, type UserSessionRecord } from "../repositories/UserSessionRepository.js";

describe("UserSessionRepository", () => {
  let driver: PGliteDriver;
  let repo: UserSessionRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new UserSessionRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should create and retrieve a user session by session ID", async () => {
    const session: UserSessionRecord = {
      sessionId: "sess_12345",
      userId: "usr_abc",
      username: "lead_engineer",
      email: "engineer@cacophony.local",
      role: "ADMIN",
      provider: "local",
      accessTokenEnc: "enc_token_xyz",
      refreshTokenEnc: "enc_refresh_xyz",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repo.saveSession(session);

    const fetched = await repo.getSession("sess_12345");
    assert.ok(fetched);
    assert.equal(fetched.sessionId, "sess_12345");
    assert.equal(fetched.userId, "usr_abc");
    assert.equal(fetched.username, "lead_engineer");
    assert.equal(fetched.email, "engineer@cacophony.local");
    assert.equal(fetched.role, "ADMIN");
    assert.equal(fetched.provider, "local");
    assert.equal(fetched.accessTokenEnc, "enc_token_xyz");
    assert.equal(fetched.refreshTokenEnc, "enc_refresh_xyz");
  });

  test("should update existing session on conflict", async () => {
    const initial: UserSessionRecord = {
      sessionId: "sess_update",
      userId: "usr_1",
      username: "user_one",
      email: "user1@cacophony.local",
      role: "VIEWER",
      provider: "local",
      accessTokenEnc: "initial_token",
      expiresAt: new Date(Date.now() + 100000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repo.saveSession(initial);

    const updated: UserSessionRecord = {
      ...initial,
      role: "OPERATOR",
      accessTokenEnc: "rotated_token",
      updatedAt: new Date().toISOString(),
    };

    await repo.saveSession(updated);

    const fetched = await repo.getSession("sess_update");
    assert.ok(fetched);
    assert.equal(fetched.role, "OPERATOR");
    assert.equal(fetched.accessTokenEnc, "rotated_token");
  });

  test("should retrieve all sessions for a specific user ID", async () => {
    const sessionA: UserSessionRecord = {
      sessionId: "sess_a",
      userId: "target_user",
      username: "target",
      email: "target@cacophony.local",
      role: "OPERATOR",
      provider: "gitea",
      accessTokenEnc: "token_a",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date(Date.now() - 5000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sessionB: UserSessionRecord = {
      sessionId: "sess_b",
      userId: "target_user",
      username: "target",
      email: "target@cacophony.local",
      role: "OPERATOR",
      provider: "gitea",
      accessTokenEnc: "token_b",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repo.saveSession(sessionA);
    await repo.saveSession(sessionB);

    const userSessions = await repo.getSessionsByUserId("target_user");
    assert.equal(userSessions.length, 2);
  });

  test("should delete session on logout / revocation", async () => {
    const session: UserSessionRecord = {
      sessionId: "sess_delete",
      userId: "usr_del",
      username: "del_user",
      email: "del@cacophony.local",
      role: "VIEWER",
      provider: "local",
      accessTokenEnc: "token_del",
      expiresAt: new Date(Date.now() + 100000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repo.saveSession(session);
    assert.ok(await repo.getSession("sess_delete"));

    const deleted = await repo.deleteSession("sess_delete");
    assert.equal(deleted, true);

    const missing = await repo.getSession("sess_delete");
    assert.equal(missing, null);
  });

  test("should prune expired sessions", async () => {
    const expiredSession: UserSessionRecord = {
      sessionId: "sess_expired",
      userId: "usr_exp",
      username: "exp_user",
      email: "exp@cacophony.local",
      role: "VIEWER",
      provider: "local",
      accessTokenEnc: "token_exp",
      expiresAt: new Date(Date.now() - 50000).toISOString(),
      createdAt: new Date(Date.now() - 100000).toISOString(),
      updatedAt: new Date(Date.now() - 100000).toISOString(),
    };

    const activeSession: UserSessionRecord = {
      sessionId: "sess_active",
      userId: "usr_active",
      username: "act_user",
      email: "act@cacophony.local",
      role: "OPERATOR",
      provider: "local",
      accessTokenEnc: "token_act",
      expiresAt: new Date(Date.now() + 50000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repo.saveSession(expiredSession);
    await repo.saveSession(activeSession);

    const prunedCount = await repo.pruneExpiredSessions();
    assert.equal(prunedCount, 1);

    assert.equal(await repo.getSession("sess_expired"), null);
    assert.ok(await repo.getSession("sess_active"));
  });
});
