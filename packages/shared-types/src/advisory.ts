/**
 * Data contracts and interfaces for operator task queue advisory guidance
 * and automated review stage compliance audits.
 */

export type AdvisoryType = 'RECOMMENDATION' | 'CONSTRAINT' | 'INSTRUCTION';

export interface TaskAdvisoryGuidance {
  id: string;
  taskId: string;
  author: string;
  commentText: string;
  advisoryType: AdvisoryType;
  requiresComplianceAudit: boolean;
  createdAt: string;
}

export type ComplianceVerdict = 'COMPLIANT' | 'NON_COMPLIANT' | 'ADVISORY_QUESTION';

export interface ComplianceAuditItem {
  title: string;
  satisfied: boolean;
  feedback?: string | undefined;
  severity?: 'info' | 'warning' | 'blocker' | undefined;
}

export interface ComplianceReviewResult {
  verdict: ComplianceVerdict;
  notes: string;
  advisoryItems: ComplianceAuditItem[];
  isPausedForAdvisory: boolean;
  cooldownEndsAt?: string | undefined;
}
