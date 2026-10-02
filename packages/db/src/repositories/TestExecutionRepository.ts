import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export interface TestExecutionRecord {
  readonly id: string;
  readonly task_id: string | null;
  readonly session_id: string | null;
  readonly test_framework: string;
  readonly test_command: string;
  readonly scoped_files_json: string;
  readonly exit_code: number;
  readonly passed_count: number;
  readonly failed_count: number;
  readonly stdout_snippet: string;
  readonly stderr_snippet: string;
  readonly status: "PASSED" | "FAILED";
  readonly duration_ms: number;
  readonly created_at: string;
}

export class TestExecutionRepository {
  constructor(private readonly driver: IDatabaseDriver) {}

  public async recordRun(
    run: Omit<TestExecutionRecord, "created_at">
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.query(
      `INSERT INTO test_execution_runs (
        id, task_id, session_id, test_framework, test_command,
        scoped_files_json, exit_code, passed_count, failed_count, stdout_snippet, stderr_snippet,
        status, duration_ms, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        run.id,
        run.task_id,
        run.session_id,
        run.test_framework,
        run.test_command,
        run.scoped_files_json,
        run.exit_code,
        run.passed_count,
        run.failed_count,
        run.stdout_snippet,
        run.stderr_snippet,
        run.status,
        run.duration_ms,
        now
      ]
    );
  }

  public async getLatestRunForTask(taskId: string): Promise<TestExecutionRecord | undefined> {
    const res = await this.driver.query<TestExecutionRecord>(
      `SELECT * FROM test_execution_runs WHERE task_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [taskId]
    );
    return res[0];
  }

  public async listRuns(taskId?: string, limit = 20): Promise<readonly TestExecutionRecord[]> {
    const query = taskId
      ? `SELECT * FROM test_execution_runs WHERE task_id = $1 ORDER BY created_at DESC LIMIT $2`
      : `SELECT * FROM test_execution_runs ORDER BY created_at DESC LIMIT $1`;
    const params = taskId ? [taskId, limit] : [limit];
    return this.driver.query<TestExecutionRecord>(query, params);
  }
}