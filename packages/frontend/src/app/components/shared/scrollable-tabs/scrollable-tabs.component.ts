import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  model,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly badge?: string | number;
  readonly closable?: boolean;
}

/**
 * Reusable horizontal scrollable tab strip component.
 * Provides touch-friendly horizontal momentum scrolling, active tab tracking,
 * tab closure handling, and optional addition triggers.
 */
@Component({
  selector: 'app-scrollable-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scrollable-tabs.component.html',
  styleUrls: ['./scrollable-tabs.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollableTabsComponent {
  public readonly tabs = input.required<readonly TabItem[]>();
  public readonly activeTabId = model<string>('');
  public readonly allowAdd = input<boolean>(false);

  public readonly tabSelected = output<string>();
  public readonly tabClosed = output<string>();
  public readonly tabAdded = output<void>();

  public readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  /**
   * Activates the selected tab and notifies parent components.
   */
  public selectTab(id: string): void {
    this.activeTabId.set(id);
    this.tabSelected.emit(id);
  }

  /**
   * Emits closure request for a closable tab item.
   */
  public closeTab(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.tabClosed.emit(id);
  }

  /**
   * Triggers the add tab workflow.
   */
  public addTab(): void {
    this.tabAdded.emit();
  }

  /**
   * Scrolls the tab strip horizontally left or right.
   */
  public scrollTabs(delta: number): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollBy({ left: delta, behavior: 'smooth' });
    }
  }
}
