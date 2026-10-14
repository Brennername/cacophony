import { Component, Input, OnInit, signal, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalTab = 'full_output' | 'failing_assertions' | 'code_diffs' | 'environment_variables';

/**
 * TestRunDetailModalComponent
 *
 * Deep inspection modal for completed or failed test executions (Phase 59: T59.6).
 * Renders tabbed views: Full Output, Failing Assertions, Code Diffs, and Environment Variables.
 * Fully accessible with Escape key dismiss, backdrop click handling, and mobile-first responsive layout.
 */
@Component({
  selector: 'app-test-run-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-run-modal.component.html',
  styleUrl: './test-run-modal.component.css',
})
export class TestRunModalComponent implements OnInit {
  @Input() public task: any | null = null;
  @Output() public closed = new EventEmitter<void>();

  public readonly isOpen = signal<boolean>(false);
  public readonly activeTab = signal<ModalTab>('full_output');

  public fullOutput = '';
  public failingAssertions: string[] = [];
  public codeDiffs = '';
  public environmentVariables: Record<string, string> = {};

  @HostListener('document:keydown.escape')
  public handleEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  public ngOnInit(): void {
    if (this.task) {
      this.open(this.task);
    }
  }

  public open(taskData?: any): void {
    if (taskData) {
      this.task = taskData;
      this.fullOutput = taskData.fullOutput || taskData.logSnippet || taskData.command || 'No execution output.';
      this.failingAssertions = taskData.failingAssertions || (taskData.failureReason ? [taskData.failureReason] : []);
      this.codeDiffs = taskData.codeDiffs || taskData.diff || '';
      this.environmentVariables = taskData.environmentVariables || {
        NODE_ENV: 'test',
        AUTONOMOUS_TEST_GATE: 'strict',
        PORT: '24161'
      };
    }
    this.isOpen.set(true);
  }

  public close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  public setTab(tab: ModalTab): void {
    this.activeTab.set(tab);
  }

  public getEnvKeys(): string[] {
    return Object.keys(this.environmentVariables);
  }
}
