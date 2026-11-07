import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type {
  TaskAdvisoryGuidance,
  AdvisoryType,
} from "@cacophony/shared-types";
import { randomUUID } from "node:crypto";

interface TaskAdvisoryGuidanceRow {
  readonly id: string;
  readonly task_id: string;
  readonly author: string;
  readonly comment_text: string;
  readonly advisory_type: string;
  readonly requires_compliance_audit: boolean | number;
  readonly created_at: string;
}

export interface CreateTaskAdvisoryGuidanceInput {
  readonly id?: string | undefined;
  readonly taskId: string;
  readonly author: string;
  readonly commentText: string;
  readonly advisoryType?: AdvisoryType | undefined;
  readonly requiresComplianceAudit?: boolean | undefined;
  readonly createdAt?: string | undefined;
}

/**
 * Repository managing operator guidance, recommendations, constraints,
 * and review compliance instructions attached to queued tasks.
 */
export class TaskAdvisoryRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  private mapRowToRecord(row: TaskAdvisoryGuidanceRow): TaskAdvisoryGuidance {
    return {
      id: row.id,
      taskId: row.task_id,
      author: row.author,
      commentText: row.comment_text,
      advisoryType: row.advisory_type as AdvisoryType,
      requiresComplianceAudit: Boolean(row.requires_compliance_audit),
      createdAt: row.created_at,
    };
  }

  /**
   * Records operator advisory guidance on a queued task.
   */
  public async createGuidance(
    input: CreateTaskAdvisoryGuidanceInput,
  ): Promise<TaskAdvisoryGuidance> {
    const id = input.id || `tag_${randomUUID()}`;
    const now = input.createdAt || new Date().toISOString();
    const advisoryType = input.advisoryType || "INSTRUCTION";
    const requiresAudit =
      input.requiresComplianceAudit !== undefined
        ? input.requiresComplianceAudit
        : true;
    const isPostgres = this.driver.getDialect() === "postgres";

    if (isPostgres) {
      await this.driver.execute(
        `INSERT INTO task_advisory_guidance (
          id, task_id, author, comment_text, advisory_type,
          requires_compliance_audit, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          input.taskId,
          input.author,
          input.commentText,
          advisoryType,
          requiresAudit,
          now,
        ],
      );
    } else {
      await this.driver.execute(
        `INSERT INTO task_advisory_guidance (
          id, task_id, author, comment_text, advisory_type,
          requires_compliance_audit, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.taskId,
          input.author,
          input.commentText,
          advisoryType,
          requiresAudit ? 1 : 0,
          now,
        ],
      );
    }

    return {
      id,
      taskId: input.taskId,
      author: input.author,
      commentText: input.commentText,
      advisoryType,
      requiresComplianceAudit: requiresAudit,
      createdAt: now,
    };
  }

  /**
   * Retrieves all advisory guidance comments attached to a specific task.
   */
  public async getGuidanceForTask(
    taskId: string,
  ): Promise<readonly TaskAdvisoryGuidance[]> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const sql = isPostgres
      ? `SELECT * FROM task_advisory_guidance
         WHERE task_id = $1
         ORDER BY created_at ASC`
      : `SELECT * FROM task_advisory_guidance
         WHERE task_id = ?
         ORDER BY created_at ASC`;

    const rows = await this.driver.query<TaskAdvisoryGuidanceRow>(sql, [
      taskId,
    ]);
    return rows.map((row) => this.mapRowToRecord(row));
  }

  /**
   * Retrieves an advisory guidance record by its identifier.
   */
  public async getGuidanceById(
    id: string,
  ): Promise<TaskAdvisoryGuidance | null> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const sql = isPostgres
      ? `SELECT * FROM task_advisory_guidance WHERE id = $1 LIMIT 1`
      : `SELECT * FROM task_advisory_guidance WHERE id = ? LIMIT 1`;

    const row = await this.driver.queryOne<TaskAdvisoryGuidanceRow>(sql, [id]);
    return row ? this.mapRowToRecord(row) : null;
  }

  /**
   * Removes an advisory guidance record prior to task dispatch.
   */
  public async deleteGuidance(id: string): Promise<boolean> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const sql = isPostgres
      ? `DELETE FROM task_advisory_guidance WHERE id = $1`
      : `DELETE FROM task_advisory_guidance WHERE id = ?`;

    const result = await this.driver.execute(sql, [id]);
    return (result.rowsAffected ?? 0) > 0;
  }

  /**
   * Checks whether a task has any active compliance guidance requiring audit.
   */
  public async hasAdvisoryGuidance(taskId: string): Promise<boolean> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const sql = isPostgres
      ? `SELECT 1 FROM task_advisory_guidance WHERE task_id = $1 LIMIT 1`
      : `SELECT 1 FROM task_advisory_guidance WHERE task_id = ? LIMIT 1`;

    const row = await this.driver.queryOne<{ 1: number }>(sql, [taskId]);
    return Boolean(row);
  }
}
