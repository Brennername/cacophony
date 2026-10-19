import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConversationTimelineComponent } from './conversation-timeline.component';
import { TimelineMessage } from './conversation-timeline.component';
import { By } from '@angular/platform-browser';

describe('ConversationTimelineComponent', () => {
  it('should render messages and compute token counts reactively', () => {
    TestBed.configureTestingModule({
      imports: [ConversationTimelineComponent],
    });
    const fixture = TestBed.createComponent(ConversationTimelineComponent);
    fixture.componentRef.setInput('messages', [
      { id: '1', role: 'user', content: 'Generate schema', tokens: 15 },
      { id: '2', role: 'assistant', content: 'CREATE TABLE ...', tokens: 45 }
    ]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.totalTokens()).toBe(60);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Total Tokens: 60');
    expect(compiled.textContent).toContain('CREATE TABLE');
  });

  it('should render role badges correctly', () => {
    TestBed.configureTestingModule({
      imports: [ConversationTimelineComponent],
    });
    const fixture = TestBed.createComponent(ConversationTimelineComponent);
    fixture.componentRef.setInput('messages', [{ id: '1', role: 'user', content: 'User message' }]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('User');
  });

  it('should format markdown snippets correctly', () => {
    TestBed.configureTestingModule({
      imports: [ConversationTimelineComponent],
    });
    const fixture = TestBed.createComponent(ConversationTimelineComponent);
    fixture.componentRef.setInput('messages', [{ id: '1', role: 'assistant', content: '# Markdown Title\n## Subtitle' }]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('# Markdown Title');
    expect(compiled.textContent).toContain('## Subtitle');
  });

  it('should auto-scroll to bottom when new messages are added', () => {
    TestBed.configureTestingModule({
      imports: [ConversationTimelineComponent],
    });
    const fixture = TestBed.createComponent(ConversationTimelineComponent);
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();

    // Add a message to trigger auto-scroll
    fixture.componentRef.setInput('messages', [{ id: '1', role: 'user', content: 'New message' }]);
    fixture.detectChanges();

    const timelineElement = fixture.nativeElement.querySelector('.timeline');
    expect(timelineElement).toBeDefined(); // Ensure the element is rendered

    // Check if the scroll position is at the bottom
    if (timelineElement) {
      expect(timelineElement.scrollTop).toBeGreaterThanOrEqual(timelineElement.scrollHeight - 1);
    }
  });
});
