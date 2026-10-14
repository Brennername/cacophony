import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore, ProcessItem } from '../../services/arena-state.store';
import { TaskApiService } from '../../services/task-api.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

/**
 * ProcessDrawerComponent
 *
 * Implements a mobile-first, collapsible drawer displaying active system processes,
 * real-time CPU and RSS memory metrics, and role-gated operator controls for
 * process restart and termination with confirmation modals (T65.4, T65.5).
 */
@Component({
  selector: 'app-process-drawer',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  templateUrl: './process-drawer.component.html',
  styleUrl: './process-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessDrawerComponent {
  private readonly arenaStore = inject(ArenaStateStore);
  private readonly taskApiService = inject(TaskApiService);
  private readonly authService = inject(AuthService);

  public readonly confirmationDialog = viewChild(ConfirmationDialogComponent);

  public readonly isExpanded = signal<boolean>(false);
  public readonly pendingAction = signal<'restart' | 'terminate' | null>(null);
  public readonly targetProcess = signal<ProcessItem | null>(null);

  public readonly processes = computed<ProcessItem[]>(() => this.arenaStore.processes());

  public readonly activeProcessCount = computed<number>(() => {
    return this.processes().filter((p) => p.status === 'RUNNING').length;
  });

  public readonly totalRssGb = computed<string>(() => {
    const totalMb = this.processes().reduce(
      (sum, p) => sum + (p.rssMemoryMb || 0),
      0
    );
    return (totalMb / 1024).toFixed(1);
  });

  public readonly headerSummary = computed<string>(() => {
    const count = this.activeProcessCount();
    const rss = this.totalRssGb();
    return `${count} System Processes Active - ${rss} GB RSS`;
  });

  public readonly canManageProcesses = computed<boolean>(() => {
    return this.authService.isAuthorized('OPERATOR');
  });

  public toggleDrawer(): void {
    this.isExpanded.update((v) => !v);
  }

  public isCriticalInfrastructure(name?: string): boolean {
    if (!name) return false;
    const lower = name.toLowerCase();
    return (
      lower.includes('ollama') ||
      lower.includes('pglite') ||
      lower.includes('postgres') ||
      lower.includes('authentik') ||
      lower.includes('gitea')
    );
  }

  public requestRestart(proc: ProcessItem): void {
    if (!this.canManageProcesses()) return;
    this.targetProcess.set(proc);
    this.pendingAction.set('restart');

    const procName = proc.name || proc.id;
    if (this.isCriticalInfrastructure(procName)) {
      this.confirmationDialog()?.open(procName);
    } else {
      this.executeRestart(procName);
    }
  }

  public requestTerminate(proc: ProcessItem): void {
    if (!this.canManageProcesses()) return;
    this.targetProcess.set(proc);
    this.pendingAction.set('terminate');
    const procName = proc.name || proc.id;
    this.confirmationDialog()?.open(procName);
  }

  public async onConfirmedAction(serviceName: string): Promise<void> {
    const action = this.pendingAction();
    const proc = this.targetProcess();
    const name = serviceName || proc?.name || proc?.id || '';

    if (!name) return;

    if (action === 'restart') {
      await this.executeRestart(name);
    } else if (action === 'terminate') {
      await this.executeTerminate(name);
    }

    this.pendingAction.set(null);
    this.targetProcess.set(null);
  }

  public onCancelledAction(): void {
    this.pendingAction.set(null);
    this.targetProcess.set(null);
  }

  private async executeRestart(name: string): Promise<void> {
    await this.taskApiService.restartProcess(name);
  }

  private async executeTerminate(name: string): Promise<void> {
    await this.taskApiService.terminateProcess(name);
  }
}
