import { Injectable, signal } from '@angular/core';
import type { PrDiscussionThread, PrDiscussionComment, AdvisoryDomainTag } from '@cacophony/shared-types';

export interface ToastNotification {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  public readonly activeToast = signal<ToastNotification | null>(null);
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  public showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    this.activeToast.set({ message, type });
    this.timeoutHandle = setTimeout(() => {
      this.activeToast.set(null);
    }, 3000);
  }
}

export interface TaskDto {
  id?: string;
  title: string;
  prompt: string;
  role?: string;
  priority?: string;
  modelAssigned?: string | null;
  testCommand?: string | null;
  focusFiles?: string[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class TaskApiService {
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  constructor(private toastService: ToastService) {}

  public async listTasks(): Promise<TaskDto[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch tasks`);
      return await res.json() as TaskDto[];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  public async createTask(dto: TaskDto): Promise<TaskDto | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to create task`);
      return await res.json() as TaskDto;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  public async getTask(taskId: string): Promise<TaskDto | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch task`);
      return await res.json() as TaskDto;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Fetches persisted historical stream log output for a given task (T67.4.1).
   */
  public async replayStreamForTask(taskId: string): Promise<string> {
    this.loading.set(true);
    this.error.set(null);
    try {
      // 1. Try to fetch from stream buffer endpoint if still in memory/buffer
      const bufRes = await fetch(`/api/stream/buffer?taskId=${encodeURIComponent(taskId)}`);
      if (bufRes.ok) {
        const bufData = await bufRes.json() as { buffer?: string };
        if (bufData.buffer && bufData.buffer.trim().length > 0) {
          return bufData.buffer;
        }
      }

      // 2. Fetch full task details and stages
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch task for replay`);
      }
      const data = await res.json() as {
        stages?: Array<{ stageName: string; stageStatus: string; logOutput?: string; errorLog?: string }>;
        logSnippet?: string;
      };

      if (data.stages && data.stages.length > 0) {
        const stageLogs = data.stages
          .filter((s) => (s.logOutput && s.logOutput.trim().length > 0) || (s.errorLog && s.errorLog.trim().length > 0))
          .map((s) => `=== [Stage: ${s.stageName}] Status: ${s.stageStatus} ===\n${s.logOutput || s.errorLog}`)
          .join('\n\n');
        if (stageLogs.trim().length > 0) {
          return stageLogs;
        }
      }
      if (data.logSnippet) {
        return data.logSnippet;
      }
      return '';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return '';
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Fetches full task details with all stage records for inspection.
   */
  public async fetchTaskWithStages(taskId: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async updateTask(taskId: string, dto: Partial<TaskDto>): Promise<TaskDto | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to update task`);
      return await res.json() as TaskDto;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  public async deleteTask(taskId: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to delete task`);
      return res.status === 204;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  public async restartTask(taskName: string): Promise<void> {
    await this.restartProcess(taskName);
  }

  /**
   * Dispatches POST /api/processes/:name/restart and displays a transient toast notification (T65.5.3).
   */
  public async restartProcess(processName: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/processes/${encodeURIComponent(processName)}/restart`, {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to restart process`);
      }
      this.toastService.showToast(`Process ${processName} restarted successfully`, 'success');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      this.toastService.showToast(`Failed to restart process: ${msg}`, 'error');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Dispatches POST /api/processes/:name/terminate and displays a transient toast notification (T65.5.1).
   */
  public async terminateProcess(processName: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/processes/${encodeURIComponent(processName)}/terminate`, {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to terminate process`);
      }
      this.toastService.showToast(`Process ${processName} terminated successfully`, 'success');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      this.toastService.showToast(`Failed to terminate process: ${msg}`, 'error');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Dispatches POST /api/processes/:id/rerun and displays a transient toast notification (T65.7.2).
   */
  public async rerunProcess(processId: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/processes/${encodeURIComponent(processId)}/rerun`, {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to rerun process`);
      }
      this.toastService.showToast(`Process ${processId} rerun dispatched`, 'success');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      this.toastService.showToast(`Failed to rerun process: ${msg}`, 'error');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Fetches Gitea PR discussion threads for a task (T108.8).
   */
  public async getPrDiscussionThreads(taskId: string): Promise<PrDiscussionThread[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/pr/threads`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch PR threads`);
      return (await res.json()) as PrDiscussionThread[];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Submits a discussion comment or advisory feedback on a PR thread (T108.8).
   */
  public async addPrDiscussionComment(
    taskId: string,
    payload: {
      threadId?: string;
      bodyContent: string;
      domainTag?: AdvisoryDomainTag;
      authorName?: string;
      authorRole?: string;
      filePath?: string | null;
      lineNumber?: number | null;
    }
  ): Promise<PrDiscussionComment | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/pr/threads/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to post PR comment`);
      const comment = (await res.json()) as PrDiscussionComment;
      this.toastService.showToast('PR discussion comment posted', 'success');
      return comment;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      this.toastService.showToast(`Failed to post PR comment: ${msg}`, 'error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }
}

