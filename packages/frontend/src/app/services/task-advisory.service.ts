import { Injectable, signal } from '@angular/core';
import type {
  TaskAdvisoryGuidance,
  AdvisoryType,
} from '@cacophony/shared-types';

export interface AddTaskCommentRequest {
  taskId: string;
  commentText: string;
  author?: string;
  advisoryType?: AdvisoryType;
  requiresComplianceAudit?: boolean;
}

/**
 * Service managing operator advisory guidance, instructions, and review notes
 * attached to queued arena tasks.
 */
@Injectable({
  providedIn: 'root',
})
export class TaskAdvisoryService {
  public readonly comments = signal<readonly TaskAdvisoryGuidance[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  /**
   * Loads operator guidance for a specified task.
   */
  public async loadComments(taskId: string): Promise<readonly TaskAdvisoryGuidance[]> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/comments`, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Failed to load task comments (${res.status})`);
      }

      const list = (await res.json()) as TaskAdvisoryGuidance[];
      this.comments.set(list);
      return list;
    } catch (err: any) {
      this.error.set(err.message || 'Error loading task advisory comments');
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Records a new operator guidance comment on a queued task.
   */
  public async addComment(
    request: AddTaskCommentRequest,
  ): Promise<TaskAdvisoryGuidance | null> {
    this.error.set(null);

    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(request.taskId)}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          commentText: request.commentText,
          author: request.author || 'Operator',
          advisoryType: request.advisoryType || 'INSTRUCTION',
          requiresComplianceAudit:
            request.requiresComplianceAudit !== undefined
              ? request.requiresComplianceAudit
              : true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to record advisory guidance (${res.status})`);
      }

      const data = (await res.json()) as { success: boolean; guidance: TaskAdvisoryGuidance };
      this.comments.update((prev) => [...prev, data.guidance]);
      return data.guidance;
    } catch (err: any) {
      this.error.set(err.message || 'Error adding task comment');
      return null;
    }
  }

  /**
   * Deletes an advisory guidance entry.
   */
  public async deleteComment(taskId: string, commentId: string): Promise<boolean> {
    this.error.set(null);

    try {
      const res = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`,
        { method: 'DELETE' },
      );

      if (!res.ok) {
        throw new Error(`Failed to delete guidance comment (${res.status})`);
      }

      this.comments.update((prev) => prev.filter((c) => c.id !== commentId));
      return true;
    } catch (err: any) {
      this.error.set(err.message || 'Error deleting task comment');
      return false;
    }
  }
}
