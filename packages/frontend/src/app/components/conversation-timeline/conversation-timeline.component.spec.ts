import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConversationTimelineComponent } from './conversation-timeline.component';

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
});
