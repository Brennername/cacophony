import { Component, signal, model, output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore } from '../../services/arena-state.store';
import { HistoryMetricsService } from '../../services/history-metrics.service';

export interface SessionTab {
  readonly id: string;
  readonly title: string;
  readonly branch: string;
  readonly activeModel: string;
  readonly isModified?: boolean;
}

/**
 * Mobile-first scrollable tab bar for multi-tab sessions with Signals.
 */
@Component({
  selector: 'app-session-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="tabs-container" aria-label="Active Sessions">
      <div class="tabs-scroll-area">
        @for (tab of tabs(); track tab.id) {
          <div
            class="tab-item"
            [class.active]="activeTabId() === tab.id"
            (click)="selectTab(tab.id)"
            role="button"
            tabindex="0"
            (keydown.enter)="selectTab(tab.id)"
          >
            <div class="tab-content">
              <span class="tab-title">{{ tab.title }}</span>
              <span class="tab-branch">[{{ tab.branch }}]</span>
              @if (tab.activeModel) {
                <span class="tab-model font-mono">{{ tab.activeModel }}</span>
              }
              @if (tab.isModified) {
                <span class="tab-dot" aria-label="Modified">•</span>
              }
            </div>
            @if (tabs().length > 1) {
              <button
                class="tab-close-btn"
                (click)="closeTab($event, tab.id)"
                aria-label="Close tab"
              >
                ×
              </button>
            }
          </div>
        }
        <button class="new-tab-btn" (click)="createNewTab()" aria-label="New Session Tab">
          + New Tab
        </button>
        <div class="epoch-indicator-badge" title="Active Arena Telemetry Epoch">
          <span class="epoch-dot"></span>
          <span class="epoch-label">Epoch {{ metricsService.currentEpoch()?.epochId || 1 }}</span>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }
    .tabs-container {
      display: flex;
      align-items: center;
      background: var(--bg-surface, #1e1e24);
      border-bottom: 1px solid var(--border-color, #2d2d38);
      padding: 0.25rem 0.5rem;
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: thin;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
    }
    .tabs-scroll-area {
      display: flex;
      gap: 0.35rem;
      align-items: center;
      min-width: 0;
    }
    .tab-item {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-radius: 4px;
      background: var(--bg-tab, #262633);
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      font-size: 0.85rem;
      border: 1px solid transparent;
      user-select: none;
      transition: all 0.15s ease;
    }
    .tab-item:hover {
      background: var(--bg-tab-hover, #2f2f40);
      color: var(--text-primary, #f8fafc);
    }
    .tab-item.active {
      background: var(--bg-tab-active, #0f172a);
      color: var(--color-primary, #38bdf8);
      border-color: var(--color-primary, #38bdf8);
      font-weight: 600;
    }
    .tab-content {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .tab-branch {
      font-size: 0.75rem;
      opacity: 0.75;
      font-family: monospace;
    }
    .tab-model {
      font-size: 0.6875rem;
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      background: var(--bg-surface, #1e293b);
      color: var(--color-primary, #38bdf8);
      border: 1px solid var(--border-color, #475569);
    }
    .tab-dot {
      color: var(--color-warning, #f59e0b);
      font-weight: bold;
    }
    .tab-close-btn {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;
      padding: 0 0.2rem;
      line-height: 1;
      opacity: 0.6;
    }
    .tab-close-btn:hover {
      opacity: 1;
      color: var(--color-danger, #ef4444);
    }
    .new-tab-btn {
      background: transparent;
      border: 1px dashed var(--border-color, #475569);
      color: var(--text-muted, #94a3b8);
      padding: 0.35rem 0.65rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .new-tab-btn:hover {
      border-color: var(--color-primary, #38bdf8);
      color: var(--color-primary, #38bdf8);
    }
    .epoch-indicator-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      background: var(--bg-surface-elevated, #1e293b);
      border: 1px solid var(--border-color, #334155);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-brand, #38bdf8);
      margin-left: auto;
    }
    .epoch-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
    }
    .epoch-label {
      white-space: nowrap;
    }
  `]
})
export class SessionTabsComponent {
  private readonly store = inject(ArenaStateStore);
  public readonly metricsService = inject(HistoryMetricsService);

  public readonly tabs = signal<SessionTab[]>([
    { id: 'tab-1', title: 'Main Session', branch: 'master', activeModel: 'qwen2.5-coder:7b' }
  ]);
  public readonly activeTabId = model<string>('tab-1');

  public readonly tabCreated = output<SessionTab>();
  public readonly tabClosed = output<string>();

  constructor() {
    effect(() => {
      const activeModel = this.store.telemetry().activeModel;
      if (activeModel && activeModel !== 'None') {
        this.tabs.update((curr) =>
          curr.map((tab, idx) => (idx === 0 ? { ...tab, activeModel } : tab))
        );
      }
    });
  }

  public selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  public createNewTab(): void {
    const newId = `tab-${Date.now()}`;
    const newTab: SessionTab = {
      id: newId,
      title: `Session ${this.tabs().length + 1}`,
      branch: 'master',
      activeModel: 'qwen2.5-coder:7b'
    };
    this.tabs.update((current) => [...current, newTab]);
    this.activeTabId.set(newId);
    this.tabCreated.emit(newTab);
  }

  public closeTab(event: Event, id: string): void {
    event.stopPropagation();
    const remaining = this.tabs().filter((t) => t.id !== id);
    if (remaining.length > 0) {
      this.tabs.set(remaining);
      if (this.activeTabId() === id) {
        this.activeTabId.set(remaining[0]!.id);
      }
      this.tabClosed.emit(id);
    }
  }
}
