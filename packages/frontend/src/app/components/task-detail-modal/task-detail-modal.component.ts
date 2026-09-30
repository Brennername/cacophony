import { Component, inject, signal, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore } from '../../services/arena-state.store';

export type TaskModalTab = 'overview' | 'stages' | 'diffs' | 'stream' | 'cognitive' | 'reviews' | 'stderr';

export interface PrReviewData {
  readonly taskId: string;
  readonly prUrl?: string | null;
  readonly targetBranch?: string | null;
  readonly verdict: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECT';
  readonly solidComplianceScore: number;
  readonly reviewNotes: string;
  readonly comments: Array<{
    readonly path: string;
    readonly lineNumber: number;
    readonly comment: string;
    readonly severity: 'info' | 'warning' | 'blocker';
  }>;
  readonly merged: boolean;
}

/**
 * Mobile-first comprehensive Task Drill-Down Modal dialog:
 * Displays complete task metadata, prompt, assigned model, focus files,
 * test commands, execution stages timeline, diffs, stderr, PR reviews, and full scrollable LLM terminal stream.
 *
 * Implements:
 * - Tabbed sub-views: Overview, Stages & Timings, Code Diffs, Full Stream Log, PR Reviews, Test Stderr.
 * - Copy-to-clipboard actions for prompt, diff, test command, and terminal logs.
 * - Touch-friendly close buttons and Escape key listener complying with mobile-first standards.
 */
@Component({
  selector: 'app-task-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (store.selectedTask(); as task) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal-content cacophony-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="header-titles">
              <div class="badge-row">
                <span class="badge priority">{{ task.priority }}</span>
                <span class="badge status" [ngClass]="task.status.toLowerCase()">{{ task.status }}</span>
                <span class="badge role">{{ task.role }}</span>
              </div>
              <h3>{{ task.title }}</h3>
              <span class="task-id">ID: {{ task.id }}</span>
            </div>
            <button class="close-btn touch-target" (click)="close()" aria-label="Close dialog">✕</button>
          </div>

          <!-- Pull Request Notification Banner -->
          @if (task.prUrl || prReviewData(); as review) {
            <div class="pr-banner" [ngClass]="(prReviewData()?.verdict || 'APPROVED').toLowerCase()">
              <div class="pr-banner-left">
                <span class="pr-banner-icon">PR</span>
                <div class="pr-banner-info">
                  <span class="pr-branch-pill font-mono">{{ task.targetBranch || prReviewData()?.targetBranch || 'main' }}</span>
                  @if (task.prUrl || prReviewData()?.prUrl; as url) {
                    <a [href]="url" target="_blank" rel="noopener" class="pr-banner-link font-mono">
                      {{ formatPrLinkText(url) }} ↗
                    </a>
                  }
                </div>
              </div>
              <div class="pr-banner-right">
                <span
                  class="pr-verdict-badge font-mono"
                  [ngClass]="(prReviewData()?.verdict || 'APPROVED').toLowerCase()"
                >
                  {{ prReviewData()?.verdict || 'APPROVED' }}
                </span>
                @if (prReviewData()?.solidComplianceScore; as score) {
                  <span class="solid-pill font-mono">SOLID: {{ score }}/100</span>
                }
              </div>
            </div>
          }

          <!-- Tab Bar Navigation (Mobile-first horizontal scroll) -->
          <div class="tab-bar">
            <button
              class="tab-btn touch-target"
              [class.active]="activeTab() === 'overview'"
              (click)="activeTab.set('overview')"
            >
              Overview
            </button>
            <button
              class="tab-btn touch-target"
              [class.active]="activeTab() === 'stages'"
              (click)="activeTab.set('stages')"
            >
              Stages ({{ task.stages?.length ?? 0 }})
            </button>
            <button
              class="tab-btn touch-target"
              [class.active]="activeTab() === 'diffs'"
              (click)="activeTab.set('diffs')"
            >
              Code Diffs
            </button>
            <button
              class="tab-btn touch-target"
              [class.active]="activeTab() === 'stream'"
              (click)="activeTab.set('stream')"
            >
              Stream Log
            </button>
            <button
              class="tab-btn touch-target"
              [class.active]="activeTab() === 'cognitive'"
              (click)="activeTab.set('cognitive')"
            >
              Cognitive Trace
            </button>
            <button
              class="tab-btn touch-target"
              [class.active]="activeTab() === 'reviews'"
              (click)="activeTab.set('reviews')"
            >
              PR Reviews
            </button>
            <button
              class="tab-btn touch-target"
              [class.active]="activeTab() === 'stderr'"
              (click)="activeTab.set('stderr')"
            >
              Test Stderr
            </button>
          </div>

          <div class="modal-body">
            @if (copiedMessage()) {
              <div class="copy-banner">{{ copiedMessage() }}</div>
            }

            <!-- 1. OVERVIEW TAB -->
            @if (activeTab() === 'overview') {
              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Model Assigned</span>
                  <span class="meta-val font-mono">{{ task.modelAssigned || 'None' }}</span>
                </div>
                <div class="meta-item">
                  <div class="label-with-copy">
                    <span class="meta-label">Test Command</span>
                    @if (task.testCommand) {
                      <button class="copy-action-btn" (click)="copyText(task.testCommand, 'Test command copied!')">Copy</button>
                    }
                  </div>
                  <span class="meta-val font-mono">{{ task.testCommand || 'None' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Focus Files</span>
                  <span class="meta-val font-mono">{{ task.focusFiles || 'All workspace' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Created At</span>
                  <span class="meta-val font-mono">{{ formatModalTimestamp(task.createdAt) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Completed At</span>
                  <span class="meta-val font-mono">{{ formatModalTimestamp(task.completedAt) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Pull Request</span>
                  @if (task.prUrl) {
                    <a [href]="task.prUrl" target="_blank" rel="noopener" class="pr-link">View in Gitea ↗</a>
                  } @else {
                    <span class="meta-val">None</span>
                  }
                </div>
              </div>

              <!-- Task Directive / Prompt -->
              <div class="section-block">
                <div class="header-with-action">
                  <h4 class="section-title">Architectural Directive / Prompt</h4>
                  @if (task.prompt) {
                    <button class="copy-action-btn" (click)="copyText(task.prompt, 'Prompt copied!')">Copy Prompt</button>
                  }
                </div>
                <div class="prompt-box">
                  <pre class="prompt-text">{{ task.prompt || 'No extended prompt directive supplied.' }}</pre>
                </div>
              </div>
            }

            <!-- 2. STAGES TAB -->
            @if (activeTab() === 'stages') {
              <div class="section-block">
                @if (task.stages && task.stages.length > 0) {
                  <div class="stages-list">
                    @for (st of task.stages; track st.id) {
                      <div class="stage-item" [ngClass]="st.stageStatus.toLowerCase()">
                        <div class="stage-top">
                          <span class="stage-name">{{ st.stageName | uppercase }}</span>
                          @if (st.startedAt) {
                            <span class="stage-time font-mono">{{ formatStageTime(st.startedAt) }}</span>
                          }
                          <span class="stage-status">{{ st.stageStatus }}</span>
                          <span class="stage-duration font-mono">{{ st.durationMs ? st.durationMs + 'ms' : 'Active' }}</span>
                        </div>
                        @if (st.logOutput) {
                          <pre class="stage-log"><code>{{ st.logOutput }}</code></pre>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <div class="empty-tab-state">No execution stages recorded yet.</div>
                }
              </div>
            }

            <!-- 3. CODE DIFFS TAB -->
            @if (activeTab() === 'diffs') {
              <div class="section-block">
                <div class="header-with-action">
                  <h4 class="section-title">Applied Code Modifications</h4>
                  <button class="copy-action-btn" (click)="copyText(task.logSnippet || '', 'Diffs copied!')">Copy Diffs</button>
                </div>
                <div class="diff-box">
                  <pre class="diff-content font-mono"><code>{{ task.logSnippet || '// No code diffs currently recorded for this task.' }}</code></pre>
                </div>
              </div>
            }

            <!-- 4. STREAM LOG TAB -->
            @if (activeTab() === 'stream') {
              <div class="section-block">
                <div class="header-with-action">
                  <h4 class="section-title">Live Terminal & Inference Output Stream</h4>
                  <button class="copy-action-btn" (click)="copyText(getStreamContent(task), 'Terminal log copied!')">Copy Logs</button>
                </div>
                <div class="full-terminal-box">
                  <div class="terminal-bar">
                    <span class="dot red"></span>
                    <span class="dot yellow"></span>
                    <span class="dot green"></span>
                    <span class="terminal-title font-mono">{{ task.id }} (LLM Token Stream)</span>
                  </div>
                  <pre class="full-terminal-content"><code>{{ getStreamContent(task) }}</code></pre>
                </div>
              </div>
            }

            <!-- 5. COGNITIVE TRACE TAB (Reasoning & Consensus Distillation) -->
            @if (activeTab() === 'cognitive') {
              <div class="section-block">
                @if (task.status === 'RUNNING' && store.liveReasoningBuffer(); as liveThoughts) {
                  <!-- Live Streaming Cognitive Trace -->
                  <div class="cognitive-trace-container">
                    <div class="header-with-action">
                      <div class="opinion-title-row">
                        <span class="opinion-tag">LIVE STREAMING COGNITIVE TRACE</span>
                        <span class="confidence-badge font-mono">LIVE IN VRAM</span>
                      </div>
                      <button class="copy-action-btn" (click)="copyText(liveThoughts, 'Cognitive trace copied!')">Copy Thoughts</button>
                    </div>
                    <div class="thoughts-terminal-box">
                      <pre class="thoughts-content font-mono"><code>{{ liveThoughts }}</code></pre>
                    </div>
                  </div>
                } @else if (opinionData(); as op) {
                  <!-- Distilled Opinion Card -->
                  <div class="distilled-opinion-card">
                    <div class="opinion-header">
                      <div class="opinion-title-row">
                        <span class="opinion-tag">DISTILLED ARCHITECTURAL OPINION</span>
                        <span class="confidence-badge font-mono">Confidence: {{ Math.round(op.opinion.confidenceScore * 100) }}%</span>
                      </div>
                      <p class="opinion-summary">{{ op.opinion.summary }}</p>
                    </div>

                    @if (op.opinion.keyDecisions.length > 0) {
                      <div class="opinion-section">
                        <span class="opinion-subhead">Key Decisions</span>
                        <ul class="opinion-list">
                          @for (decision of op.opinion.keyDecisions; track decision) {
                            <li>{{ decision }}</li>
                          }
                        </ul>
                      </div>
                    }

                    @if (op.opinion.identifiedRisks.length > 0) {
                      <div class="opinion-section risks">
                        <span class="opinion-subhead">Identified Risks & Edge Cases</span>
                        <ul class="opinion-list">
                          @for (risk of op.opinion.identifiedRisks; track risk) {
                            <li>{{ risk }}</li>
                          }
                        </ul>
                      </div>
                    }
                  </div>

                  <!-- Raw <think> Stream Output -->
                  <div class="cognitive-trace-container">
                    <div class="header-with-action">
                      <h4 class="section-title">Raw &lt;think&gt; Cognitive Trace</h4>
                      @if (op.reasoningTranscript) {
                        <button class="copy-action-btn" (click)="copyText(op.reasoningTranscript, 'Cognitive trace copied!')">Copy Thoughts</button>
                      }
                    </div>
                    <div class="thoughts-terminal-box">
                      <pre class="thoughts-content font-mono"><code>{{ op.reasoningTranscript || '// No internal reasoning emitted for this model.' }}</code></pre>
                    </div>
                  </div>
                } @else if (loadingOpinion()) {
                  <div class="empty-tab-state">Distilling model cognitive trace and opinion...</div>
                } @else {
                  <div class="empty-tab-state">No cognitive trace or reasoning data recorded for this task.</div>
                }
              </div>
            }

            <!-- 6. PR REVIEWS TAB -->
            @if (activeTab() === 'reviews') {
              <div class="section-block">
                @if (prReviewData(); as review) {
                  <div class="pr-reviews-container">
                    <div class="review-header-card" [ngClass]="review.verdict.toLowerCase()">
                      <div class="review-summary-row">
                        <span class="verdict-tag font-mono">{{ review.verdict }}</span>
                        <span class="score-badge font-mono">SOLID Adherence: {{ review.solidComplianceScore }}/100</span>
                        @if (review.merged) {
                          <span class="merged-badge font-mono">MERGED</span>
                        }
                      </div>
                      <p class="review-notes-text">{{ review.reviewNotes }}</p>
                    </div>

                    @if (review.comments && review.comments.length > 0) {
                      <div class="review-comments-section">
                        <h4 class="section-title">Line-Level Architectural Feedback ({{ review.comments.length }})</h4>
                        <div class="comments-list">
                          @for (comment of review.comments; track comment.path + comment.lineNumber) {
                            <div class="comment-item" [ngClass]="comment.severity">
                              <div class="comment-item-header">
                                <span class="comment-path font-mono">{{ comment.path }}:{{ comment.lineNumber }}</span>
                                <span class="comment-severity font-mono">{{ comment.severity | uppercase }}</span>
                              </div>
                              <p class="comment-body">{{ comment.comment }}</p>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                } @else if (loadingReview()) {
                  <div class="empty-tab-state">Fetching automated PR review and SOLID compliance evaluation...</div>
                } @else {
                  <div class="empty-tab-state">No automated Pull Request review recorded for this task.</div>
                }
              </div>
            }

            <!-- 7. TEST STDERR TAB -->
            @if (activeTab() === 'stderr') {
              <div class="section-block">
                <div class="header-with-action">
                  <h4 class="section-title">Automated Test Execution Stderr</h4>
                  <button class="copy-action-btn" (click)="copyText(extractTestStderr(task), 'Stderr copied!')">Copy Stderr</button>
                </div>
                <div class="stderr-box">
                  <pre class="stderr-content font-mono"><code>{{ extractTestStderr(task) }}</code></pre>
                </div>
              </div>
            }
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline touch-target" (click)="close()">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 0.5rem;
    }

    .modal-content {
      width: 100%;
      max-width: 820px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      overflow: hidden;
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-surface-elevated);
    }

    .touch-target {
      min-height: 44px;
      min-width: 44px;
    }

    .tab-bar {
      display: flex;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-subtle);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 0.8125rem;
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .tab-btn:hover {
      color: var(--text-primary);
      background: var(--bg-surface-elevated);
    }

    .tab-btn.active {
      color: var(--color-brand);
      background: var(--bg-surface);
      font-weight: 600;
    }

    .copy-banner {
      padding: 0.5rem 0.75rem;
      background: var(--color-brand-glow);
      border: 1px solid var(--color-brand);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      color: var(--text-primary);
      text-align: center;
    }

    .header-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .copy-action-btn {
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.6875rem;
      padding: 0.2rem 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .copy-action-btn:hover {
      border-color: var(--color-brand);
      color: var(--color-brand);
    }

    .badge-row {
      display: flex;
      gap: 0.375rem;
      margin-bottom: 0.375rem;
    }

    .badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
    }

    .badge.priority {
      background: var(--color-brand);
      color: #ffffff;
    }

    .badge.status.running {
      background: var(--status-nominal);
      color: #ffffff;
    }

    .badge.status.pending {
      background: var(--status-warm);
      color: #ffffff;
    }

    .badge.status.completed {
      background: var(--color-brand-secondary, #2563eb);
      color: #ffffff;
    }

    .badge.status.failed {
      background: var(--status-danger);
      color: #ffffff;
    }

    .badge.role {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
    }

    .header-titles h3 {
      font-size: 1.125rem;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.3;
    }

    .task-id {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: var(--text-primary);
    }

    .modal-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      overflow-y: auto;
    }

    .pr-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.625rem 1rem;
      background: rgba(56, 189, 248, 0.08);
      border-bottom: 1px solid rgba(56, 189, 248, 0.25);
      flex-wrap: wrap;
    }

    .pr-banner.approved {
      background: rgba(34, 197, 94, 0.08);
      border-bottom-color: rgba(34, 197, 94, 0.25);
    }

    .pr-banner.changes_requested, .pr-banner.reject {
      background: rgba(239, 68, 68, 0.08);
      border-bottom-color: rgba(239, 68, 68, 0.25);
    }

    .pr-banner-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .pr-banner-icon {
      font-weight: 800;
      font-size: 0.75rem;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
      background: var(--color-brand);
      color: #ffffff;
    }

    .pr-banner-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pr-branch-pill {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
    }

    .pr-banner-link {
      font-size: 0.75rem;
      color: var(--color-brand);
      text-decoration: underline;
    }

    .pr-banner-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pr-verdict-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
    }

    .pr-verdict-badge.approved {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.4);
    }

    .pr-verdict-badge.changes_requested, .pr-verdict-badge.reject {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    .solid-pill {
      font-size: 0.6875rem;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .pr-reviews-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .review-header-card {
      padding: 1rem;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
    }

    .review-header-card.approved {
      border-left: 4px solid #4ade80;
    }

    .review-header-card.changes_requested, .review-header-card.reject {
      border-left: 4px solid #f87171;
    }

    .review-summary-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }

    .verdict-tag {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
    }

    .score-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .merged-badge {
      font-size: 0.6875rem;
      padding: 0.125rem 0.4rem;
      border-radius: var(--radius-sm);
      background: rgba(168, 85, 247, 0.2);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.4);
    }

    .review-notes-text {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .comment-item {
      padding: 0.625rem 0.875rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .comment-item.blocker {
      border-left: 3px solid #f87171;
    }

    .comment-item.warning {
      border-left: 3px solid #fbbf24;
    }

    .comment-item.info {
      border-left: 3px solid #38bdf8;
    }

    .comment-item-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }

    .comment-path {
      font-size: 0.75rem;
      color: var(--text-primary);
    }

    .comment-severity {
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .comment-body {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.625rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
    }

    @media (min-width: 640px) {
      .meta-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .label-with-copy {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .meta-label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }

    .meta-val {
      font-size: 0.8125rem;
      color: var(--text-primary);
      word-break: break-all;
    }

    .pr-link {
      font-size: 0.8125rem;
      color: var(--color-brand);
      text-decoration: none;
      font-weight: 500;
    }

    .pr-link:hover {
      text-decoration: underline;
    }

    .section-block {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .section-title {
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin: 0;
    }

    .prompt-box, .diff-box, .stderr-box {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      max-height: 220px;
      overflow-y: auto;
    }

    .prompt-text, .diff-content, .stderr-content {
      margin: 0;
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      color: var(--text-primary);
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .diff-content {
      font-family: var(--font-mono);
      color: #38bdf8;
    }

    .stderr-content {
      font-family: var(--font-mono);
      color: #f87171;
    }

    .stages-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .stage-item {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.625rem 0.875rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .stage-top {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .stage-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .stage-time {
      font-size: 0.6875rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
    }

    .stage-status {
      font-size: 0.6875rem;
      color: var(--text-muted);
      margin-left: auto;
    }

    .stage-duration {
      font-size: 0.6875rem;
      color: var(--text-secondary);
    }

    .stage-log {
      margin: 0;
      padding: 0.5rem;
      background: #000000;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: #a5f3fc;
      white-space: pre-wrap;
      max-height: 120px;
      overflow-y: auto;
    }

    .full-terminal-box {
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      background: #000000;
      overflow: hidden;
    }

    .terminal-bar {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      background: #11141c;
      border-bottom: 1px solid var(--border-subtle);
    }

    .terminal-bar .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .terminal-bar .dot.red { background: #ef4444; }
    .terminal-bar .dot.yellow { background: #f59e0b; }
    .terminal-bar .dot.green { background: #10b981; }

    .terminal-title {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-left: 0.5rem;
    }

    .full-terminal-content {
      margin: 0;
      padding: 1rem;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: #38bdf8;
      white-space: pre-wrap;
      max-height: 260px;
      overflow-y: auto;
      line-height: 1.4;
    }

    /* Cognitive Trace & Distilled Opinion Styles */
    .distilled-opinion-card {
      background: rgba(14, 165, 233, 0.08);
      border: 1px solid rgba(14, 165, 233, 0.3);
      border-radius: var(--radius-md, 8px);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .opinion-header {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .opinion-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .opinion-tag {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #38bdf8;
    }

    .confidence-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #10b981;
      background: rgba(16, 185, 129, 0.15);
      border-radius: var(--radius-full, 9999px);
      padding: 0.125rem 0.5rem;
    }

    .opinion-summary {
      font-size: 0.875rem;
      line-height: 1.4;
      color: var(--text-primary);
      margin: 0;
    }

    .opinion-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .opinion-subhead {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
    }

    .opinion-list {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.8125rem;
      line-height: 1.4;
      color: var(--text-secondary);
    }

    .opinion-section.risks .opinion-subhead {
      color: #f59e0b;
    }

    .thoughts-terminal-box {
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm, 6px);
      background: #090d16;
      max-height: 240px;
      overflow-y: auto;
    }

    .thoughts-content {
      margin: 0;
      padding: 0.875rem;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: #a5b4fc;
      white-space: pre-wrap;
      line-height: 1.4;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0.875rem 1.25rem;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-surface-elevated);
    }

    .btn {
      padding: 0.5rem 1rem;
      font-size: 0.8125rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
    }

    .btn-outline:hover {
      border-color: var(--color-brand);
      color: var(--color-brand);
    }

    .empty-tab-state {
      padding: 2rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
  `],
})
export class TaskDetailModalComponent {
  public readonly store = inject(ArenaStateStore);
  public readonly liveStreamBuffer = this.store.liveStreamBuffer;
  public readonly activeTab = signal<TaskModalTab>('overview');
  public readonly copiedMessage = signal<string | null>(null);

  // Task-specific stream buffer fetched from backend
  public readonly taskStreamBuffer = signal<string | null>(null);

  // PR Review state
  public readonly prReviewData = signal<PrReviewData | null>(null);
  public readonly loadingReview = signal<boolean>(false);

  // Cognitive trace and distilled opinion state
  public readonly opinionData = signal<{
    taskId: string;
    hasReasoning: boolean;
    reasoningTranscript: string;
    thinkingDurationMs: number;
    opinion: {
      summary: string;
      keyDecisions: string[];
      identifiedRisks: string[];
      confidenceScore: number;
    };
  } | null>(null);
  public readonly loadingOpinion = signal<boolean>(false);
  public readonly Math = Math;

  constructor() {
    effect(() => {
      const task = this.store.selectedTask();
      if (!task) {
        this.taskStreamBuffer.set(null);
        this.opinionData.set(null);
        this.prReviewData.set(null);
        return;
      }

      // If selected task is the active RUNNING task, liveStreamBuffer reflects it live
      if (task.status === 'RUNNING') {
        this.taskStreamBuffer.set(null);
      } else {
        void this.fetchHistoricalBuffer(task.id);
      }

      void this.fetchOpinion(task.id);
      void this.fetchPrReview(task.id);
    });
  }

  public async fetchPrReview(taskId: string): Promise<void> {
    this.loadingReview.set(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/pr-review`);
      if (res.ok) {
        const data = (await res.json()) as PrReviewData;
        this.prReviewData.set(data);
      } else {
        this.prReviewData.set(null);
      }
    } catch {
      this.prReviewData.set(null);
    } finally {
      this.loadingReview.set(false);
    }
  }

  public formatPrLinkText(url: string): string {
    if (!url) return 'View PR';
    if (url.includes('github.com')) {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (match) {
        return `GitHub PR #${match[3]}`;
      }
      return 'GitHub PR';
    }
    const match = url.match(/\/pulls\/(\d+)/);
    if (match) {
      return `Gitea PR #${match[1]}`;
    }
    return 'Gitea PR';
  }

  private async fetchHistoricalBuffer(taskId: string): Promise<void> {
    try {
      const res = await fetch(`/api/stream/buffer?taskId=${encodeURIComponent(taskId)}`);
      if (res.ok) {
        const data = await res.json() as { buffer?: string };
        this.taskStreamBuffer.set(data.buffer || null);
      }
    } catch {
      this.taskStreamBuffer.set(null);
    }
  }

  private async fetchOpinion(taskId: string): Promise<void> {
    this.loadingOpinion.set(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/opinion`);
      if (res.ok) {
        const data = await res.json();
        this.opinionData.set(data);
      } else {
        this.opinionData.set(null);
      }
    } catch {
      this.opinionData.set(null);
    } finally {
      this.loadingOpinion.set(false);
    }
  }

  public getStreamContent(task: any): string {
    if (task.status === 'RUNNING') {
      return this.liveStreamBuffer() || task.logSnippet || 'Streaming tokens from active inference...';
    }

    const fetched = this.taskStreamBuffer();
    if (fetched && fetched.trim().length > 0) {
      return fetched;
    }

    if (task.logSnippet && task.logSnippet.trim().length > 0) {
      return task.logSnippet;
    }

    // Check generation stage log
    const genStage = task.stages?.find((s: any) => s.stageName === 'generation');
    if (genStage?.logOutput) {
      return genStage.logOutput;
    }

    return '// No historical stream token log recorded for this completed/pending task.';
  }

  @HostListener('window:keydown.escape')
  public handleEscape(): void {
    this.close();
  }

  public close(): void {
    this.store.clearSelectedTask();
  }

  public copyText(text: string, successMessage: string): void {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      void navigator.clipboard.writeText(text);
    }
    this.copiedMessage.set(successMessage);
    setTimeout(() => this.copiedMessage.set(null), 2500);
  }

  public extractTestStderr(task: any): string {
    const testStage = task.stages?.find((s: any) => s.stageName === 'test_execution' || s.stageName === 'test');
    if (testStage?.logOutput) {
      return testStage.logOutput;
    }
    return '// No test execution errors or stderr captured.';
  }

  public formatModalTimestamp(iso: string | null | undefined): string {
    if (!iso) return 'None';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return iso;
    }
  }

  public formatStageTime(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return '';
    }
  }
}
