import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { IssuesViewComponent } from './issues-view.component';
import { IssuesService } from '../../../services/issues.service';
import { AuthService } from '../../../services/auth.service';
import type { HitlTicketRecord } from '@cacophony/shared-types';

describe('IssuesViewComponent', () => {
  let fixture: ComponentFixture<IssuesViewComponent>;
  let component: IssuesViewComponent;

  const mockTickets: readonly HitlTicketRecord[] = [
    {
      id: 'ticket-1',
      githubIssueId: 101,
      githubIssueNumber: 42,
      githubIssueUrl: 'https://github.com/Brennername/cacophony/issues/42',
      author: 'alice_contrib',
      title: 'Fix SQLite WAL mode concurrency issue',
      rawBody: 'When executing tests concurrently, database locked error occurs.',
      sanitizedPrompt: 'Resolve SQLite WAL concurrency locked errors.',
      targetBranch: 'main',
      labels: ['bug'],
      status: 'HITL_PENDING',
      priority: 'P1',
      riskScore: 0.1,
      flags: [],
      focusFiles: ['packages/db/src/drivers/SQLiteDriver.ts'],
      suggestedTestCommand: 'npm test',
      pendingFeedback: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ticket-2',
      githubIssueId: 102,
      githubIssueNumber: 43,
      githubIssueUrl: 'https://github.com/Brennername/cacophony/issues/43',
      author: 'bob_dev',
      title: 'Add TUI dark theme contrast checks',
      rawBody: 'Contrast ratios fail WCAG standards.',
      sanitizedPrompt: 'Calibrate TUI theme contrast.',
      targetBranch: 'main',
      labels: ['enhancement'],
      status: 'COMPLETED',
      priority: 'P2',
      riskScore: 0.05,
      flags: [],
      focusFiles: [],
      pendingFeedback: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockIssuesService = {
    tickets: signal<readonly HitlTicketRecord[]>(mockTickets),
    loading: signal<boolean>(false),
    error: signal<string | null>(null),
    loadTickets: vi.fn().mockResolvedValue(mockTickets),
    submitFeedback: vi.fn().mockResolvedValue(undefined),
  };

  const mockAuthService = {
    session: signal({
      isAuthenticated: true,
      username: 'alice_contrib',
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuesViewComponent],
      providers: [
        { provide: IssuesService, useValue: mockIssuesService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IssuesViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render the mandatory HITL contributor notice', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('.hitl-notice-banner');

    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('We will begin working on your issue after HITL review');
  });

  it('should render the Submit New Issue button with proper GitHub issue URL', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const submitBtn = compiled.querySelector('.submit-issue-btn') as HTMLAnchorElement;

    expect(submitBtn).toBeTruthy();
    expect(submitBtn.href).toContain('https://github.com/Brennername/cacophony/issues/new?template=bug_report.md');
  });

  it('should render ticket cards with author and issue numbers', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.ticket-card');

    expect(cards.length).toBe(2);
    expect(compiled.textContent).toContain('#42');
    expect(compiled.textContent).toContain('alice_contrib');
    expect(compiled.textContent).toContain('Fix SQLite WAL mode concurrency issue');
  });

  it('should filter tickets when tab is changed', () => {
    component.onTabChange('pending');
    fixture.detectChanges();
    expect(component.filteredTickets().length).toBe(1);
    expect(component.filteredTickets()[0].githubIssueNumber).toBe(42);

    component.onTabChange('completed');
    fixture.detectChanges();
    expect(component.filteredTickets().length).toBe(1);
    expect(component.filteredTickets()[0].githubIssueNumber).toBe(43);
  });

  it('should open and submit feedback modal for clarification', async () => {
    component.openFeedbackModal(mockTickets[0]);
    expect(component.feedbackModalOpen()).toBe(true);

    component.feedbackContent.set('Added reproducible test scenario');
    await component.submitFeedback();

    expect(mockIssuesService.submitFeedback).toHaveBeenCalledWith('ticket-1', {
      author: 'alice_contrib',
      content: 'Added reproducible test scenario',
    });
    expect(component.feedbackModalOpen()).toBe(false);
  });
});
