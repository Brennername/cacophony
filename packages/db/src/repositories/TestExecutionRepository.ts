import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export interface TestExecutionRecord {
  readonly id: string;
  readonly task_id: string | null;
  readonly session_id: string | null;
  readonly test_framework: string;
  readonly test_command: string;
  readonly scoped_files_json: string;
  readonly exit_code: number;
  readonly passed: boolean;
  readonly duration_ms: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly failed_assertions_json: string;
  readonly root_causes_json: string;
  readonly remediation_attempt: number;
  readonly created_at: string;
}

/**
 * TestExecutionRepository
 *
 * Persists test run telemetry, stdout/stderr, and structured failure analysis
 * for closed-loop remediation and quality audits.
 */
export class TestExecutionRepository {
  constructor(private readonly driver: IDatabaseDriver) {}

  public async recordRun(
    run: Omit<TestExecutionRecord, "created_at">
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.query(
      `INSERT INTO test_execution_runs (
        id, task_id, session_id, test_framework, test_command,
        scoped_files_json, exit_code, passed, duration_ms, stdout, stderr,
        failed_assertions_json, root_causes_json, remediation_attempt, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        run.id,
        run.task_id,
        run.session_id,
        run.test_framework,
        run.test_command,
        run.scoped_files_json,
        run.exit_code,
        run.passed,
        run.duration_ms,
        run.stdout,
        run.stderr,
        run.failed_assertions_json,
        run.root_causes_json,
        run.remediation_attempt,
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
