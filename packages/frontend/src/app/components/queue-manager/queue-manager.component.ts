import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * Queue Management component providing task re-ordering, priority tagging,
 * scheduler daemon lifecycle controls (pause/resume), and task enqueue form.
 */
@Component({
  selector: 'app-queue-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './queue-manager.component.html',
  styleUrl: './queue-manager.component.css',
})
export class QueueManagerComponent {
  private readonly store = inject(ArenaStateStore);
  public readonly tasks = this.store.tasks;
  public readonly pendingCount = this.store.pendingCount;
  public readonly schedulerPaused = this.store.schedulerPaused;
  public readonly canMutateTasks = this.store.canMutateTasks;
  public readonly currentUserRole = this.store.currentUserRole;

  public readonly pageSize = 25;
  public readonly currentPage = signal<number>(1);

  public readonly totalPages = computed(() => {
    const count = this.tasks().length;
    return Math.max(1, Math.ceil(count / this.pageSize));
  });

  public readonly paginatedTasks = computed(() => {
    const list = this.tasks();
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  public newTitle = signal<string>('');
  public newPriority = signal<'P0' | 'P1' | 'P2'>('P1');

  public setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  public drillDown(task: any): void {
    void this.store.selectTask(task);
  }

  public toggleScheduler(): void {
    this.store.toggleScheduler();
  }

  public move(taskId: string, direction: 'up' | 'down'): void {
    this.store.moveTaskPriority(taskId, direction);
  }

  public submitTask(): void {
    const title = this.newTitle().trim();
    if (!title) return;
    this.store.addTask(title, this.newPriority());
    this.newTitle.set('');
  }

  public formatCreatedTime(isoStr: string | null | undefined): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  }
}
