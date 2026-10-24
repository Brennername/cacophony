import { Injectable, signal } from '@angular/core';
import type {
  HitlTicketRecord,
  HitlTicketStatus,
  HitlTicketPriority,
} from '@cacophony/shared-types';

export interface TicketFilterOptions {
  status?: HitlTicketStatus;
  priority?: HitlTicketPriority;
  author?: string;
  limit?: number;
  offset?: number;
}

/**
 * Service managing contributor issues, HITL ticket synchronization,
 * and administrative review gateways.
 */
@Injectable({
  providedIn: 'root',
})
export class IssuesService {
  public readonly tickets = signal<readonly HitlTicketRecord[]>([]);
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  /**
   * Fetches HITL tickets with optional filtering.
   */
  public async loadTickets(options?: TicketFilterOptions): Promise<readonly HitlTicketRecord[]> {
    this.loading.set(true);
    this.error.set(null);

    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.priority) params.set('priority', options.priority);
    if (options?.author) params.set('author', options.author);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const token = typeof localStorage !== 'undefined'
      ? localStorage.getItem('cacophony-jwt-session') || ''
      : '';

    try {
      const res = await fetch(`/api/hitl/tickets?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load tickets (${res.status})`);
      }

      const data = (await res.json()) as { tickets: HitlTicketRecord[] };
      this.tickets.set(data.tickets || []);
      return data.tickets || [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Triggers background GitHub issue poll and ingestion.
   */
  public async syncGitHubIssues(): Promise<number> {
    const token = typeof localStorage !== 'undefined'
      ? localStorage.getItem('cacophony-jwt-session') || ''
      : '';

    const res = await fetch('/api/hitl/sync', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error(`Sync failed (${res.status})`);
    }

    const data = (await res.json()) as { count: number };
    await this.loadTickets();
    return data.count;
  }

  /**
   * Approves a ticket, converting it to an arena task and marking it ENQUEUED.
   */
  public async approveTicket(
    id: string,
    overrides?: { prompt?: string; priority?: HitlTicketPriority },
  ): Promise<void> {
    const token = typeof localStorage !== 'undefined'
      ? localStorage.getItem('cacophony-jwt-session') || ''
      : '';

    const res = await fetch(`/api/hitl/tickets/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(overrides || {}),
    });

    if (!res.ok) {
      throw new Error(`Approval failed (${res.status})`);
    }

    await this.loadTickets();
  }

  /**
   * Rejects a ticket with an administrative reason.
   */
  public async rejectTicket(id: string, reason: string): Promise<void> {
    const token = typeof localStorage !== 'undefined'
      ? localStorage.getItem('cacophony-jwt-session') || ''
      : '';

    const res = await fetch(`/api/hitl/tickets/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      throw new Error(`Rejection failed (${res.status})`);
    }

    await this.loadTickets();
  }

  /**
   * Submits contributor clarification feedback for an active ticket.
   */
  public async submitFeedback(
    id: string,
    feedback: { author: string; content: string },
  ): Promise<void> {
    const res = await fetch(`/api/hitl/tickets/${id}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(feedback),
    });

    if (!res.ok) {
      throw new Error(`Submitting feedback failed (${res.status})`);
    }

    await this.loadTickets();
  }
}
