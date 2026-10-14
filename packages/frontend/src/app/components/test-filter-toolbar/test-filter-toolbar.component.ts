import {
  Component,
  input,
  output,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type TestFilterOption = 'ALL' | 'PASSED' | 'FAILED' | 'RUNNING';

/**
 * TestFilterToolbarComponent
 *
 * Provides responsive, touch-friendly filter pills (ALL, PASSED, FAILED, RUNNING)
 * and a 200ms debounced search input for filtering test executions by task ID,
 * test command, or failing test file name (Phase 65: T65.3).
 */
@Component({
  selector: 'app-test-filter-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-filter-toolbar.component.html',
  styleUrl: './test-filter-toolbar.component.css',
})
export class TestFilterToolbarComponent implements OnDestroy {
  // Inputs using modern Angular signals
  public readonly activeFilter = input<TestFilterOption>('ALL');
  public readonly searchQuery = input<string>('');
  public readonly totalCount = input<number>(0);
  public readonly passedCount = input<number>(0);
  public readonly failedCount = input<number>(0);
  public readonly runningCount = input<number>(0);

  // Outputs
  public readonly filterChange = output<TestFilterOption>();
  public readonly searchChange = output<string>();

  // Internal search state and debounce timer
  public readonly searchInputState = signal<string>('');
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  public setFilter(option: TestFilterOption): void {
    if (this.activeFilter() !== option) {
      this.filterChange.emit(option);
    }
  }

  /**
   * Handles user keystroke input with 200ms debounce to prevent
   * excessive UI re-filtering or route state churn (T65.3.2).
   */
  public onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target ? target.value : '';
    this.searchInputState.set(value);

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.searchChange.emit(value.trim());
      this.debounceTimer = null;
    }, 200);
  }

  public clearSearch(): void {
    this.searchInputState.set('');
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.searchChange.emit('');
  }

  public ngOnDestroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
