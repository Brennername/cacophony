import { Injectable, signal } from '@angular/core';

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
}
