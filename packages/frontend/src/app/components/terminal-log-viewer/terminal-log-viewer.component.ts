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
  templateUrl: './terminal-log-viewer.component.html',
  styleUrl: './terminal-log-viewer.component.css',
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
