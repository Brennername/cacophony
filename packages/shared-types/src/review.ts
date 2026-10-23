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

/**
 * Domain category for specialized reviewer personas and advisory evaluation.
 */
export const AdvisoryDomainTagSchema = z.enum([
  "Security",
  "Authentication",
  "UX/UI",
  "Playwright E2E",
  "Architecture",
  "General",
]);
export type AdvisoryDomainTag = z.infer<typeof AdvisoryDomainTagSchema>;

/**
 * Individual comment within a PR discussion thread.
 */
export interface PrDiscussionComment {
  readonly id: number;
  readonly taskId: string;
  readonly prIndex: number;
  readonly threadId?: string | null | undefined;
  readonly authorName: string;
  readonly authorRole: string;
  readonly domainTag: AdvisoryDomainTag;
  readonly filePath?: string | null | undefined;
  readonly lineNumber?: number | null | undefined;
  readonly bodyContent: string;
  readonly isResolved: boolean;
  readonly createdAt: string;
  readonly updatedAt?: string | null | undefined;
}

/**
 * Grouped discussion thread spanning line-level reviews or general issue comments.
 */
export interface PrDiscussionThread {
  readonly threadId: string;
  readonly filePath?: string | null | undefined;
  readonly lineNumber?: number | null | undefined;
  readonly isResolved: boolean;
  readonly comments: readonly PrDiscussionComment[];
}

/**
 * Finding severity classification for independent PR assessment.
 */
export const FindingSeveritySchema = z.enum([
  "info",
  "low",
  "medium",
  "high",
  "critical",
  "blocker",
]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

/**
 * Finding category covering correctness, architecture, security, and quality gates.
 */
export const FindingCategorySchema = z.enum([
  "correctness",
  "security",
  "solid_principles",
  "performance",
  "style_conventions",
  "test_coverage",
  "type_safety",
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

/**
 * Actionable finding emitted by an independent code assessment model.
 */
export const AssessmentFindingSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  lineNumber: z.number().int().positive().optional(),
  endLineNumber: z.number().int().positive().optional(),
  category: FindingCategorySchema,
  severity: FindingSeveritySchema,
  message: z.string().min(1),
  evidence: z.string().optional(),
  rationale: z.string().optional(),
  deterministicFixHint: z.string().optional(),
  ruleId: z.string().optional(),
});
export type AssessmentFinding = z.infer<typeof AssessmentFindingSchema>;

/**
 * Structured assessment report produced by an independent model for a specific PR head SHA.
 */
export const StructuredAssessmentReportSchema = z.object({
  id: z.string().min(1),
  workItemId: z.string().min(1),
  round: z.number().int().nonnegative().default(1),
  prId: z.number().int().positive().optional(),
  prUrl: z.string().optional(),
  headSha: z.string().min(1),
  modelIdentity: z.string().min(1),
  verdict: ReviewVerdictSchema,
  summary: z.string().min(1),
  findings: z.array(AssessmentFindingSchema),
  testEvidence: z.string().nullable().optional(),
  ciOutcome: z.enum(["success", "failure", "pending", "skipped"]).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type StructuredAssessmentReport = z.infer<typeof StructuredAssessmentReportSchema>;


