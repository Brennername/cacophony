import { z } from "zod";

/**
 * Standard verdicts emitted by code review models.
 */
export const ReviewVerdictSchema = z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT"]);
export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>;

/**
 * Specialized domain review personas evaluating distinct dimensions of code quality.
 */
export const ReviewDomainPersonaSchema = z.enum([
  "SecurityAuditor",
  "ArchitectureAuditor",
  "DxUxAuditor",
]);
export type ReviewDomainPersona = z.infer<typeof ReviewDomainPersonaSchema>;

/**
 * Granular finding emitted by a domain reviewer persona.
 */
export interface PersonaFinding {
  readonly path: string;
  readonly lineNumber?: number | undefined;
  readonly ruleId?: string | undefined;
  readonly message: string;
  readonly severity: "info" | "warning" | "blocker";
  readonly suggestion?: string | undefined;
}

/**
 * Machine-parseable verdict produced by a specialized reviewer persona.
 */
export interface PersonaReviewResult {
  readonly persona: ReviewDomainPersona;
  readonly verdict: "APPROVE" | "REQUEST_CHANGES";
  readonly findings: readonly PersonaFinding[];
  readonly summary: string;
}

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

