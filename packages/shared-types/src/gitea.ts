import { z } from "zod";

/**
 * Gitea OAuth/API Scope enumeration matching official Gitea permission hierarchy.
 */
export const GiteaScopeEnum = z.enum([
  "activitypub",
  "admin",
  "issue",
  "misc",
  "notification",
  "organization",
  "package",
  "repository",
  "user"
]);

export type GiteaScope = z.infer<typeof GiteaScopeEnum>;

/**
 * Scope permission level.
 */
export const GiteaAccessLevelEnum = z.enum(["none", "read", "write"]);

export type GiteaAccessLevel = z.infer<typeof GiteaAccessLevelEnum>;

/**
 * Granular token permission map specifying access levels for each Gitea scope.
 */
export const GiteaTokenPermissionsSchema = z.object({
  activitypub: GiteaAccessLevelEnum.default("none"),
  admin: GiteaAccessLevelEnum.default("none"),
  issue: GiteaAccessLevelEnum.default("none"),
  misc: GiteaAccessLevelEnum.default("read"),
  notification: GiteaAccessLevelEnum.default("none"),
  organization: GiteaAccessLevelEnum.default("none"),
  package: GiteaAccessLevelEnum.default("none"),
  repository: GiteaAccessLevelEnum.default("none"),
  user: GiteaAccessLevelEnum.default("read")
});

export type GiteaTokenPermissions = z.infer<typeof GiteaTokenPermissionsSchema>;

/**
 * Subsystem / Agent Role classification for least-privilege permission guardrails.
 */
export const CacophonyGiteaRoleEnum = z.enum([
  "public_inspector",
  "qa_reviewer",
  "autonomous_implementer",
  "bootstrapper_admin"
]);

export type CacophonyGiteaRole = z.infer<typeof CacophonyGiteaRoleEnum>;

/**
 * Canonical least-privilege guardrail permission profiles for Cacophony roles.
 */
export const ROLE_GITEA_PERMISSIONS: Readonly<Record<CacophonyGiteaRole, GiteaTokenPermissions>> = {
  public_inspector: {
    activitypub: "none",
    admin: "none",
    issue: "read",
    misc: "read",
    notification: "none",
    organization: "none",
    package: "none",
    repository: "read",
    user: "read"
  },
  qa_reviewer: {
    activitypub: "none",
    admin: "none",
    issue: "read",
    misc: "read",
    notification: "read",
    organization: "read",
    package: "read",
    repository: "read",
    user: "read"
  },
  autonomous_implementer: {
    activitypub: "none",
    admin: "none",
    issue: "write",
    misc: "read",
    notification: "read",
    organization: "none",
    package: "read",
    repository: "write",
    user: "read"
  },
  bootstrapper_admin: {
    activitypub: "none",
    admin: "write",
    issue: "write",
    misc: "write",
    notification: "write",
    organization: "write",
    package: "write",
    repository: "write",
    user: "write"
  }
};
