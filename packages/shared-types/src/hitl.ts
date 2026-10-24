/**
 * @file hitl.ts
 * Type definitions for Human-in-the-Loop (HITL) gateway, contributor ticketing,
 * prompt slipstream sanitization, and GitHub issue discrimination.
 */

export type HitlTicketStatus =
  | "HITL_PENDING"
  | "ENQUEUED"
  | "IN_PROGRESS"
  | "REVIEW_PENDING"
  | "COMPLETED"
  | "REJECTED";

export type HitlTicketPriority = "P0" | "P1" | "P2";

export interface HitlTicketFeedback {
  readonly id: string;
  readonly author: string;
  readonly content: string;
  readonly createdAt: string;
  readonly status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  readonly reviewedAt?: string | null;
  readonly reviewedBy?: string | null;
}

export interface HitlTicketRecord {
  readonly id: string;
  readonly githubIssueNumber: number;
  readonly githubIssueId: number;
  readonly githubIssueUrl: string;
  readonly author: string;
  readonly authorAvatarUrl?: string | null;
  readonly title: string;
  readonly rawBody: string;
  readonly sanitizedPrompt?: string | null;
  readonly targetBranch: string;
  readonly labels: readonly string[];
  readonly status: HitlTicketStatus;
  readonly priority: HitlTicketPriority;
  readonly riskScore?: number | null;
  readonly flags?: readonly string[] | null;
  readonly focusFiles?: readonly string[] | null;
  readonly suggestedTestCommand?: string | null;
  readonly prNumber?: number | null;
  readonly associatedTaskId?: string | null;
  readonly rejectionReason?: string | null;
  readonly pendingFeedback?: readonly HitlTicketFeedback[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly approvedAt?: string | null;
  readonly approvedBy?: string | null;
}

export type AuthorClassification =
  | "INTERNAL_ADMIN"
  | "INTERNAL_BOT"
  | "EXTERNAL_CONTRIBUTOR";

export interface SlipstreamAnalysisResult {
  readonly safe: boolean;
  readonly riskLevel: "low" | "medium" | "high";
  readonly flaggedPatterns: readonly string[];
  readonly sanitizedContent: string;
  readonly recommendedFocusFiles: readonly string[];
  readonly recommendedTestCommand: string;
}

export interface CreateHitlTicketInput {
  readonly githubIssueNumber: number;
  readonly githubIssueId: number;
  readonly githubIssueUrl: string;
  readonly author: string;
  readonly authorAvatarUrl?: string | null | undefined;
  readonly title: string;
  readonly rawBody: string;
  readonly labels?: readonly string[] | undefined;
  readonly targetBranch?: string | undefined;
  readonly priority?: HitlTicketPriority | undefined;
}
