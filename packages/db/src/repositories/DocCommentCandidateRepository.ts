import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type {
  DocCommentCandidate,
  DocCommentStatus,
} from "@cacophony/shared-types";
import { randomUUID } from "node:crypto";

interface DocCommentCandidateRow {
  readonly id: string;
  readonly function_identifier: string;
  readonly file_path: string;
  readonly candidate_text: string;
  readonly user_guidance: string | null;
  readonly status: string;
  readonly model_id: string;
  readonly created_at: string;
  readonly accepted_at: string | null;
  readonly discarded_at: string | null;
}

export interface CreateDocCommentCandidateInput {
  readonly id?: string | undefined;
  readonly functionIdentifier: string;
  readonly filePath: string;
  readonly candidateText: string;
  readonly userGuidance?: string | undefined;
  readonly status?: DocCommentStatus | undefined;
  readonly modelId: string;
  readonly createdAt?: string | undefined;
}

/**
 * Repository managing persistence, selection states, and retention pruning
 * of synthesized function JSDoc/TSDoc comment candidates.
 */
export class DocCommentCandidateRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  private mapRowToRecord(row: DocCommentCandidateRow): DocCommentCandidate {
    return {
      id: row.id,
      functionIdentifier: row.function_identifier,
      filePath: row.file_path,
      candidateText: row.candidate_text,
      userGuidance: row.user_guidance ?? undefined,
      status: row.status as DocCommentStatus,
      modelId: row.model_id,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at ?? undefined,
      discardedAt: row.discarded_at ?? undefined,
    };
  }

  /**
   * Persists a newly generated doc comment candidate.
   */
  public async createCandidate(
    input: CreateDocCommentCandidateInput,
  ): Promise<DocCommentCandidate> {
    const id = input.id || `dcc_${randomUUID()}`;
    const now = input.createdAt || new Date().toISOString();
    const status = input.status || "PENDING";
    const isPostgres = this.driver.getDialect() === "postgres";

    if (isPostgres) {
      await this.driver.execute(
        `INSERT INTO doc_comment_candidates (
          id, function_identifier, file_path, candidate_text, user_guidance,
          status, model_id, created_at, accepted_at, discarded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          input.functionIdentifier,
          input.filePath,
          input.candidateText,
          input.userGuidance ?? null,
          status,
          input.modelId,
          now,
          null,
          null,
        ],
      );
    } else {
      await this.driver.execute(
        `INSERT INTO doc_comment_candidates (
          id, function_identifier, file_path, candidate_text, user_guidance,
          status, model_id, created_at, accepted_at, discarded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.functionIdentifier,
          input.filePath,
          input.candidateText,
          input.userGuidance ?? null,
          status,
          input.modelId,
          now,
          null,
          null,
        ],
      );
    }

    return {
      id,
      functionIdentifier: input.functionIdentifier,
      filePath: input.filePath,
      candidateText: input.candidateText,
      userGuidance: input.userGuidance,
      status,
      modelId: input.modelId,
      createdAt: now,
    };
  }

  /**
   * Retrieves a candidate by its unique identifier.
   */
  public async getCandidateById(
    id: string,
  ): Promise<DocCommentCandidate | null> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const sql = isPostgres
      ? `SELECT * FROM doc_comment_candidates WHERE id = $1 LIMIT 1`
      : `SELECT * FROM doc_comment_candidates WHERE id = ? LIMIT 1`;

    const row = await this.driver.queryOne<DocCommentCandidateRow>(sql, [id]);
    return row ? this.mapRowToRecord(row) : null;
  }

  /**
   * Retrieves all candidate comments for a specified function within a file,
   * sorted by creation time descending.
   */
  public async getCandidatesForFunction(
    filePath: string,
    functionIdentifier: string,
  ): Promise<readonly DocCommentCandidate[]> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const sql = isPostgres
      ? `SELECT * FROM doc_comment_candidates
         WHERE file_path = $1 AND function_identifier = $2
         ORDER BY created_at DESC`
      : `SELECT * FROM doc_comment_candidates
         WHERE file_path = ? AND function_identifier = ?
         ORDER BY created_at DESC`;

    const rows = await this.driver.query<DocCommentCandidateRow>(sql, [
      filePath,
      functionIdentifier,
    ]);
    return rows.map((row) => this.mapRowToRecord(row));
  }

  /**
   * Marks a candidate as accepted, sets accepted_at, and transitions
   * all other pending candidates for this function to discarded.
   */
  public async acceptCandidate(
    id: string,
  ): Promise<DocCommentCandidate | null> {
    const target = await this.getCandidateById(id);
    if (!target) {
      return null;
    }

    const now = new Date().toISOString();
    const isPostgres = this.driver.getDialect() === "postgres";

    if (isPostgres) {
      // Accept target candidate
      await this.driver.execute(
        `UPDATE doc_comment_candidates
         SET status = 'ACCEPTED', accepted_at = $1
         WHERE id = $2`,
        [now, id],
      );

      // Transition remaining pending candidates for this function to discarded
      await this.driver.execute(
        `UPDATE doc_comment_candidates
         SET status = 'DISCARDED', discarded_at = $1
         WHERE file_path = $2 AND function_identifier = $3 AND id != $4 AND status = 'PENDING'`,
        [now, target.filePath, target.functionIdentifier, id],
      );
    } else {
      await this.driver.execute(
        `UPDATE doc_comment_candidates
         SET status = 'ACCEPTED', accepted_at = ?
         WHERE id = ?`,
        [now, id],
      );

      await this.driver.execute(
        `UPDATE doc_comment_candidates
         SET status = 'DISCARDED', discarded_at = ?
         WHERE file_path = ? AND function_identifier = ? AND id != ? AND status = 'PENDING'`,
        [now, target.filePath, target.functionIdentifier, id],
      );
    }

    return {
      ...target,
      status: "ACCEPTED",
      acceptedAt: now,
    };
  }

  /**
   * Explicitly marks an individual candidate as discarded.
   */
  public async discardCandidate(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const isPostgres = this.driver.getDialect() === "postgres";

    const sql = isPostgres
      ? `UPDATE doc_comment_candidates
         SET status = 'DISCARDED', discarded_at = $1
         WHERE id = $2`
      : `UPDATE doc_comment_candidates
         SET status = 'DISCARDED', discarded_at = ?
         WHERE id = ?`;

    await this.driver.execute(sql, [now, id]);
    return true;
  }

  /**
   * Prunes discarded comment candidates older than the specified retention days.
   * Accepted comments are permanently retained for audit and history attribution.
   */
  public async pruneDiscardedCandidates(retentionDays = 7): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const isPostgres = this.driver.getDialect() === "postgres";

    if (isPostgres) {
      const result = await this.driver.execute(
        `DELETE FROM doc_comment_candidates
         WHERE status = 'DISCARDED'
           AND (discarded_at <= $1 OR (discarded_at IS NULL AND created_at <= $1))`,
        [cutoffDate],
      );
      return result.rowsAffected ?? 0;
    } else {
      const result = await this.driver.execute(
        `DELETE FROM doc_comment_candidates
         WHERE status = 'DISCARDED'
           AND (discarded_at <= ? OR (discarded_at IS NULL AND created_at <= ?))`,
        [cutoffDate],
      );
      return result.rowsAffected ?? 0;
    }
  }
}
