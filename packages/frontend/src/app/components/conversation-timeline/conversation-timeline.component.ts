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
  templateUrl: './conversation-timeline.component.html',
  styleUrl: './conversation-timeline.component.css',
})
export class ConversationTimelineComponent {
  public readonly messages = input<TimelineMessage[]>([]);

  public readonly totalTokens = computed(() => {
    return this.messages().reduce((acc, m) => acc + (m.tokens || 0), 0);
  });
}
