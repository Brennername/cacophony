import { Injectable, signal } from '@angular/core';

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
}
