import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HardwareMonitorComponent } from '../hardware-monitor/hardware-monitor.component';
import { TaskInspectorComponent } from '../task-inspector/task-inspector.component';
import { QueueManagerComponent } from '../queue-manager/queue-manager.component';
import { ArenaStateStore } from '../../services/arena-state.store';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [
    CommonModule,
    HardwareMonitorComponent,
    TaskInspectorComponent,
    QueueManagerComponent,
  ],
  template: `
    <div class="dashboard-grid">
      <!-- Hardware Telemetry Diagnostics -->
      <section class="grid-card-wrapper">
        <app-hardware-monitor />
      </section>

      <!-- Active Running Task Stepper & Log Stream -->
      <section class="grid-card-wrapper">
        <app-task-inspector />
      </section>

      <!-- Compact Queue Snapshot -->
      <section class="grid-card-wrapper full-width">
        <app-queue-manager />
      </section>

      <!-- Gitea Service Status Indicator -->
      <section class="grid-card-wrapper">
        <div *ngIf="giteaStatus === 'online'" class="status-indicator online">Gitea Online</div>
        <div *ngIf="giteaStatus === 'offline'" class="status-indicator offline">Gitea Offline</div>
      </section>

      <!-- Database Service Status Indicator -->
      <section class="grid-card-wrapper">
        <div *ngIf="dbStatus === 'online'" class="status-indicator online">Database Online</div>
        <div *ngIf="dbStatus === 'offline'" class="status-indicator offline">Database Offline</div>
      </section>

      <!-- Ollama Service Status Indicator -->
      <section class="grid-card-wrapper">
        <div *ngIf="ollamaStatus === 'online'" class="status-indicator online">Ollama Online</div>
        <div *ngIf="ollamaStatus === 'offline'" class="status-indicator offline">Ollama Offline</div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      grid-auto-flow: dense;
      gap: 1.25rem;
      align-items: stretch;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    @media (min-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .full-width {
        grid-column: span 3;
      }
    }

    .grid-card-wrapper {
      display: flex;
      flex-direction: column;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .grid-card-wrapper > * {
      flex: 1;
      height: 100%;
      min-width: 0;
      max-width: 100%;
    }

    .status-indicator {
      padding: 0.5rem;
      text-align: center;
      font-weight: bold;
    }

    .online {
      background-color: #4caf50;
      color: white;
    }

    .offline {
      background-color: #f44336;
      color: white;
    }
  `],
})
export class DashboardViewComponent implements OnInit {
  public readonly store = inject(ArenaStateStore);
  private readonly route = inject(ActivatedRoute);

  public giteaStatus: 'online' | 'offline' = 'offline';
  public dbStatus: 'online' | 'offline' = 'offline';
  public ollamaStatus: 'online' | 'offline' = 'offline';

  public ngOnInit(): void {
    const taskId = this.route.snapshot.paramMap.get('id');
    if (taskId) {
      void this.store.selectTask(taskId);
    }

    // Simulate fetching service statuses
    setTimeout(() => {
      this.giteaStatus = Math.random() > 0.5 ? 'online' : 'offline';
      this.dbStatus = Math.random() > 0.5 ? 'online' : 'offline';
      this.ollamaStatus = Math.random() > 0.5 ? 'online' : 'offline';
    }, 1000);
  }
}