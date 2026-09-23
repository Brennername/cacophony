import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { TaskRecord, TaskStatus, TaskPriority, AgentRole } from "@cacophony/shared-types";

/**
 * Raw database row shape for tasks table.
 */
interface TaskRow {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly role: string;
  readonly status: string;
  readonly priority: string;
  readonly model_assigned: string | null;
  readonly test_command: string | null;
  readonly focus_files: string | null;
  readonly target_branch: string | null;
  readonly pr_url: string | null;
  readonly failure_count: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly completed_at: string | null;
}

/**
 * TaskRepository
 *
 * Encapsulates all database operations for lifecycle tasks.
 * Converts raw SQL relational rows to strictly typed TaskRecord domain entities.
 */
export class TaskRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Persists a newly created task into the database.
   */
  public async create(task: TaskRecord): Promise<TaskRecord> {
    await this.driver.execute(
      `INSERT INTO tasks (
        id, title, prompt, role, status, priority, model_assigned,
        test_command, focus_files, target_branch, pr_url, failure_count,
        created_at, updated_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        task.id,
        task.title,
        task.prompt,
        task.role,
        task.status,
        task.priority,
        task.modelAssigned,
        task.testCommand,
        task.focusFiles,
        task.targetBranch,
        task.prUrl,
        task.failureCount,
        task.createdAt,
        task.updatedAt,
        task.completedAt
      ]
    );
    return task;
  }

  /**
   * Retrieves a task by its unique identifier.
   */
  public async getById(id: string): Promise<TaskRecord | null> {
    const row = await this.driver.queryOne<TaskRow>(
      "SELECT * FROM tasks WHERE id = $1",
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  /**
   * Updates task execution status and timestamp.
   */
  public async updateStatus(id: string, status: TaskStatus): Promise<void> {
    const now = new Date().toISOString();
    const completedAt = (status === "COMPLETED" || status === "FAILED" || status === "CANCELLED") ? now : null;

    await this.driver.execute(
      "UPDATE tasks SET status = $1, updated_at = $2, completed_at = COALESCE($3, completed_at) WHERE id = $4",
      [status, now, completedAt, id]
    );
  }

  /**
   * Assigns an inference model to the task.
   */
  public async updateModel(id: string, model: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.execute(
      "UPDATE tasks SET model_assigned = $1, updated_at = $2 WHERE id = $3",
      [model, now, id]
    );
  }

  /**
   * Links a Gitea Pull Request URL and target branch to the task.
   */
  public async updatePr(id: string, targetBranch: string, prUrl: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.execute(
      "UPDATE tasks SET target_branch = $1, pr_url = $2, updated_at = $3 WHERE id = $4",
      [targetBranch, prUrl, now, id]
    );
  }

  /**
   * Increments sequential failure counter for the task and returns new count.
   */
  public async incrementFailure(id: string): Promise<number> {
    const now = new Date().toISOString();
    await this.driver.execute(
      "UPDATE tasks SET failure_count = failure_count + 1, updated_at = $1 WHERE id = $2",
      [now, id]
    );
    const updated = await this.getById(id);
    return updated ? updated.failureCount : 0;
  }

  /**
   * Lists tasks currently awaiting dispatch, ordered by priority (P0 first) then age.
   */
  public async listPending(): Promise<readonly TaskRecord[]> {
    const rows = await this.driver.query<TaskRow>(
      `SELECT * FROM tasks 
       WHERE status IN ('PENDING', 'REMEDIATING')
       ORDER BY 
         CASE priority WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 ELSE 4 END ASC,
         created_at ASC`
    );
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Lists recent tasks with optional filtering for history tables.
   */
  public async listRecent(limit = 50, filter?: { status?: TaskStatus }): Promise<readonly TaskRecord[]> {
    if (filter?.status) {
      const rows = await this.driver.query<TaskRow>(
        "SELECT * FROM tasks WHERE status = $1 ORDER BY updated_at DESC LIMIT $2",
        [filter.status, limit]
      );
      return rows.map((r) => this.mapRow(r));
    }
    const rows = await this.driver.query<TaskRow>(
      "SELECT * FROM tasks ORDER BY updated_at DESC LIMIT $1",
      [limit]
    );
    return rows.map((r) => this.mapRow(r));
  }

  private mapRow(row: TaskRow): TaskRecord {
    return {
      id: row.id,
      title: row.title,
      prompt: row.prompt,
      role: row.role as AgentRole,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      modelAssigned: row.model_assigned,
      testCommand: row.test_command,
      focusFiles: row.focus_files,
      targetBranch: row.target_branch,
      prUrl: row.pr_url,
      failureCount: Number(row.failure_count),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      completedAt: row.completed_at ? String(row.completed_at) : null
    };
  }
}
