import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { PrReviewRecord, ReviewVerdict } from "@cacophony/shared-types";

interface PrReviewRow {
  readonly id: number;
  readonly task_id: string;
  readonly gitea_pr_id: number;
  readonly reviewer_model: string;
  readonly verdict: string;
  readonly review_notes: string;
  readonly diff_analyzed: string;
  readonly created_at: string;
}

/**
 * Repository managing persistence and auditability of automated Pull Request reviews.
 */
export class PrReviewRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Persists a review record in the pr_reviews database table.
   */
  public async recordReview(
    review: Omit<PrReviewRecord, "id" | "createdAt" | "comments"> & {
      readonly comments?: readonly any[] | undefined;
      readonly createdAt?: string | undefined;
    },
  ): Promise<PrReviewRecord> {
    const createdAt = review.createdAt || new Date().toISOString();

    if (this.driver.getDialect() === "postgres") {
      const row = await this.driver.queryOne<{ id: number }>(
        `INSERT INTO pr_reviews (
          task_id, gitea_pr_id, reviewer_model, verdict, review_notes, diff_analyzed, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          review.taskId,
          review.giteaPrId,
          review.reviewerModel,
          review.verdict,
          review.reviewNotes,
          review.diffAnalyzed,
          createdAt,
        ],
      );
      return {
        id: Number(row?.id),
        taskId: review.taskId,
        giteaPrId: review.giteaPrId,
        reviewerModel: review.reviewerModel,
        verdict: review.verdict,
        reviewNotes: review.reviewNotes,
        comments: review.comments || [],
        diffAnalyzed: review.diffAnalyzed,
        createdAt,
      };
    }

    await this.driver.execute(
      `INSERT INTO pr_reviews (
        task_id, gitea_pr_id, reviewer_model, verdict, review_notes, diff_analyzed, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        review.taskId,
        review.giteaPrId,
        review.reviewerModel,
        review.verdict,
        review.reviewNotes,
        review.diffAnalyzed,
        createdAt,
      ],
    );
    const row = await this.driver.queryOne<{ id: number }>(
      "SELECT last_insert_rowid() AS id",
    );
    return {
      id: Number(row?.id),
      taskId: review.taskId,
      giteaPrId: review.giteaPrId,
      reviewerModel: review.reviewerModel,
      verdict: review.verdict,
      reviewNotes: review.reviewNotes,
      comments: review.comments || [],
      diffAnalyzed: review.diffAnalyzed,
      createdAt,
    };
  }

  /**
   * Retrieves a review record from the pr_reviews database table by its ID.
   */
  public async getReviewById(id: number): Promise<PrReviewRecord | null> {
    const row = await this.driver.queryOne<PrReviewRow>(
      "SELECT * FROM pr_reviews WHERE id = $1",
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  /**
   * Retrieves all reviews associated with a task ID.
   */
  public async getReviewsByTaskId(taskId: string): Promise<PrReviewRecord[]> {
    const rows = await this.driver.query<PrReviewRow>(
      "SELECT * FROM pr_reviews WHERE task_id = $1 ORDER BY created_at DESC",
      [taskId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Retrieves the most recent review for a Gitea PR index.
   */
  public async getLatestReviewForPr(
    giteaPrId: number,
  ): Promise<PrReviewRecord | null> {
    const row = await this.driver.queryOne<PrReviewRow>(
      "SELECT * FROM pr_reviews WHERE gitea_pr_id = $1 ORDER BY created_at DESC LIMIT 1",
      [giteaPrId],
    );
    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: PrReviewRow): PrReviewRecord {
    return {
      id: Number(row.id),
      taskId: row.task_id,
      giteaPrId: Number(row.gitea_pr_id),
      reviewerModel: row.reviewer_model,
      verdict: row.verdict as ReviewVerdict,
      reviewNotes: row.review_notes,
      comments: [],
      diffAnalyzed: row.diff_analyzed,
      createdAt: String(row.created_at),
    };
  }
}
