import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { TaskRecord, TaskStatus, TaskPriority, AgentRole } from "@cacophony/shared-types";

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
  readonly log_snippet?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly completed_at: string | null;
  readonly duration_ms?: number | null;
  readonly tokens_per_sec?: number | null;
}

export class TaskRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

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

  public async getById(id: string): Promise<TaskRecord | null> {
    const row = await this.driver.queryOne<TaskRow>(
      "SELECT * FROM tasks WHERE id = $1",
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  public async getByTitle(title: string): Promise<TaskRecord | null> {
    const row = await this.driver.queryOne<TaskRow>(
      "SELECT * FROM tasks WHERE title = $1 LIMIT 1",
      [title]
    );
    return row ? this.mapRow(row) : null;
  }

  public async createIfNotExists(task: TaskRecord): Promise<{ created: boolean; task: TaskRecord }> {
    const existingById = await this.getById(task.id);
    if (existingById) {
      return { created: false, task: existingById };
    }
    const existingByTitle = await this.getByTitle(task.title);
    if (existingByTitle) {
      return { created: false, task: existingByTitle };
    }
    const created = await this.create(task);
    return { created: true, task: created };
  }

  public async updateStatus(
    id: string,
    status: TaskStatus,
    durationMs?: number,
    tokensPerSec?: number
  ): Promise<void> {
    const now = new Date().toISOString();
    const completedAt = (status === "COMPLETED" || status === "FAILED" || status === "CANCELLED") ? now : null;

    if (durationMs !== undefined && tokensPerSec !== undefined) {
      await this.driver.execute(
        "UPDATE tasks SET status = $1, updated_at = $2, completed_at = COALESCE($3, completed_at), duration_ms = $4, tokens_per_sec = $5 WHERE id = $6",
        [status, now, completedAt, durationMs, tokensPerSec, id]
      );
    } else if (durationMs !== undefined) {
      await this.driver.execute(
        "UPDATE tasks SET status = $1, updated_at = $2, completed_at = COALESCE($3, completed_at), duration_ms = $4 WHERE id = $5",
        [status, now, completedAt, durationMs, id]
      );
    } else {
      await this.driver.execute(
        "UPDATE tasks SET status = $1, updated_at = $2, completed_at = COALESCE($3, completed_at) WHERE id = $4",
        [status, now, completedAt, id]
      );
    }
  }

  public async updateModel(id: string, model: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.execute(
      "UPDATE tasks SET model_assigned = $1, updated_at = $2 WHERE id = $3",
      [model, now, id]
    );
  }

  public async updatePr(id: string, targetBranch: string, prUrl: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.execute(
      "UPDATE tasks SET target_branch = $1, pr_url = $2, updated_at = $3 WHERE id = $4",
      [targetBranch, prUrl, now, id]
    );
  }

  public async updateLogSnippet(id: string, logSnippet: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.execute(
      "UPDATE tasks SET log_snippet = $1, updated_at = $2 WHERE id = $3",
      [logSnippet, now, id]
    );
  }

  /**
   * Persists stage-decomposed progress between sub-stages without marking the overarching task
   * as completed or failed, enabling asynchronous stage handoffs across models.
   */
  public async updateStageState(
    taskId: string,
    stageName: string,
    stageState: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED",
    artifacts?: Record<string, any>
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    const snippet = artifacts
      ? `[Stage ${stageName}: ${stageState}] ${JSON.stringify(artifacts).slice(0, 500)}`
      : undefined;

    if (snippet) {
      await this.driver.execute(
        "UPDATE tasks SET updated_at = $1, log_snippet = $2 WHERE id = $3",
        [updatedAt, snippet, taskId]
      );
    } else {
      await this.driver.execute(
        "UPDATE tasks SET updated_at = $1 WHERE id = $2",
        [updatedAt, taskId]
      );
    }
  }

  public async incrementFailure(id: string): Promise<number> {
    const now = new Date().toISOString();
    await this.driver.execute(
      "UPDATE tasks SET failure_count = failure_count + 1, updated_at = $1 WHERE id = $2",
      [now, id]
    );
    const updated = await this.getById(id);
    return updated ? updated.failureCount : 0;
  }

  public async listPending(): Promise<readonly TaskRecord[]> {
    const rows = await this.driver.query<TaskRow>(
      `SELECT * FROM tasks
       WHERE status IN ('RUNNING', 'PENDING', 'REMEDIATING')
       ORDER BY
         CASE status WHEN 'RUNNING' THEN 0 ELSE 1 END ASC,
         CASE priority WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 ELSE 4 END ASC,
         created_at ASC`
    );
    return rows.map((r) => this.mapRow(r));
  }

  public async listRecent(limit = 50, filter?: { status?: TaskStatus }): Promise<readonly TaskRecord[]> {
    if (filter?.status) {
      const rows = await this.driver.query<TaskRow>(
        "SELECT * FROM tasks WHERE status = $1 ORDER BY updated_at DESC LIMIT $2",
        [filter.status, limit]
      );
      return rows.map((r) => this.mapRow(r));
    }
    const rows = await this.driver.query<TaskRow>(
      "SELECT * FROM tasks WHERE status IN ('COMPLETED', 'FAILED', 'REMEDIATING', 'CANCELLED') ORDER BY COALESCE(completed_at, updated_at) DESC LIMIT $1",
      [limit]
    );
    return rows.map((r) => this.mapRow(r));
  }

  public async deleteTask(id: string): Promise<boolean> {
    await this.driver.execute("DELETE FROM tasks WHERE id = $1", [id]);
    return true;
  }

  public async purgePendingTasks(titlePattern?: string): Promise<number> {
    if (titlePattern) {
      const res = await this.driver.execute(
        "DELETE FROM tasks WHERE status = 'PENDING' AND title LIKE $1",
        [titlePattern]
      );
      return res.rowsAffected ?? (res as any)?.affectedRows ?? 0;
    }
    const res = await this.driver.execute("DELETE FROM tasks WHERE status = 'PENDING'");
    return res.rowsAffected ?? (res as any)?.affectedRows ?? 0;
  }

  public async retryFailedTasks(pattern?: string, force = false): Promise<number> {
    const now = new Date().toISOString();
    if (pattern) {
      const res = await this.driver.execute(
        `UPDATE tasks SET status = 'PENDING', updated_at = $1, completed_at = NULL
         WHERE status = 'FAILED' AND (id LIKE $2 OR title LIKE $2) AND ($3 = 1 OR failure_count < 3)`,
        [now, pattern, force ? 1 : 0]
      );
      return res.rowsAffected ?? (res as any)?.affectedRows ?? 0;
    }
    const res = await this.driver.execute(
      `UPDATE tasks SET status = 'PENDING', updated_at = $1, completed_at = NULL
       WHERE status = 'FAILED' AND ($2 = 1 OR failure_count < 3)`,
      [now, force ? 1 : 0]
    );
    return res.rowsAffected ?? (res as any)?.affectedRows ?? 0;
  }

  public async reclaimStaleRunningTasks(timeoutMinutes = 15): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
    const res = await this.driver.execute(
      "UPDATE tasks SET status = 'PENDING', updated_at = $1 WHERE status = 'RUNNING' AND updated_at < $2",
      [new Date().toISOString(), cutoff]
    );
    return res.rowsAffected ?? (res as any)?.affectedRows ?? 0;
  }

  public async getRollingSuccessStats(sampleSize = 100): Promise<{
    sampleSize: number;
    successRate: number;
    completedCount: number;
    failedCount: number;
    trendDirection: "improving" | "declining" | "stable";
  }> {
    const rows = await this.driver.query<TaskRow>(
      "SELECT status FROM tasks WHERE status IN ('COMPLETED', 'FAILED') ORDER BY completed_at DESC LIMIT $1",
      [sampleSize]
    );
    const total = rows.length;
    if (total === 0) {
      return { sampleSize: 0, successRate: 100, completedCount: 0, failedCount: 0, trendDirection: "stable" };
    }
    const completed = rows.filter((r) => r.status === "COMPLETED").length;
    const failed = total - completed;
    const successRate = (completed / total) * 100;

    const mid = Math.floor(total / 2);
    let trendDirection: "improving" | "declining" | "stable" = "stable";
    if (mid > 0) {
      const older = rows.slice(mid);
      const newer = rows.slice(0, mid);
      const olderRate = older.filter((r) => r.status === "COMPLETED").length / older.length;
      const newerRate = newer.filter((r) => r.status === "COMPLETED").length / newer.length;
      if (newerRate > olderRate + 0.05) trendDirection = "improving";
      else if (newerRate < olderRate - 0.05) trendDirection = "declining";
    }

    return {
      sampleSize: total,
      successRate,
      completedCount: completed,
      failedCount: failed,
      trendDirection
    };
  }

  private mapRow(row: TaskRow): TaskRecord {

    const runtimeMetrics: { durationMs?: number; tokensPerSec?: number } = {};
    if (row.duration_ms != null) runtimeMetrics.durationMs = Number(row.duration_ms);
    if (row.tokens_per_sec != null) runtimeMetrics.tokensPerSec = Number(row.tokens_per_sec);

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
      logSnippet: row.log_snippet ? String(row.log_snippet) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      completedAt: row.completed_at ? String(row.completed_at) : null,
      ...runtimeMetrics
    };
  }
}
