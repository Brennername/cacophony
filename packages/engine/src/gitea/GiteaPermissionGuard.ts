import type {
  GiteaScope,
  GiteaAccessLevel,
  GiteaTokenPermissions,
  CacophonyGiteaRole
} from "@cacophony/shared-types";
import { ROLE_GITEA_PERMISSIONS } from "@cacophony/shared-types";

/**
 * Enforces least-privilege permission boundaries on Gitea API interactions.
 * Guarantees that callers (web views, review bots, autonomous implementers)
 * cannot exceed their assigned permission envelope.
 */
export class GiteaPermissionGuard {
  private readonly role: CacophonyGiteaRole;
  private readonly permissions: GiteaTokenPermissions;

  constructor(role: CacophonyGiteaRole, customPermissions?: Partial<GiteaTokenPermissions>) {
    this.role = role;
    const basePermissions = ROLE_GITEA_PERMISSIONS[role];
    this.permissions = {
      ...basePermissions,
      ...(customPermissions || {})
    };
  }

  /**
   * Returns current role for this guard.
   */
  public getRole(): CacophonyGiteaRole {
    return this.role;
  }

  /**
   * Returns the resolved permissions map for this guard instance.
   */
  public getPermissions(): GiteaTokenPermissions {
    return { ...this.permissions };
  }

  /**
   * Asserts that the role holds at least the required access level for a target scope.
   * Throws Error if unauthorized.
   */
  public assertScope(scope: GiteaScope, requiredLevel: "read" | "write"): void {
    const currentLevel: GiteaAccessLevel = this.permissions[scope];

    if (currentLevel === "none") {
      throw new Error(
        `Gitea Security Violation: Role '${this.role}' has 'none' access to scope '${scope}'. Required: '${requiredLevel}'.`
      );
    }

    if (requiredLevel === "write" && currentLevel !== "write") {
      throw new Error(
        `Gitea Security Violation: Role '${this.role}' has '${currentLevel}' access to scope '${scope}'. Required: 'write'.`
      );
    }
  }

  /**
   * Asserts that a target branch is safe to modify and is not a protected branch.
   */
  public assertBranchModificationPermitted(branchName: string): void {
    const normalized = branchName.trim().toLowerCase();
    const protectedPatterns = [
      "main",
      "master",
      "production",
      "release",
      "release/"
    ];

    const isProtected = protectedPatterns.some(
      (p) => normalized === p || (p.endsWith("/") && normalized.startsWith(p))
    );

    if (isProtected) {
      throw new Error(
        `Gitea Security Violation: Role '${this.role}' cannot directly push or commit to protected branch '${branchName}'. Modifications must occur on isolated feature/fix branches.`
      );
    }
  }
}
