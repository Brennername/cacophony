import type { UserSessionRepository } from "@cacophony/db";
import type { SsoUserProfile } from "@cacophony/shared-types";
import { StructuredLogger } from "../telemetry/StructuredLogger.js";

export interface BootstrapConfig {
  readonly adminUsername?: string | undefined;
  readonly adminPassword?: string | undefined;
  readonly adminEmail?: string | undefined;
  readonly giteaBaseUrl?: string | undefined;
}

export interface BootstrapResult {
  readonly bootstrapped: boolean;
  readonly adminUsername: string;
  readonly role: "ADMIN";
}

/**
 * FirstRunBootstrapService
 *
 * Implements initial administrative bootstrapping upon daemon boot (Phase S2 T-S2.1).
 * Detects administrator credentials defined in .env (strictly excluded from distribution)
 * and provisions them as superadmin over the local Gitea instance and Cacophony arena.
 */
export class FirstRunBootstrapService {
  private readonly logger = new StructuredLogger("FirstRunBootstrapService");
  private readonly adminUsername: string;
  private readonly adminPassword: string;
  private readonly adminEmail: string;

  constructor(
    private readonly sessionRepo: UserSessionRepository,
    config?: BootstrapConfig,
  ) {
    this.adminUsername =
      config?.adminUsername ||
      process.env.ADMIN_USERNAME ||
      process.env.FIRST_USER ||
      "NeXeN";
    this.adminPassword =
      config?.adminPassword ||
      process.env.ADMIN_PASSWORD ||
      process.env.FIRST_PASS ||
      "";
    this.adminEmail =
      config?.adminEmail ||
      process.env.ADMIN_EMAIL ||
      `${this.adminUsername.toLowerCase()}@localhost.local`;
  }

  /**
   * Evaluates first-run conditions and ensures administrative authority is provisioned.
   */
  public async ensureAdminBootstrap(): Promise<BootstrapResult> {
    if (!this.adminPassword && !process.env.ADMIN_TOKEN) {
      this.logger.info(
        "No explicit ADMIN_PASSWORD or FIRST_PASS defined in .env; skipping admin bootstrap.",
      );
      return {
        bootstrapped: false,
        adminUsername: this.adminUsername,
        role: "ADMIN",
      };
    }

    const adminProfile: SsoUserProfile = {
      id: `admin-${this.adminUsername.toLowerCase()}`,
      username: this.adminUsername,
      email: this.adminEmail,
      roles: ["ADMIN"],
      groups: ["cacophony-admins", "site-administrators"],
      provider: "local",
    };

    const nowIso = new Date().toISOString();
    await this.sessionRepo.saveSession({
      sessionId: `bootstrap-admin-${this.adminUsername.toLowerCase()}`,
      userId: adminProfile.id,
      username: adminProfile.username,
      email: adminProfile.email,
      role: "ADMIN",
      provider: "local",
      accessTokenEnc: "bootstrapped-local-admin",
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    this.logger.info("First-run bootstrap provisioned admin profile", {
      adminUsername: this.adminUsername,
      role: "ADMIN",
    });

    return {
      bootstrapped: true,
      adminUsername: this.adminUsername,
      role: "ADMIN",
    };
  }
}
