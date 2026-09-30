import { Component, input, output, ElementRef, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * TerminalLogViewerComponent
 *
 * Renders a high-density, monospace terminal screen piping real-time stdout/stderr
 * logs with automated smooth auto-scroll to latest output and ANSI/status styling.
 */
@Component({
  selector: 'app-terminal-log-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="terminal-container">
      <div class="terminal-header">
        <div class="window-controls">
          <span class="control-dot close"></span>
          <span class="control-dot minimize"></span>
          <span class="control-dot expand"></span>
        </div>
        <span class="terminal-title">{{ title() }}</span>
        <div class="actions">
          <button class="clear-btn" (click)="onClear.emit()">Clear</button>
        </div>
      </div>

      <div #terminalBody class="terminal-body">
        @if (lines().length === 0) {
          <div class="empty-state">Awaiting output stream...</div>
        } @else {
          @for (line of lines(); track $index) {
            <div class="log-line" [ngClass]="getLineClass(line)">
              <span class="line-number tabular">{{ $index + 1 }}</span>
              <span class="line-text">{{ line }}</span>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .terminal-container {
      background: var(--bg-surface-elevated, #0d1117);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--radius-md, 8px);
      overflow: hidden;
      font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 180px;
      max-height: 320px;
    }

    .terminal-header {
      background: var(--bg-surface, #161b22);
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .window-controls {
      display: flex;
      gap: 6px;
    }

    .control-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .control-dot.close { background: #ff5f56; }
    .control-dot.minimize { background: #ffbd2e; }
    .control-dot.expand { background: #27c93f; }

    .terminal-title {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-muted, #8b949e);
    }

    .clear-btn {
      background: transparent;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      color: var(--text-muted, #8b949e);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      cursor: pointer;
    }

    .clear-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary, #e6edf3);
    }

    .terminal-body {
      padding: 10px;
      overflow-y: auto;
      flex: 1;
      font-size: 0.8rem;
      line-height: 1.4;
    }

    .empty-state {
      color: var(--text-muted, #6e7681);
      font-style: italic;
      padding: 10px 0;
    }

    .log-line {
      display: flex;
      gap: 8px;
      word-break: break-all;
    }

    .line-number {
      color: var(--text-muted, #484f58);
      user-select: none;
      min-width: 24px;
      text-align: right;
    }

    .line-text {
      color: var(--text-primary, #e6edf3);
    }

    .log-line.error .line-text { color: var(--color-danger, #f85149); }
    .log-line.ok .line-text { color: var(--color-success, #3fb950); }
    .log-line.info .line-text { color: var(--color-info, #58a6ff); }
  `]
})
export class TerminalLogViewerComponent {
  public readonly title = input<string>('Terminal Stream');
  public readonly lines = input<readonly string[]>([]);
  public readonly onClear = output<void>();

  private readonly terminalBody = viewChild<ElementRef<HTMLDivElement>>('terminalBody');

  constructor() {
    effect(() => {
      // Auto-scroll when lines change
      const count = this.lines().length;
      if (count > 0) {
        setTimeout(() => {
          const el = this.terminalBody()?.nativeElement;
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        }, 10);
      }
    });
  }

  public getLineClass(line: string): string {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('[fatal]')) return 'error';
    if (lower.includes('[ok]') || lower.includes('success')) return 'ok';
    if (lower.includes('[info]')) return 'info';
    return '';
  }
}
