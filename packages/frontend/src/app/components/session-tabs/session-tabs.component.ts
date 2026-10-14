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
  templateUrl: './session-tabs.component.html',
  styleUrl: './session-tabs.component.css',
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
