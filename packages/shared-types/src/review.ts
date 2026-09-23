import { z } from "zod";

/**
 * Standard verdicts emitted by code review models.
 */
export const ReviewVerdictSchema = z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT"]);
export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>;

/**
 * Granular line-level comment produced during diff evaluation.
 */
export interface ReviewComment {
  readonly path: string;
  readonly lineNumber: number;
  readonly comment: string;
  readonly severity: "info" | "warning" | "blocker";
}

/**
 * Persistent review record stored in database and posted to Gitea.
 */
export interface PrReviewRecord {
  readonly id: number;
  readonly taskId: string;
  readonly giteaPrId: number;
  readonly reviewerModel: string;
  readonly verdict: ReviewVerdict;
  readonly reviewNotes: string;
  readonly comments: readonly ReviewComment[];
  readonly diffAnalyzed: string;
  readonly createdAt: string;
}
