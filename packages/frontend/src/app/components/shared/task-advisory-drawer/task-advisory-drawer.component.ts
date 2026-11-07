import {
  Component,
  ChangeDetectionStrategy,
  input,
  model,
  signal,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskAdvisoryService } from '../../../services/task-advisory.service.js';
import type { AdvisoryType } from '@cacophony/shared-types';

/**
 * Mobile-first slide-out drawer allowing operators to attach recommendations,
 * architectural constraints, and review instructions to queued arena tasks.
 */
@Component({
  selector: 'app-task-advisory-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-advisory-drawer.component.html',
  styleUrls: ['./task-advisory-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAdvisoryDrawerComponent {
  public readonly advisoryService = inject(TaskAdvisoryService);

  public readonly isOpen = model<boolean>(false);
  public readonly taskId = input.required<string>();
  public readonly taskTitle = input<string>('');

  public readonly commentText = signal<string>('');
  public readonly advisoryType = signal<AdvisoryType>('INSTRUCTION');
  public readonly requiresAudit = signal<boolean>(true);

  constructor() {
    effect(() => {
      if (this.isOpen() && this.taskId()) {
        this.advisoryService.loadComments(this.taskId());
      }
    });
  }

  public close(): void {
    this.isOpen.set(false);
  }

  public async onSubmitComment(): Promise<void> {
    const text = this.commentText().trim();
    if (!text) return;

    const res = await this.advisoryService.addComment({
      taskId: this.taskId(),
      commentText: text,
      author: 'Operator',
      advisoryType: this.advisoryType(),
      requiresComplianceAudit: this.requiresAudit(),
    });

    if (res) {
      this.commentText.set('');
    }
  }

  public async onDeleteComment(commentId: string): Promise<void> {
    await this.advisoryService.deleteComment(this.taskId(), commentId);
  }
}
