import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GitCheckpointService } from "../git/GitCheckpointService.js";
import type { GitCheckpointRecord } from "@cacophony/db";

describe("GitCheckpointService Unit Test Suite (T102.3.6)", () => {
  const service = new GitCheckpointService();

  describe("Automated Checkpoint Intervals", () => {
    it("should report interval elapsed when elapsed time exceeds configured interval", () => {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const fiveMinuteInterval = 5 * 60 * 1000;

      const elapsed = service.isIntervalElapsed(tenMinutesAgo, fiveMinuteInterval);
      assert.equal(elapsed, true);
    });

    it("should report interval not elapsed when recent checkpoint exists within window", () => {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      const fiveMinuteInterval = 5 * 60 * 1000;

      const elapsed = service.isIntervalElapsed(twoMinutesAgo, fiveMinuteInterval);
      assert.equal(elapsed, false);
    });

    it("should handle ISO string timestamps and invalid timestamps gracefully", () => {
      const pastIso = new Date(Date.now() - 3600000).toISOString();
      assert.equal(service.isIntervalElapsed(pastIso, 60000), true);

      // Invalid date should default to elapsed (allow checkpoint creation)
      assert.equal(service.isIntervalElapsed("not-a-valid-date"), true);
    });
  });

  describe("Hash Deduplication", () => {
    it("should detect duplicate commit hash matching last recorded checkpoint", () => {
      const currentHash = "a1b2c3d4e5f6789012345678901234567890abcd";
      const previousHash = "a1b2c3d4e5f6789012345678901234567890abcd";

      const isDuplicate = service.shouldDeduplicate(currentHash, previousHash);
      assert.equal(isDuplicate, true);
    });

    it("should ignore case when deduplicating git SHA hashes", () => {
      const currentHash = "A1B2C3D4";
      const previousHash = "a1b2c3d4";

      const isDuplicate = service.shouldDeduplicate(currentHash, previousHash);
      assert.equal(isDuplicate, true);
    });

    it("should return false when hashes differ or either is null/empty", () => {
      assert.equal(service.shouldDeduplicate("hash1", "hash2"), false);
      assert.equal(service.shouldDeduplicate("hash1", null), false);
      assert.equal(service.shouldDeduplicate("", "hash2"), false);
      assert.equal(service.shouldDeduplicate("", null), false);
    });
  });

  describe("Retention Pruning", () => {
    const mockCheckpoints: GitCheckpointRecord[] = [
      {
        id: "chk-1",
        session_id: "s1",
        task_id: "t1",
        commit_hash: "hash-1",
        parent_hash: null,
        branch: "master",
        message: "First commit",
        files_changed_json: "[]",
        is_reverted: false,
        created_at: new Date(Date.now() - 50000).toISOString(),
      },
      {
        id: "chk-2",
        session_id: "s1",
        task_id: "t2",
        commit_hash: "hash-2",
        parent_hash: "hash-1",
        branch: "master",
        message: "Second commit",
        files_changed_json: "[]",
        is_reverted: false,
        created_at: new Date(Date.now() - 30000).toISOString(),
      },
      {
        id: "chk-3",
        session_id: "s1",
        task_id: "t3",
        commit_hash: "hash-3",
        parent_hash: "hash-2",
        branch: "master",
        message: "Third commit",
        files_changed_json: "[]",
        is_reverted: false,
        created_at: new Date(Date.now() - 10000).toISOString(),
      },
    ];

    it("should prune oldest checkpoints exceeding max retention count", () => {
      const survivors = service.pruneCheckpoints(mockCheckpoints, 2);
      assert.equal(survivors.length, 2);
      // Newest should survive: chk-3, chk-2
      assert.equal(survivors[0]?.id, "chk-3");
      assert.equal(survivors[1]?.id, "chk-2");
    });

    it("should prune checkpoints older than maxAgeMs", () => {
      // Retain max 5, but max age 20 seconds (20,000ms)
      const survivors = service.pruneCheckpoints(mockCheckpoints, 5, 20000);
      assert.equal(survivors.length, 1);
      assert.equal(survivors[0]?.id, "chk-3");
    });
  });

  describe("Diff Fallback", () => {
    it("should return fallback message when workspace root or diff is unavailable", async () => {
      const diff = await service.getCheckpointDiff("/invalid/nonexistent/path", "bogus-hash");
      assert.equal(diff, "Diff unavailable.");
    });
  });
});
