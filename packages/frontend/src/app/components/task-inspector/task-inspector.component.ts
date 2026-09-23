import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore } from '../../services/arena-state.store';
import { StageProgressBarComponent } from '../stage-progress-bar/stage-progress-bar.component';
import { GanttTransportComponent } from '../gantt-transport/gantt-transport.component';

/**
 * Visual stepper and Gantt transport tracking task pipeline progression:
 * 1/7 Planning through 7/7 PR Review with intra-stage token velocity.
 */
@Component({
  selector: 'app-task-inspector',
  standalone: true,
  imports: [CommonModule, StageProgressBarComponent, GanttTransportComponent],
  template: `
    <div class="cacophony-card inspector-card">
      <div class="header-row">
        <div>
          <h2>Active Task Inspector</h2>
          <span class="subtext">Real-time LLM stage pipeline & token stream</span>
        </div>
        @if (activeTask(); as task) {
          <div class="speed-badge">
            <span class="num">{{ task.tokensPerSec ?? 0 }}</span>
            <span class="unit">tok/s</span>
          </div>
        }
      </div>

      @if (activeTask(); as task) {
        <div class="task-info-banner">
          <span class="badge priority">{{ task.priority }}</span>
          <span class="task-title">{{ task.title }}</span>
          <span class="badge role">{{ task.role }}</span>
        </div>

        <!-- 7-Stage Granular Segmented Progress Bar -->
        <app-stage-progress-bar
          [progressPercent]="task.progressPercent ?? 42"
          [tokensPerSec]="task.tokensPerSec ?? 0"
          [currentStageNumber]="3"
          activeStageLabel="3/7 Generation"
        />

        <!-- Stage Stepper Pipeline -->
        <div class="stepper-container">
          <div class="step done">
            <div class="circle">1</div>
            <span>Planning</span>
          </div>
          <div class="line done"></div>

          <div class="step active">
            <div class="circle">2</div>
            <span>Generation</span>
          </div>
          <div class="line"></div>

          <div class="step">
            <div class="circle">3</div>
            <span>Scrub</span>
          </div>
          <div class="line"></div>

          <div class="step">
            <div class="circle">4</div>
            <span>Test</span>
          </div>
          <div class="line"></div>

          <div class="step">
            <div class="circle">5</div>
            <span>Review</span>
          </div>
          <div class="line"></div>

          <div class="step">
            <div class="circle">6</div>
            <span>Merge</span>
          </div>
        </div>

        <!-- Live Terminal Stream Preview -->
        <div class="terminal-box">
          <div class="terminal-bar">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <span class="terminal-title">live-llm-stream (task: {{ task.id }})</span>
          </div>
          <pre class="terminal-content"><code>{{ task.logSnippet }}</code></pre>
        </div>

        <!-- Interactive DAW Gantt Transport Timeline -->
        <app-gantt-transport />
      } @else {
        <div class="empty-state">
          <p>No active tasks currently executing in the arena.</p>
          <span class="subtext">Scheduler is ready for incoming tasks.</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .inspector-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .subtext {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .speed-badge {
      display: inline-flex;
      align-items: baseline;
      gap: 0.25rem;
      padding: 0.25rem 0.625rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--color-brand);
      border-radius: var(--radius-sm);
    }

    .speed-badge .num {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--color-brand);
      font-size: 1.125rem;
    }

    .speed-badge .unit {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .task-info-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-surface-elevated);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    .task-title {
      font-weight: 600;
      flex: 1;
      font-size: 0.9375rem;
    }

    .badge {
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge.priority {
      background: var(--status-elevated);
      color: #ffffff;
    }

    .badge.role {
      background: var(--border-strong);
      color: var(--text-primary);
    }

    /* Stepper */
    .stepper-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
      overflow-x: auto;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      min-width: 50px;
    }

    .step span {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .step .circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--bg-surface-elevated);
      border: 2px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .step.done .circle {
      background: var(--status-nominal);
      border-color: var(--status-nominal);
      color: #ffffff;
    }

    .step.active .circle {
      border-color: var(--color-brand);
      color: var(--color-brand);
      box-shadow: 0 0 10px var(--color-brand-glow);
    }

    .step.active span {
      color: var(--color-brand);
      font-weight: 600;
    }

    .line {
      flex: 1;
      height: 2px;
      background: var(--border-subtle);
      margin: 0 0.25rem 1rem 0.25rem;
    }

    .line.done {
      background: var(--status-nominal);
    }

    /* Terminal Box */
    .terminal-box {
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: #000000;
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
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-left: 0.5rem;
    }

    .terminal-content {
      padding: 0.875rem;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: #38bdf8;
      white-space: pre-wrap;
      max-height: 140px;
      overflow-y: auto;
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      color: var(--text-secondary);
    }
  `],
})
export class TaskInspectorComponent {
  private readonly store = inject(ArenaStateStore);
  public readonly activeTask = this.store.activeTask;
}
