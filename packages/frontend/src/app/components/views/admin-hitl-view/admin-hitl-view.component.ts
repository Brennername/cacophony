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
import {
  ScrollableTabsComponent,
  TabItem,
  MetricCardComponent,
} from '../../shared';
import type {
  HitlTicketRecord,
  HitlTicketPriority,
} from '@cacophony/shared-types';

/**
 * Administrative Human-In-The-Loop (HITL) Gateway View (Phase S1 T-S1.3).
 * Provides an authorized gateway for reviewing incoming community tickets,
 * inspecting prompt slipstream security risk scores, modifying sanitized prompts,
 * and approving arena dispatch or rejecting bad-faith submissions.
 */
@Component({
  selector: 'app-admin-hitl-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollableTabsComponent,
    MetricCardComponent,
  ],
  templateUrl: './admin-hitl-view.component.html',
  styleUrls: ['./admin-hitl-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHitlViewComponent implements OnInit {
  public readonly issuesService = inject(IssuesService);

  public readonly activeTab = signal<string>('pending');
  public readonly selectedTicket = signal<HitlTicketRecord | null>(null);
  public readonly editedPrompt = signal<string>('');
  public readonly editedPriority = signal<HitlTicketPriority>('P1');
  public readonly rejectionReason = signal<string>('');
  public readonly isRejectModalOpen = signal<boolean>(false);
  public readonly syncMessage = signal<string | null>(null);

  public readonly filterTabs: readonly TabItem[] = [
    { id: 'pending', label: 'Pending Review' },
    { id: 'enqueued', label: 'Enqueued' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All Tickets' },
  ];

  public readonly filteredTickets = computed<readonly HitlTicketRecord[]>(() => {
    const list = this.issuesService.tickets();
    const tab = this.activeTab();

    if (tab === 'pending') {
      return list.filter((t) => t.status === 'HITL_PENDING');
    }
    if (tab === 'enqueued') {
      return list.filter((t) => t.status === 'ENQUEUED' || t.status === 'IN_PROGRESS');
    }
    if (tab === 'rejected') {
      return list.filter((t) => t.status === 'REJECTED');
    }
    return list;
  });

  public readonly pendingCount = computed<number>(() => {
    return this.issuesService.tickets().filter((t) => t.status === 'HITL_PENDING').length;
  });

  public readonly highRiskCount = computed<number>(() => {
    return this.issuesService.tickets().filter((t) => (t.riskScore ?? 0) >= 0.5).length;
  });

  public async ngOnInit(): Promise<void> {
    await this.loadTickets();
  }

  public async loadTickets(): Promise<void> {
    const list = await this.issuesService.loadTickets();
    if (list.length > 0 && !this.selectedTicket()) {
      this.selectTicket(list[0]);
    }
  }

  public onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
    const filtered = this.filteredTickets();
    if (filtered.length > 0) {
      this.selectTicket(filtered[0]);
    } else {
      this.selectedTicket.set(null);
    }
  }

  public selectTicket(ticket: HitlTicketRecord): void {
    this.selectedTicket.set(ticket);
    this.editedPrompt.set(ticket.sanitizedPrompt || '');
    this.editedPriority.set(ticket.priority);
  }

  public async syncWithGitHub(): Promise<void> {
    this.syncMessage.set('Polling GitHub public repository...');
    try {
      const count = await this.issuesService.syncGitHubIssues();
      this.syncMessage.set(`Sync complete. Ingested ${count} new external issues.`);
      setTimeout(() => this.syncMessage.set(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.syncMessage.set(`Sync error: ${msg}`);
    }
  }

  public async approveTicket(): Promise<void> {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    await this.issuesService.approveTicket(ticket.id, {
      prompt: this.editedPrompt(),
      priority: this.editedPriority(),
    });

    const remaining = this.filteredTickets();
    if (remaining.length > 0) {
      this.selectTicket(remaining[0]);
    } else {
      this.selectedTicket.set(null);
    }
  }

  public openRejectModal(): void {
    this.rejectionReason.set('Issue out of scope or security risk identified.');
    this.isRejectModalOpen.set(true);
  }

  public closeRejectModal(): void {
    this.isRejectModalOpen.set(false);
  }

  public async confirmReject(): Promise<void> {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    await this.issuesService.rejectTicket(ticket.id, this.rejectionReason());
    this.closeRejectModal();

    const remaining = this.filteredTickets();
    if (remaining.length > 0) {
      this.selectTicket(remaining[0]);
    } else {
      this.selectedTicket.set(null);
    }
  }

  public getRiskStatus(score?: number | null): 'nominal' | 'warning' | 'critical' {
    const val = score ?? 0;
    if (val >= 0.7) return 'critical';
    if (val >= 0.3) return 'warning';
    return 'nominal';
  }
}
