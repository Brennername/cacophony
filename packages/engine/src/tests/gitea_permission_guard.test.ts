import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GiteaPermissionGuard } from "../gitea/GiteaPermissionGuard.js";

describe("GiteaPermissionGuard Test Suite", () => {
  describe("Role Initialization and Permission Resolution", () => {
    it("should resolve base permissions for public_inspector role", () => {
      const guard = new GiteaPermissionGuard("public_inspector");
      assert.strictEqual(guard.getRole(), "public_inspector");

      const perms = guard.getPermissions();
      assert.strictEqual(perms.repository, "read");
      assert.strictEqual(perms.issue, "read");
      assert.strictEqual(perms.admin, "none");
      assert.strictEqual(perms.notification, "none");
    });

    it("should resolve base permissions for autonomous_implementer role", () => {
      const guard = new GiteaPermissionGuard("autonomous_implementer");
      assert.strictEqual(guard.getRole(), "autonomous_implementer");

      const perms = guard.getPermissions();
      assert.strictEqual(perms.repository, "write");
      assert.strictEqual(perms.issue, "write");
      assert.strictEqual(perms.notification, "read");
      assert.strictEqual(perms.admin, "none");
    });

    it("should allow partial custom permission overrides", () => {
      const guard = new GiteaPermissionGuard("public_inspector", {
        repository: "write",
        notification: "read",
      });

      const perms = guard.getPermissions();
      assert.strictEqual(perms.repository, "write");
      assert.strictEqual(perms.notification, "read");
      assert.strictEqual(perms.admin, "none");
    });
  });

  describe("Scope Access Enforcement", () => {
    it("should succeed when held access level meets or exceeds requirement", () => {
      const guard = new GiteaPermissionGuard("autonomous_implementer");

      // Required read on write scope succeeds
      assert.doesNotThrow(() => {
        guard.assertScope("repository", "read");
      });

      // Required write on write scope succeeds
      assert.doesNotThrow(() => {
        guard.assertScope("repository", "write");
      });
    });

    it("should reject access when role holds none access for the requested scope", () => {
      const guard = new GiteaPermissionGuard("public_inspector");

      assert.throws(
        () => guard.assertScope("admin", "read"),
        /Gitea Security Violation: Role 'public_inspector' has 'none' access to scope 'admin'. Required: 'read'./,
      );
    });

    it("should reject write access when role only holds read access", () => {
      const guard = new GiteaPermissionGuard("public_inspector");

      assert.throws(
        () => guard.assertScope("repository", "write"),
        /Gitea Security Violation: Role 'public_inspector' has 'read' access to scope 'repository'. Required: 'write'./,
      );
    });
  });

  describe("Protected Branch Safeguards", () => {
    it("should permit modifications on non-protected feature and fix branches", () => {
      const guard = new GiteaPermissionGuard("autonomous_implementer");

      const allowedBranches = [
        "feature/token-refresh",
        "fix/login-modal-alignment",
        "task/102-permissions",
        "sandbox/model-eval",
      ];

      for (const branch of allowedBranches) {
        assert.doesNotThrow(() => {
          guard.assertBranchModificationPermitted(branch);
        });
      }
    });

    it("should reject direct modifications to protected branches", () => {
      const guard = new GiteaPermissionGuard("autonomous_implementer");

      const protectedBranches = [
        "main",
        "master",
        "production",
        "release",
        "release/v1.0.0",
        "RELEASE/v2.1",
      ];

      for (const branch of protectedBranches) {
        assert.throws(
          () => guard.assertBranchModificationPermitted(branch),
          /Gitea Security Violation: Role 'autonomous_implementer' cannot directly push or commit to protected branch/,
        );
      }
    });
  });
});
