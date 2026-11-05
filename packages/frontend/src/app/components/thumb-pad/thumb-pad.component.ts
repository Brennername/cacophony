import { Component, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface ThumbPadItem {
  readonly id: string;
  readonly letter: string;
  readonly label: string;
  readonly route: string;
  readonly ariaLabel: string;
}

export const DEFAULT_THUMB_PAD_ITEMS: readonly ThumbPadItem[] = [
  { id: 'dash', letter: 'D', label: 'Dash', route: '/dashboard', ariaLabel: 'Dashboard' },
  { id: 'queue', letter: 'Q', label: 'Queue', route: '/queue', ariaLabel: 'Task Queue' },
  { id: 'history', letter: 'H', label: 'Hist', route: '/history', ariaLabel: 'Task History' },
  { id: 'models', letter: 'M', label: 'Models', route: '/models', ariaLabel: 'Model Roster' },
  { id: 'vault', letter: 'V', label: 'Vault', route: '/vault', ariaLabel: 'Frontier Vault' },
  { id: 'testing', letter: 'T', label: 'Test', route: '/testing', ariaLabel: 'Testing Suite' },
];

/**
 * Generalized Mobile Thumb Pad Component.
 * - Displays all items as letters (D, Q, H, M, V, T) on initial visit/refresh.
 * - Expands only the clicked/active route into its short name smoothly with flexbox.
 * - Features an optical acrylic squircle orb selection state.
 * - Projects an offset blurred glass backdrop pane shifted down and right to obscure scrolling content.
 */
@Component({
  selector: 'app-thumb-pad',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './thumb-pad.component.html',
  styleUrl: './thumb-pad.component.css',
})
export class ThumbPadComponent {
  private readonly router = inject(Router);

  public readonly items = input<readonly ThumbPadItem[]>(DEFAULT_THUMB_PAD_ITEMS);

  /**
   * Tracks whether the user has interacted with the thumb pad on this visit.
   * On initial visit or refresh, all items display only single letters.
   */
  public readonly hasInteracted = signal<boolean>(false);
  public readonly activeExpandedId = signal<string | null>(null);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (this.hasInteracted()) {
          this.syncActiveItemWithUrl(event.urlAfterRedirects || event.url);
        }
      });
  }

  public onThumb(item: ThumbPadItem, event: Event): void {
    event.preventDefault();
    this.hasInteracted.set(true);
    this.activeExpandedId.set(item.id);
    this.router.navigateByUrl(item.route);
  }

  public isExpanded(item: ThumbPadItem): boolean {
    if (!this.hasInteracted()) {
      return false;
    }
    return this.activeExpandedId() === item.id;
  }

  public isSelected(item: ThumbPadItem): boolean {
    const currentUrl = this.router.url;
    return currentUrl.startsWith(item.route) || (item.route === '/dashboard' && currentUrl === '/');
  }

  private syncActiveItemWithUrl(url: string): void {
    const matched = this.items().find(
      (item) => url.startsWith(item.route) || (item.route === '/dashboard' && (url === '/' || url === ''))
    );
    if (matched) {
      this.activeExpandedId.set(matched.id);
    }
  }
}
