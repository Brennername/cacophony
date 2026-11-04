import { Component, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Responsive collapsible container for lengthy terminal logs and compiler diagnostics.
 * On desktop (>= 1024px), defaults to collapsed summary pill to prevent visual clutter.
 * On mobile/tablet (< 1024px), defaults to open/expanded flow to avoid trapped scrollbars.
 */
@Component({
  selector: 'app-collapsible-output',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './collapsible-output.component.html',
  styleUrl: './collapsible-output.component.css'
})
export class CollapsibleOutputComponent implements OnInit {
  public readonly title = input<string>('Output Log');
  public readonly content = input<string>('');
  public readonly lineCount = input<number | undefined>(undefined);
  public readonly badge = input<string | undefined>(undefined);

  public readonly isExpanded = signal<boolean>(false);
  public readonly copied = signal<boolean>(false);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      // Mobile and tablet viewports default to expanded flow (no click barrier)
      const isMobileOrTablet = window.innerWidth < 1024;
      this.isExpanded.set(isMobileOrTablet);
    }
  }

  public toggle(): void {
    this.isExpanded.set(!this.isExpanded());
  }

  public async copyContent(event: Event): Promise<void> {
    event.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(this.content());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
