import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DecomposedTaskPreview {
  title: string;
  role: string;
  priority: 'P0' | 'P1' | 'P2';
}

/**
 * Modal dialogue allowing developers to enter complex, high-level feature epics
 * and decompose them via frontier model into atomic taskcade units of work.
 */
@Component({
  selector: 'app-frontier-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './frontier-modal.component.html',
  styleUrl: './frontier-modal.component.css',
})
export class FrontierModalComponent {
  public readonly isOpen = signal(false);
  public readonly goalText = signal('');
  public readonly isAnalyzing = signal(false);
  public readonly previews = signal<DecomposedTaskPreview[]>([]);

  public readonly committed = output<DecomposedTaskPreview[]>();

  public open(): void {
    this.isOpen.set(true);
  }

  public close(): void {
    this.isOpen.set(false);
    this.goalText.set('');
    this.previews.set([]);
    this.isAnalyzing.set(false);
  }

  public simulateDecomposition(): void {
    this.isAnalyzing.set(true);
    setTimeout(() => {
      this.previews.set([
        { title: 'Define OAuth2 endpoints and interfaces', role: 'architect', priority: 'P0' },
        { title: 'Implement Gitea code exchange HTTP client', role: 'implementer', priority: 'P1' },
        { title: 'Write integration test verifying JWT auth guard', role: 'test_engineer', priority: 'P1' },
      ]);
      this.isAnalyzing.set(false);
    }, 600);
  }

  public commitTasks(): void {
    this.committed.emit(this.previews());
    this.close();
  }
}
