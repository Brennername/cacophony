import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  model,
  HostListener,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly route?: string;
  readonly badge?: string | number;
  readonly disabled?: boolean;
}

export interface MenuGroup {
  readonly id: string;
  readonly title?: string;
  readonly items: readonly MenuItem[];
}

export interface UserProfile {
  readonly username: string;
  readonly email?: string;
  readonly role?: string;
  readonly avatarUrl?: string;
}

/**
 * Anti-clutter responsive collapsible sidebar navigation component.
 * Supports off-canvas drawer mode on mobile screens (< 768px),
 * compact icon-only mode (64px) on desktop, and expanded mode (260px).
 * Listens for Ctrl+B / Cmd+B keyboard shortcuts to toggle collapse state.
 */
@Component({
  selector: 'app-collapsible-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collapsible-sidebar.component.html',
  styleUrls: ['./collapsible-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollapsibleSidebarComponent implements OnInit {
  private static readonly STORAGE_KEY = 'sidebar_collapsed';

  public readonly menuGroups = input.required<readonly MenuGroup[]>();
  public readonly collapsed = model<boolean>(false);
  public readonly userProfile = input<UserProfile | null>(null);

  public readonly navigated = output<string>();
  public readonly collapseToggled = output<boolean>();

  public mobileDrawerOpen = model<boolean>(false);

  public ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(CollapsibleSidebarComponent.STORAGE_KEY);
      if (stored !== null) {
        this.collapsed.set(stored === 'true');
      }
    }
  }

  /**
   * Keyboard shortcut listener: Ctrl+B or Cmd+B toggles desktop collapse state.
   */
  @HostListener('window:keydown', ['$event'])
  public handleKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      this.toggleCollapse();
    }
  }

  /**
   * Toggles collapsed state and updates local storage persistence.
   */
  public toggleCollapse(): void {
    const nextState = !this.collapsed();
    this.collapsed.set(nextState);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CollapsibleSidebarComponent.STORAGE_KEY, String(nextState));
    }
    this.collapseToggled.emit(nextState);
  }

  /**
   * Toggles mobile off-canvas drawer visibility.
   */
  public toggleMobileDrawer(): void {
    this.mobileDrawerOpen.update((val) => !val);
  }

  /**
   * Closes mobile drawer when clicking overlay or selecting an item.
   */
  public closeMobileDrawer(): void {
    this.mobileDrawerOpen.set(false);
  }

  /**
   * Handles selection of a menu navigation item.
   */
  public selectItem(item: MenuItem): void {
    if (item.disabled) return;
    this.navigated.emit(item.id);
    this.closeMobileDrawer();
  }
}
