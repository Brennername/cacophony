import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  model,
  computed,
  ElementRef,
  viewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable virtualized ANSI terminal output viewer component.
 * Parses standard ANSI color escapes, enforces strict HTML escaping,
 * maintains auto-scroll lock upon user upward scrolling, and provides
 * one-click clipboard copying and throughput rate monitoring.
 */
@Component({
  selector: 'app-terminal-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terminal-panel.component.html',
  styleUrls: ['./terminal-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalPanelComponent {
  public readonly content = input<string>('');
  public readonly maxLines = input<number>(5000);
  public readonly autoScroll = model<boolean>(true);
  public readonly tokensPerSec = input<number>(0);
  public readonly title = input<string>('Terminal Output');

  public readonly cleared = output<void>();
  public readonly copied = output<void>();

  public readonly terminalBody = viewChild<ElementRef<HTMLDivElement>>('terminalBody');

  public copyFeedback = model<boolean>(false);

  constructor() {
    effect(() => {
      // Trigger scroll whenever content updates if autoScroll is enabled
      const _ = this.content();
      if (this.autoScroll()) {
        setTimeout(() => this.scrollToBottom(), 10);
      }
    });
  }

  /**
   * Sanitizes and parses ANSI color sequences into safe styled HTML spans.
   */
  public readonly parsedHtml = computed<string>(() => {
    const raw = this.content();
    if (!raw) return '<span class="term-muted">No terminal output.</span>';

    // Limit to maxLines to avoid DOM bloat
    const lines = raw.split('\n');
    const truncated = lines.slice(-this.maxLines()).join('\n');

    // Escape HTML characters first
    const escaped = truncated
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Convert common ANSI escape codes to span classes
    const parsed = escaped
      .replace(/\x1b\[0?m/g, '</span>')
      .replace(/\x1b\[1m/g, '<span class="term-bold">')
      .replace(/\x1b\[31m/g, '<span class="term-red">')
      .replace(/\x1b\[32m/g, '<span class="term-green">')
      .replace(/\x1b\[33m/g, '<span class="term-yellow">')
      .replace(/\x1b\[34m/g, '<span class="term-blue">')
      .replace(/\x1b\[35m/g, '<span class="term-magenta">')
      .replace(/\x1b\[36m/g, '<span class="term-cyan">')
      .replace(/\x1b\[90m/g, '<span class="term-muted">');

    return parsed;
  });

  /**
   * Handles user scroll events to detect upward scrolling and pause auto-scroll.
   */
  public handleScroll(): void {
    const el = this.terminalBody()?.nativeElement;
    if (!el) return;

    const threshold = 30;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    if (!isAtBottom && this.autoScroll()) {
      this.autoScroll.set(false);
    }
  }

  /**
   * Toggles auto-scroll lock.
   */
  public toggleAutoScroll(): void {
    const next = !this.autoScroll();
    this.autoScroll.set(next);
    if (next) {
      this.scrollToBottom();
    }
  }

  /**
   * Scrolls the viewport to the bottom.
   */
  public scrollToBottom(): void {
    const el = this.terminalBody()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  /**
   * Copies raw terminal content to clipboard.
   */
  public async copyContent(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(this.content());
        this.copyFeedback.set(true);
        setTimeout(() => this.copyFeedback.set(false), 2000);
      } catch {
        // clipboard access restricted
      }
    }
    this.copied.emit();
  }

  /**
   * Emits clear signal.
   */
  public clearContent(): void {
    this.cleared.emit();
  }
}
