import type { AdvisoryDomainTag } from "@cacophony/shared-types";
import type { PrDiscussionRepository } from "@cacophony/db";

export interface DomainCheckIn {
  readonly domain: AdvisoryDomainTag;
  readonly authorName: string;
  readonly status: "APPROVED" | "REQUEST_CHANGES" | "INFO";
  readonly feedbackNotes: string;
  readonly checkedInAt?: string | undefined;
}

export interface HeldPrState {
  readonly taskId: string;
  readonly prNumber: number;
  readonly requiredDomains: readonly AdvisoryDomainTag[];
  readonly checkIns: Map<AdvisoryDomainTag, DomainCheckIn>;
  readonly heldAt: number;
  mergeApproved: boolean;
  synthesisCompleted: boolean;
}

export interface PrMergeGateCoordinatorOptions {
  readonly defaultRequiredDomains?: readonly AdvisoryDomainTag[] | undefined;
  readonly discussionRepo?: PrDiscussionRepository | undefined;
  readonly holdTimeoutMs?: number | undefined;
}

/**
 * PrMergeGateCoordinator
 *
 * Implements Phase 108 (T108.7):
 * Coordinates resource-paced asynchronous PR merge gating:
 * 1. Holds PRs from premature auto-merge while allowing the scheduler to proceed with other tasks.
 * 2. Allows heavy evaluations (like Playwright E2E suites) and domain models (Security, Auth, UX/UI)
 *    to queue and check in without exhausting Vega APU or host RAM.
 * 3. Aggregates domain review feedback and, once all required domains check in, triggers a final model
 *    synthesis round to resolve feedback before authorizing PR merge.
 */
export class PrMergeGateCoordinator {
  private readonly heldPrs = new Map<string, HeldPrState>();
  private readonly defaultRequiredDomains: readonly AdvisoryDomainTag[];
  private readonly discussionRepo?: PrDiscussionRepository | undefined;
  private readonly holdTimeoutMs: number;

  constructor(options: PrMergeGateCoordinatorOptions = {}) {
    this.defaultRequiredDomains = options.defaultRequiredDomains ?? [
      "Security",
      "UX/UI",
      "Architecture",
    ];
    this.discussionRepo = options.discussionRepo;
    this.holdTimeoutMs = options.holdTimeoutMs ?? 600_000; // 10 minutes default
  }

  /**
   * Returns the underlying PR discussion repository if configured.
   */
  public getDiscussionRepository(): PrDiscussionRepository | undefined {
    return this.discussionRepo;
  }

  /**
   * Evaluates whether a PR should be held from immediate merge for async review evaluations.
   */
  public shouldHoldPr(taskId: string, forceImmediateMerge = false): boolean {
    if (forceImmediateMerge) return false;
    const existing = this.heldPrs.get(taskId);
    if (existing?.mergeApproved) return false;
    return true;
  }

  /**
   * Registers a PR as held, awaiting domain review check-ins and asynchronous evaluations.
   */
  public holdPr(
    taskId: string,
    prNumber: number,
    requiredDomains?: readonly AdvisoryDomainTag[],
  ): HeldPrState {
    const domains =
      requiredDomains !== undefined
        ? requiredDomains
        : this.defaultRequiredDomains;
    const isAutoApproved = domains.length === 0;
    const state: HeldPrState = {
      taskId,
      prNumber,
      requiredDomains: domains,
      checkIns: new Map(),
      heldAt: Date.now(),
      mergeApproved: isAutoApproved,
      synthesisCompleted: isAutoApproved,
    };
    this.heldPrs.set(taskId, state);
    return state;
  }

  /**
   * Records a domain check-in (e.g. Security, Auth, UX/UI, Playwright E2E) on a held PR.
   */
  public recordCheckIn(taskId: string, checkIn: DomainCheckIn): boolean {
    const state = this.heldPrs.get(taskId);
    if (!state) return false;

    state.checkIns.set(checkIn.domain, {
      ...checkIn,
      checkedInAt: checkIn.checkedInAt ?? new Date().toISOString(),
    });

    // If all required domains checked in and all are approved or info, auto-approve merge
    if (this.areAllDomainsCheckedIn(taskId) && !this.hasBlockingFeedback(taskId)) {
      state.mergeApproved = true;
    }

    return true;
  }

  /**
   * Checks if all required domain evaluations have reported back.
   */
  public areAllDomainsCheckedIn(taskId: string): boolean {
    const state = this.heldPrs.get(taskId);
    if (!state) return false;
    if (state.requiredDomains.length === 0) return true;
    return state.requiredDomains.every((domain) => state.checkIns.has(domain));
  }

  /**
   * Checks if any checking-in domain requested changes or flagged blockers.
   */
  public hasBlockingFeedback(taskId: string): boolean {
    const state = this.heldPrs.get(taskId);
    if (!state) return false;
    for (const checkIn of state.checkIns.values()) {
      if (checkIn.status === "REQUEST_CHANGES") return true;
    }
    return false;
  }

  /**
   * Determines if the held PR is ready for a final model synthesis round to incorporate advice.
   */
  public isReadyForFinalSynthesis(taskId: string): boolean {
    const state = this.heldPrs.get(taskId);
    if (!state) return false;
    return this.areAllDomainsCheckedIn(taskId) && !state.synthesisCompleted;
  }

  /**
   * Generates a unified synthesis prompt summarizing all domain specialist feedback.
   */
  public generateSynthesisPrompt(taskId: string): string {
    const state = this.heldPrs.get(taskId);
    if (!state) return "";

    const lines: string[] = [
      `### Final Multi-Model Advisory Synthesis for PR #${state.prNumber}`,
      `All required domain evaluation models have checked in. Incorporate the following collective feedback:`,
      "",
    ];

    for (const [domain, checkIn] of state.checkIns.entries()) {
      lines.push(
        `- **[${domain}] ${checkIn.authorName} (${checkIn.status})**: ${checkIn.feedbackNotes}`,
      );
    }

    lines.push(
      "",
      `Execute targeted refactoring to resolve all requested adjustments while preserving all passing test suites.`,
    );

    return lines.join("\n");
  }

  /**
   * Marks final synthesis completed and authorizes the PR for merge.
   */
  public completeSynthesisAndApproveMerge(taskId: string): void {
    const state = this.heldPrs.get(taskId);
    if (state) {
      state.synthesisCompleted = true;
      state.mergeApproved = true;
    }
  }

  /**
   * Checks whether the PR is approved for merge.
   */
  public isMergeApproved(taskId: string): boolean {
    const state = this.heldPrs.get(taskId);
    if (!state) return true; // not held
    if (state.mergeApproved) return true;
    if (
      this.areAllDomainsCheckedIn(taskId) &&
      !this.hasBlockingFeedback(taskId)
    ) {
      state.mergeApproved = true;
      return true;
    }
    // Timeout fallback: if hold period elapsed, allow merge to prevent deadlocks
    if (Date.now() - state.heldAt > this.holdTimeoutMs) {
      return true;
    }
    return false;
  }

  /**
   * Releases held state for a completed or aborted task.
   */
  public releaseHeldState(taskId: string): void {
    this.heldPrs.delete(taskId);
  }

  /**
   * Retrieves held state details for telemetry or inspector display.
   */
  public getHeldState(taskId: string): HeldPrState | undefined {
    return this.heldPrs.get(taskId);
  }
}
