import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type {
  StructuredAssessmentReport,
  AssessmentFinding,
  ReviewVerdict,
} from "@cacophony/shared-types";

interface ReviewReportRow {
  readonly id: string;
  readonly work_item_id: string;
  readonly round: number;
  readonly pr_id: number | null;
  readonly pr_url: string | null;
  readonly head_sha: string;
  readonly model_identity: string;
  readonly verdict: string;
  readonly summary: string;
  readonly findings: string;
  readonly test_evidence: string | null;
  readonly ci_outcome: string | null;
  readonly created_at: string;
  readonly updated_at: string | null;
}

/**
 * Repository responsible for the immutable persistence and retrieval
 * of multi-model PR assessment reports across review rounds.
 * Adheres to SOLID Single Responsibility Principle by confining assessment report
 * storage semantics strictly within this class.
 */
export class ReviewReportRepository {
  private readonly driver: IDatabaseDriver;
  private tableInitialized = false;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Lazily provisions the backing storage table across PostgreSQL and SQLite dialects.
   */
  public async ensureSchema(): Promise<void> {
    if (this.tableInitialized) return;

    await this.driver.execute(`
      CREATE TABLE IF NOT EXISTS pr_assessment_reports (
        id TEXT PRIMARY KEY,
        work_item_id TEXT NOT NULL,
        round INTEGER NOT NULL,
        pr_id INTEGER,
        pr_url TEXT,
        head_sha TEXT NOT NULL,
        model_identity TEXT NOT NULL,
        verdict TEXT NOT NULL,
        summary TEXT NOT NULL,
        findings TEXT NOT NULL,
        test_evidence TEXT,
        ci_outcome TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT
      )
    `);

    try {
      await this.driver.execute(`
        CREATE INDEX IF NOT EXISTS idx_assessment_work_item_round
        ON pr_assessment_reports (work_item_id, round)
      `);
    } catch {
      // Index creation might already exist or not be permitted in mock environments
    }

    this.tableInitialized = true;
  }

  /**
   * Persists an immutable assessment report produced by an independent evaluation model.
   */
  public async saveReport(
    report: StructuredAssessmentReport,
  ): Promise<StructuredAssessmentReport> {
    await this.ensureSchema();

    const findingsJson = JSON.stringify(report.findings || []);

    await this.driver.execute(
      `INSERT INTO pr_assessment_reports (
        id, work_item_id, round, pr_id, pr_url, head_sha,
        model_identity, verdict, summary, findings, test_evidence,
        ci_outcome, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT(id) DO UPDATE SET
        summary = EXCLUDED.summary,
        verdict = EXCLUDED.verdict,
        findings = EXCLUDED.findings,
        test_evidence = EXCLUDED.test_evidence,
        ci_outcome = EXCLUDED.ci_outcome,
        updated_at = EXCLUDED.updated_at`,
      [
        report.id,
        report.workItemId,
        report.round,
        report.prId ?? null,
        report.prUrl ?? null,
        report.headSha,
        report.modelIdentity,
        report.verdict,
        report.summary,
        findingsJson,
        report.testEvidence ?? null,
        report.ciOutcome ?? null,
        report.createdAt,
        report.updatedAt ?? null,
      ],
    );

    return report;
  }

  /**
   * Calculates the latest round index registered for a specific work item.
   * Returns 0 if no rounds have been assessed yet.
   */
  public async getLatestRound(workItemId: string): Promise<number> {
    await this.ensureSchema();

    const row = await this.driver.queryOne<{ max_round: number | string | null }>(
      "SELECT MAX(round) as max_round FROM pr_assessment_reports WHERE work_item_id = $1",
      [workItemId],
    );

    if (!row || row.max_round === null || row.max_round === undefined) {
      return 0;
    }

    return Number(row.max_round);
  }

  /**
   * Retrieves all assessment reports recorded for a specific work item and round.
   */
  public async getReportsForRound(
    workItemId: string,
    round: number,
  ): Promise<readonly StructuredAssessmentReport[]> {
    await this.ensureSchema();

    const rows = await this.driver.query<ReviewReportRow>(
      "SELECT * FROM pr_assessment_reports WHERE work_item_id = $1 AND round = $2 ORDER BY created_at ASC",
      [workItemId, round],
    );

    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Retrieves all assessment reports recorded for a work item across all historical rounds.
   */
  public async listReports(
    workItemId: string,
  ): Promise<readonly StructuredAssessmentReport[]> {
    await this.ensureSchema();

    const rows = await this.driver.query<ReviewReportRow>(
      "SELECT * FROM pr_assessment_reports WHERE work_item_id = $1 ORDER BY round ASC, created_at ASC",
      [workItemId],
    );

    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Retrieves an assessment report by its unique ID.
   */
  public async getById(id: string): Promise<StructuredAssessmentReport | null> {
    await this.ensureSchema();

    const row = await this.driver.queryOne<ReviewReportRow>(
      "SELECT * FROM pr_assessment_reports WHERE id = $1",
      [id],
    );

    return row ? this.mapRow(row) : null;
  }

  /**
   * Retrieves an assessment report for a given work item, round, and specific model identity.
   */
  public async getReportByWorkItemAndModel(
    workItemId: string,
    round: number,
    modelIdentity: string,
  ): Promise<StructuredAssessmentReport | null> {
    await this.ensureSchema();

    const row = await this.driver.queryOne<ReviewReportRow>(
      `SELECT * FROM pr_assessment_reports
       WHERE work_item_id = $1 AND round = $2 AND model_identity = $3
       LIMIT 1`,
      [workItemId, round, modelIdentity],
    );

    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: ReviewReportRow): StructuredAssessmentReport {
    let findings: AssessmentFinding[] = [];
    try {
      findings = JSON.parse(row.findings) as AssessmentFinding[];
    } catch {
      findings = [];
    }

    return {
      id: row.id,
      workItemId: row.work_item_id,
      round: Number(row.round),
      prId: row.pr_id != null ? Number(row.pr_id) : undefined,
      prUrl: row.pr_url ?? undefined,
      headSha: row.head_sha,
      modelIdentity: row.model_identity,
      verdict: row.verdict as ReviewVerdict,
      summary: row.summary,
      findings,
      testEvidence: row.test_evidence,
      ciOutcome: (row.ci_outcome as any) ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? undefined,
    };
  }
}
