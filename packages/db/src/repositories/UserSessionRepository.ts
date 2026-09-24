import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { UserRole, SsoProviderType } from "@cacophony/shared-types";

export interface UserSessionRecord {
  readonly sessionId: string;
  readonly userId: string;
  readonly username: string;
  readonly email: string;
  readonly role: UserRole;
  readonly provider: SsoProviderType;
  readonly accessTokenEnc: string;
  readonly refreshTokenEnc?: string | undefined;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface UserSessionRow {
  readonly session_id: string;
  readonly user_id: string;
  readonly username: string;
  readonly email: string;
  readonly role: string;
  readonly provider: string;
  readonly access_token_enc: string;
  readonly refresh_token_enc: string | null;
  readonly expires_at: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Repository managing persistent SSO user sessions and encrypted authentication tokens.
 */
export class UserSessionRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Saves or updates an active SSO user session.
   */
  public async saveSession(session: UserSessionRecord): Promise<void> {
    const isPostgres = this.driver.getDialect() === "postgres";
    if (isPostgres) {
      await this.driver.execute(
        `INSERT INTO user_sessions (
          session_id, user_id, username, email, role, provider,
          access_token_enc, refresh_token_enc, expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (session_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          provider = EXCLUDED.provider,
          access_token_enc = EXCLUDED.access_token_enc,
          refresh_token_enc = EXCLUDED.refresh_token_enc,
          expires_at = EXCLUDED.expires_at,
          updated_at = EXCLUDED.updated_at`,
        [
          session.sessionId,
          session.userId,
          session.username,
          session.email,
          session.role,
          session.provider,
          session.accessTokenEnc,
          session.refreshTokenEnc || null,
          session.expiresAt,
          session.createdAt,
          session.updatedAt
        ]
      );
    } else {
      await this.driver.execute(
        `INSERT OR REPLACE INTO user_sessions (
          session_id, user_id, username, email, role, provider,
          access_token_enc, refresh_token_enc, expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          session.sessionId,
          session.userId,
          session.username,
          session.email,
          session.role,
          session.provider,
          session.accessTokenEnc,
          session.refreshTokenEnc || null,
          session.expiresAt,
          session.createdAt,
          session.updatedAt
        ]
      );
    }
  }

  /**
   * Retrieves an active user session by session ID.
   */
  public async getSession(sessionId: string): Promise<UserSessionRecord | null> {
    const row = await this.driver.queryOne<UserSessionRow>(
      "SELECT * FROM user_sessions WHERE session_id = $1",
      [sessionId]
    );
    return row ? this.mapRow(row) : null;
  }

  /**
   * Retrieves all active sessions for a specific user ID.
   */
  public async getSessionsByUserId(userId: string): Promise<readonly UserSessionRecord[]> {
    const rows = await this.driver.query<UserSessionRow>(
      "SELECT * FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Deletes a user session (logout / revocation).
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    const res = await this.driver.execute(
      "DELETE FROM user_sessions WHERE session_id = $1",
      [sessionId]
    );
    return res.rowsAffected > 0;
  }

  /**
   * Prunes expired sessions.
   */
  public async pruneExpiredSessions(): Promise<number> {
    const nowIso = new Date().toISOString();
    const res = await this.driver.execute(
      "DELETE FROM user_sessions WHERE expires_at < $1",
      [nowIso]
    );
    return res.rowsAffected;
  }

  private mapRow(row: UserSessionRow): UserSessionRecord {
    return {
      sessionId: row.session_id,
      userId: row.user_id,
      username: row.username,
      email: row.email,
      role: row.role as UserRole,
      provider: row.provider as SsoProviderType,
      accessTokenEnc: row.access_token_enc,
      refreshTokenEnc: row.refresh_token_enc || undefined,
      expiresAt: String(row.expires_at),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }
}
