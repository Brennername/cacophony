import { Component, input, signal, inject, OnInit } from '@angular/core';
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
 * - Actively highlights and expands the active route if it exists in the thumb bar.
 * - Returns to default (all single letters, no selection) when navigating to non-thumb routes.
 * - Smoothly scrolls to the top of the route header when touching any thumb bar route.
 * - Features an optical acrylic squircle orb selection state and offset blur pane.
 */
@Component({
  selector: 'app-thumb-pad',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './thumb-pad.component.html',
  styleUrl: './thumb-pad.component.css',
})
export class ThumbPadComponent implements OnInit {
  private readonly router = inject(Router);

  public readonly items = input<readonly ThumbPadItem[]>(DEFAULT_THUMB_PAD_ITEMS);

  /**
   * Tracks user interaction state.
   */
  public readonly hasInteracted = signal<boolean>(false);
  public readonly activeExpandedId = signal<string | null>(null);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncActiveItemWithUrl(event.urlAfterRedirects || event.url);
      });
  }

  public ngOnInit(): void {
    this.syncActiveItemWithUrl(this.router.url);
  }

  public onThumb(item: ThumbPadItem, event: Event): void {
    event.preventDefault();
    this.hasInteracted.set(true);
    this.activeExpandedId.set(item.id);
    void this.router.navigateByUrl(item.route).then(() => {
      this.scrollToTop();
    });
    this.scrollToTop();
  }

  public isExpanded(item: ThumbPadItem): boolean {
    return this.activeExpandedId() === item.id;
  }

  public isSelected(item: ThumbPadItem): boolean {
    return this.activeExpandedId() === item.id;
  }

  /**
   * Smoothly scrolls the window, document body, and scrollable container elements
   * to top position so the route header is visible.
   */
  public scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const main = document.querySelector('.main-content');
      if (main) {
        main.scrollTop = 0;
      }
      const layout = document.querySelector('.app-layout');
      if (layout) {
        layout.scrollTop = 0;
      }
      const header = document.querySelector('header.top-nav-header, .view-header, .dashboard-grid, main');
      if (header && typeof header.scrollIntoView === 'function') {
        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  public syncActiveItemWithUrl(url: string): void {
    if (!url) {
      this.activeExpandedId.set(null);
      return;
    }
    const cleanUrl = url.split('?')[0].split('#')[0];
    const matched = this.items().find((item) => {
      if (item.route === '/dashboard') {
        return cleanUrl === '/dashboard' || cleanUrl === '/' || cleanUrl === '' || cleanUrl.startsWith('/tasks/');
      }
      return cleanUrl === item.route || cleanUrl.startsWith(`${item.route}/`);
    });

    if (matched) {
      this.activeExpandedId.set(matched.id);
    } else {
      // Non-thumb-bar route (e.g. /settings, /repomap, /issues, /processes): deselect and collapse all items
      this.activeExpandedId.set(null);
    }
  }
}

