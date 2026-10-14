// packages/engine/src/tests/auth_service.test.ts

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { AuthService } from "../auth/AuthService.js";
import type { AuthContext } from "@cacophony/shared-types";

describe("T74.2.3: AuthService Role Resolution and Hierarchy Authorization", () => {
  const authService = new AuthService();

  it("should resolve primary role as ADMIN for admin groups or roles", () => {
    assert.equal(authService.resolvePrimaryRole(["admin"], []), "ADMIN");
    assert.equal(authService.resolvePrimaryRole([], ["cacophony-admins"]), "ADMIN");
    assert.equal(authService.resolvePrimaryRole(["developer"], ["admin"]), "ADMIN");
  });

  it("should resolve primary role as OPERATOR for operator/developer groups or roles", () => {
    assert.equal(authService.resolvePrimaryRole(["operator"], []), "OPERATOR");
    assert.equal(authService.resolvePrimaryRole([], ["cacophony-operators"]), "OPERATOR");
    assert.equal(authService.resolvePrimaryRole(["developer"], []), "OPERATOR");
  });

  it("should resolve primary role as VIEWER by default or for viewer groups", () => {
    assert.equal(authService.resolvePrimaryRole(["viewer"], []), "VIEWER");
    assert.equal(authService.resolvePrimaryRole([], ["guest"]), "VIEWER");
    assert.equal(authService.resolvePrimaryRole([], []), "VIEWER");
  });

  it("should enforce authorization hierarchy across VIEWER, OPERATOR, and ADMIN roles", () => {
    const viewerCtx: AuthContext = {
      userId: "user-1",
      username: "alice",
      email: "alice@cacophony.local",
      role: "VIEWER",
      provider: "local",
      groups: ["viewer"],
    };

    const operatorCtx: AuthContext = {
      userId: "user-2",
      username: "bob",
      email: "bob@cacophony.local",
      role: "OPERATOR",
      provider: "local",
      groups: ["developer"],
    };

    const adminCtx: AuthContext = {
      userId: "user-3",
      username: "charlie",
      email: "charlie@cacophony.local",
      role: "ADMIN",
      provider: "local",
      groups: ["admin"],
    };

    // VIEWER can view, but cannot mutate (requires OPERATOR or ADMIN)
    assert.equal(authService.isAuthorized(viewerCtx, "VIEWER"), true);
    assert.equal(authService.isAuthorized(viewerCtx, "OPERATOR"), false);
    assert.equal(authService.isAuthorized(viewerCtx, "ADMIN"), false);

    // OPERATOR can view and perform operations, but cannot perform ADMIN-only operations
    assert.equal(authService.isAuthorized(operatorCtx, "VIEWER"), true);
    assert.equal(authService.isAuthorized(operatorCtx, "OPERATOR"), true);
    assert.equal(authService.isAuthorized(operatorCtx, "ADMIN"), false);

    // ADMIN has all permissions
    assert.equal(authService.isAuthorized(adminCtx, "VIEWER"), true);
    assert.equal(authService.isAuthorized(adminCtx, "OPERATOR"), true);
    assert.equal(authService.isAuthorized(adminCtx, "ADMIN"), true);

    // Null context is never authorized
    assert.equal(authService.isAuthorized(null, "VIEWER"), false);
    assert.equal(authService.isAuthorized(null, "OPERATOR"), false);
  });
});
