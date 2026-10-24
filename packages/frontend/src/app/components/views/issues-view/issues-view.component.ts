import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IssuesService } from '../../../services/issues.service';
import { AuthService } from '../../../services/auth.service';
import {
  ScrollableTabsComponent,
  TabItem,
  MetricCardComponent,
} from '../../shared';
import type { HitlTicketRecord } from '@cacophony/shared-types';

/**
 * Contributor Issues & Ticket Tracker Portal (Phase S2 T-S2.2).
 * Allows contributors and visitors to monitor issue progress through the arena lifecycle,
 * submit bug reports via public GitHub Issues, and provide feedback on active tickets.
 */
@Component({
  selector: 'app-issues-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollableTabsComponent,
    MetricCardComponent,
  ],
  templateUrl: './issues-view.component.html',
  styleUrls: ['./issues-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuesViewComponent implements OnInit {
  public readonly issuesService = inject(IssuesService);
  public readonly authService = inject(AuthService);

  public readonly activeTab = signal<string>('all');
  public readonly feedbackModalOpen = signal<boolean>(false);
  public readonly selectedTicket = signal<HitlTicketRecord | null>(null);
  public readonly feedbackContent = signal<string>('');

  public readonly filterTabs: readonly TabItem[] = [
    { id: 'all', label: 'All Issues' },
    { id: 'pending', label: 'HITL Review Pending' },
    { id: 'enqueued', label: 'Enqueued in Arena' },
    { id: 'in_progress', label: 'Testing & Refining' },
    { id: 'completed', label: 'Completed & Merged' },
  ];

  public readonly filteredTickets = computed<readonly HitlTicketRecord[]>(() => {
    const list = this.issuesService.tickets();
    const tab = this.activeTab();

    if (tab === 'pending') {
      return list.filter((t) => t.status === 'HITL_PENDING');
    }
    if (tab === 'enqueued') {
      return list.filter((t) => t.status === 'ENQUEUED');
    }
    if (tab === 'in_progress') {
      return list.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'REVIEW_PENDING');
    }
    if (tab === 'completed') {
      return list.filter((t) => t.status === 'COMPLETED');
    }
    return list;
  });

  public readonly pendingCount = computed<number>(() => {
    return this.issuesService.tickets().filter((t) => t.status === 'HITL_PENDING').length;
  });

  public readonly enqueuedCount = computed<number>(() => {
    return this.issuesService.tickets().filter((t) => t.status === 'ENQUEUED' || t.status === 'IN_PROGRESS').length;
  });

  public readonly completedCount = computed<number>(() => {
    return this.issuesService.tickets().filter((t) => t.status === 'COMPLETED').length;
  });

  public async ngOnInit(): Promise<void> {
    await this.issuesService.loadTickets();
  }

  public onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  public openFeedbackModal(ticket: HitlTicketRecord): void {
    this.selectedTicket.set(ticket);
    this.feedbackContent.set('');
    this.feedbackModalOpen.set(true);
  }

  public closeFeedbackModal(): void {
    this.feedbackModalOpen.set(false);
    this.selectedTicket.set(null);
  }

  public async submitFeedback(): Promise<void> {
    const ticket = this.selectedTicket();
    const content = this.feedbackContent().trim();
    if (!ticket || !content) return;

    const author = this.authService.session().username || 'contributor';
    await this.issuesService.submitFeedback(ticket.id, { author, content });
    this.closeFeedbackModal();
  }

  public getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'status-completed';
      case 'ENQUEUED':
      case 'IN_PROGRESS':
        return 'status-active';
      case 'HITL_PENDING':
        return 'status-pending';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return 'status-default';
    }
  }
}
