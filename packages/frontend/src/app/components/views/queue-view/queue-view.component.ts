import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueueManagerComponent } from '../../queue-manager/queue-manager.component';

/**
 * Dedicated Task Queue Management route view:
 * Full task queue management, drag-and-drop reordering, priority filters, and enqueue drawer.
 */
@Component({
  selector: 'app-queue-view',
  standalone: true,
  imports: [CommonModule, QueueManagerComponent],
  templateUrl: './queue-view.component.html',
  styleUrl: './queue-view.component.css',
})
export class QueueViewComponent {}
