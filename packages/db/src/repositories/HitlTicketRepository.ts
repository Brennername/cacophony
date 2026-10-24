import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type {
  HitlTicketRecord,
  HitlTicketStatus,
  HitlTicketPriority,
  HitlTicketFeedback,
  CreateHitlTicketInput,
} from "@cacophony/shared-types";

interface HitlTicketRow {
  readonly id: string;
  readonly github_issue_number: number;
  readonly github_issue_id: string | number;
  readonly github_issue_url: string;
  readonly author: string;
  readonly author_avatar_url: string | null;
  readonly title: string;
  readonly raw_body: string;
  readonly sanitized_prompt: string | null;
  readonly target_branch: string;
  readonly labels_json: string;
  readonly status: string;
  readonly priority: string;
  readonly associated_task_id: string | null;
  readonly rejection_reason: string | null;
  readonly pending_feedback_json: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly approved_at: string | null;
  readonly approved_by: string | null;
}

/**
 * Repository managing persistent storage, retrieval, and status lifecycle of
 * Human-in-the-Loop (HITL) contributor tickets.
 */
export class HitlTicketRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  private mapRowToRecord(row: HitlTicketRow): HitlTicketRecord {
    let labels: readonly string[] = [];
    try {
      labels = JSON.parse(row.labels_json || "[]");
    } catch {
      labels = [];
    }

    let pendingFeedback: readonly HitlTicketFeedback[] = [];
    try {
      pendingFeedback = JSON.parse(row.pending_feedback_json || "[]");
    } catch {
      pendingFeedback = [];
    }

    return {
      id: row.id,
      githubIssueNumber: Number(row.github_issue_number),
      githubIssueId: Number(row.github_issue_id),
      githubIssueUrl: row.github_issue_url,
      author: row.author,
      authorAvatarUrl: row.author_avatar_url,
      title: row.title,
      rawBody: row.raw_body,
      sanitizedPrompt: row.sanitized_prompt,
      targetBranch: row.target_branch,
      labels,
      status: row.status as HitlTicketStatus,
      priority: row.priority as HitlTicketPriority,
      associatedTaskId: row.associated_task_id,
      rejectionReason: row.rejection_reason,
      pendingFeedback,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
    };
  }

  /**
   * Persists a newly discovered or created HITL ticket.
   */
  public async createTicket(input: CreateHitlTicketInput): Promise<HitlTicketRecord> {
    const id = `hitl-ticket-${input.githubIssueNumber}`;
    const now = new Date().toISOString();
    const isPostgres = this.driver.getDialect() === "postgres";
    const labelsJson = JSON.stringify(input.labels || []);
    const priority = input.priority || "P1";
    const targetBranch = input.targetBranch || "main";

    if (isPostgres) {
      await this.driver.execute(
        `INSERT INTO hitl_tickets (
          id, github_issue_number, github_issue_id, github_issue_url,
          author, author_avatar_url, title, raw_body, sanitized_prompt,
          target_branch, labels_json, status, priority, associated_task_id,
          rejection_reason, pending_feedback_json, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          raw_body = EXCLUDED.raw_body,
          labels_json = EXCLUDED.labels_json,
          updated_at = EXCLUDED.updated_at`,
        [
          id,
          input.githubIssueNumber,
          input.githubIssueId,
          input.githubIssueUrl,
          input.author,
          input.authorAvatarUrl ?? null,
          input.title,
          input.rawBody,
          null,
          targetBranch,
          labelsJson,
          "HITL_PENDING",
          priority,
          null,
          null,
          "[]",
          now,
          now,
        ],
      );
    } else {
      await this.driver.execute(
        `INSERT OR REPLACE INTO hitl_tickets (
          id, github_issue_number, github_issue_id, github_issue_url,
          author, author_avatar_url, title, raw_body, sanitized_prompt,
          target_branch, labels_json, status, priority, associated_task_id,
          rejection_reason, pending_feedback_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.githubIssueNumber,
          input.githubIssueId,
          input.githubIssueUrl,
          input.author,
          input.authorAvatarUrl ?? null,
          input.title,
          input.rawBody,
          null,
          targetBranch,
          labelsJson,
          "HITL_PENDING",
          priority,
          null,
          null,
          "[]",
          now,
          now,
        ],
      );
    }

    const created = await this.getById(id);
    if (!created) {
      throw new Error(`Failed to create HITL ticket '${id}'`);
    }
    return created;
  }

  /**
   * Retrieves a HITL ticket by its internal identifier.
   */
  public async getById(id: string): Promise<HitlTicketRecord | null> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const sql = isPostgres
      ? "SELECT * FROM hitl_tickets WHERE id = $1 LIMIT 1"
      : "SELECT * FROM hitl_tickets WHERE id = ? LIMIT 1";

    const rows = await this.driver.query<HitlTicketRow>(sql, [id]);
    if (rows.length === 0) return null;
    return this.mapRowToRecord(rows[0]!);
  }

  /**
   * Retrieves a ticket by upstream GitHub issue number.
   */
  public async getByGithubIssueNumber(
    issueNumber: number,
  ): Promise<HitlTicketRecord | null> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const sql = isPostgres
      ? "SELECT * FROM hitl_tickets WHERE github_issue_number = $1 LIMIT 1"
      : "SELECT * FROM hitl_tickets WHERE github_issue_number = ? LIMIT 1";

    const rows = await this.driver.query<HitlTicketRow>(sql, [issueNumber]);
    if (rows.length === 0) return null;
    return this.mapRowToRecord(rows[0]!);
  }

  /**
   * Lists tickets with optional filters by status or author.
   */
  public async listTickets(options?: {
    readonly status?: HitlTicketStatus | undefined;
    readonly author?: string | undefined;
    readonly limit?: number | undefined;
    readonly offset?: number | undefined;
  }): Promise<readonly HitlTicketRecord[]> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const clauses: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (options?.status) {
      clauses.push(isPostgres ? `status = $${pIdx++}` : "status = ?");
      params.push(options.status);
    }

    if (options?.author) {
      clauses.push(isPostgres ? `author = $${pIdx++}` : "author = ?");
      params.push(options.author);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const limitClause = isPostgres
      ? `LIMIT $${pIdx++} OFFSET $${pIdx++}`
      : "LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const sql = `SELECT * FROM hitl_tickets ${whereClause} ORDER BY created_at DESC ${limitClause}`;
    const rows = await this.driver.query<HitlTicketRow>(sql, params);
    return rows.map((r) => this.mapRowToRecord(r));
  }

  /**
   * Updates ticket lifecycle status, rejection reason, or active task reference.
   */
  public async updateStatus(
    id: string,
    status: HitlTicketStatus,
    metadata?: {
      readonly approvedBy?: string | undefined;
      readonly approvedAt?: string | undefined;
      readonly rejectionReason?: string | undefined;
      readonly associatedTaskId?: string | undefined;
      readonly sanitizedPrompt?: string | undefined;
    },
  ): Promise<void> {
    const now = new Date().toISOString();
    const isPostgres = this.driver.getDialect() === "postgres";

    if (isPostgres) {
      await this.driver.execute(
        `UPDATE hitl_tickets SET
          status = $1,
          updated_at = $2,
          approved_by = COALESCE($3, approved_by),
          approved_at = COALESCE($4, approved_at),
          rejection_reason = COALESCE($5, rejection_reason),
          associated_task_id = COALESCE($6, associated_task_id),
          sanitized_prompt = COALESCE($7, sanitized_prompt)
        WHERE id = $8`,
        [
          status,
          now,
          metadata?.approvedBy ?? null,
          metadata?.approvedAt ?? null,
          metadata?.rejectionReason ?? null,
          metadata?.associatedTaskId ?? null,
          metadata?.sanitizedPrompt ?? null,
          id,
        ],
      );
    } else {
      await this.driver.execute(
        `UPDATE hitl_tickets SET
          status = ?,
          updated_at = ?,
          approved_by = COALESCE(?, approved_by),
          approved_at = COALESCE(?, approved_at),
          rejection_reason = COALESCE(?, rejection_reason),
          associated_task_id = COALESCE(?, associated_task_id),
          sanitized_prompt = COALESCE(?, sanitized_prompt)
        WHERE id = ?`,
        [
          status,
          now,
          metadata?.approvedBy ?? null,
          metadata?.approvedAt ?? null,
          metadata?.rejectionReason ?? null,
          metadata?.associatedTaskId ?? null,
          metadata?.sanitizedPrompt ?? null,
          id,
        ],
      );
    }
  }

  /**
   * Appends a contributor feedback note to a ticket.
   */
  public async addFeedback(id: string, feedback: HitlTicketFeedback): Promise<void> {
    const ticket = await this.getById(id);
    if (!ticket) {
      throw new Error(`Ticket '${id}' not found`);
    }

    const updatedFeedback = [...(ticket.pendingFeedback || []), feedback];
    const now = new Date().toISOString();
    const isPostgres = this.driver.getDialect() === "postgres";

    const sql = isPostgres
      ? "UPDATE hitl_tickets SET pending_feedback_json = $1, updated_at = $2 WHERE id = $3"
      : "UPDATE hitl_tickets SET pending_feedback_json = ?, updated_at = ? WHERE id = ?";

    await this.driver.execute(sql, [JSON.stringify(updatedFeedback), now, id]);
  }
}
