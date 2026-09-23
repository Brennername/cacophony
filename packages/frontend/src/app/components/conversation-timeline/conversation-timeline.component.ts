import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TimelineMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  readonly content: string;
  readonly tokens?: number;
  readonly timestamp?: string;
  readonly toolName?: string;
}

/**
 * Renders conversation message timeline, code highlighting accents, token counters, and tool output accordions.
 */
@Component({
  selector: 'app-conversation-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-container">
      <header class="timeline-header">
        <span class="timeline-title">Conversation Stream</span>
        <div class="metrics-badge">
          <span>Total Tokens: {{ totalTokens() }}</span>
        </div>
      </header>

      <div class="messages-list">
        @for (msg of messages(); track msg.id) {
          <article class="message-card" [class]="msg.role">
            <div class="message-meta">
              <span class="role-badge">{{ msg.role.toUpperCase() }}</span>
              @if (msg.tokens) {
                <span class="tokens-badge">{{ msg.tokens }} tokens</span>
              }
              @if (msg.toolName) {
                <span class="tool-badge">Tool: {{ msg.toolName }}</span>
              }
            </div>

            <div class="message-body">
              <pre class="content-text">{{ msg.content }}</pre>
            </div>
          </article>
        } @empty {
          <div class="empty-state">
            <p>No messages in this session yet. Submit a prompt below to begin.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .timeline-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-surface, #1e1e24);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border-color, #2d2d38);
    }
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color, #2d2d38);
      background: var(--bg-card, #18181f);
    }
    .timeline-title {
      font-weight: 600;
      color: var(--text-primary, #f8fafc);
      font-size: 0.95rem;
    }
    .metrics-badge {
      font-size: 0.8rem;
      color: var(--color-primary, #38bdf8);
      font-family: monospace;
    }
    .messages-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .message-card {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      border: 1px solid var(--border-color, #2d2d38);
      background: var(--bg-card, #262633);
    }
    .message-card.user {
      border-left: 4px solid var(--color-primary, #38bdf8);
    }
    .message-card.assistant {
      border-left: 4px solid var(--color-success, #10b981);
    }
    .message-card.tool {
      border-left: 4px solid var(--color-warning, #f59e0b);
    }
    .message-card.system {
      border-left: 4px solid var(--text-muted, #94a3b8);
    }
    .message-meta {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.4rem;
      font-size: 0.75rem;
    }
    .role-badge {
      font-weight: 700;
      color: var(--text-primary, #f8fafc);
    }
    .tokens-badge, .tool-badge {
      color: var(--text-muted, #94a3b8);
      font-family: monospace;
    }
    .content-text {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
      color: var(--text-primary, #f8fafc);
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-muted, #94a3b8);
      font-size: 0.9rem;
    }
  `]
})
export class ConversationTimelineComponent {
  public readonly messages = input<TimelineMessage[]>([]);

  public readonly totalTokens = computed(() => {
    return this.messages().reduce((acc, m) => acc + (m.tokens || 0), 0);
  });
}
