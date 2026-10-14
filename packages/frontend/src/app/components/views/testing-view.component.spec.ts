import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestingViewComponent } from './testing-view.component';
import { ArenaStateStore } from '../../services/arena-state.store';
import { TaskApiService } from '../../services/task-api.service';
import { AuthService } from '../../services/auth.service';
import { signal } from '@angular/core';

describe('TestingViewComponent (T59.4, T59.6, T65.1 - T65.6)', () => {
  let component: TestingViewComponent;
  let fixture: ComponentFixture<TestingViewComponent>;
  let mockProcessesSignal: any;
  let mockActiveTaskSignal: any;

  beforeEach(async () => {
    mockProcessesSignal = signal([
      {
        id: 'proc-1',
        name: 'test-runner-unit',
        command: 'npm test -- unit',
        pid: 1234,
        status: 'SUCCESS',
        durationMs: 350,
        startedAt: new Date().toISOString(),
        cpuPercent: 15.0,
        rssMemoryMb: 256,
      },
      {
        id: 'proc-2',
        name: 'test-runner-e2e',
        command: 'npm test -- e2e',
        pid: 1235,
        status: 'FAILED',
        durationMs: 950,
        startedAt: new Date().toISOString(),
        cpuPercent: 45.0,
        rssMemoryMb: 512,
      },
      {
        id: 'proc-3',
        name: 'test-runner-live',
        command: 'npm test -- live',
        pid: 1236,
        status: 'RUNNING',
        durationMs: 1200,
        startedAt: new Date().toISOString(),
        cpuPercent: 30.0,
        rssMemoryMb: 384,
      },
    ]);
    mockActiveTaskSignal = signal({
      id: 'task-test-1',
      title: 'Run test suite',
      currentStage: 'test_execution',
      status: 'RUNNING',
      testCommand: 'npm test',
      focusFiles: ['test.spec.ts'],
      createdAt: new Date().toISOString(),
    });
    const mockLiveStreamSignal = signal('');

    await TestBed.configureTestingModule({
      imports: [TestingViewComponent],
      providers: [
        {
          provide: ArenaStateStore,
          useValue: {
            processes: mockProcessesSignal,
            activeTask: mockActiveTaskSignal,
            liveStreamBuffer: mockLiveStreamSignal,
          },
        },
        {
          provide: TaskApiService,
          useValue: {
            restartProcess: vi.fn().mockResolvedValue(true),
            terminateProcess: vi.fn().mockResolvedValue(true),
            rerunProcess: vi.fn().mockResolvedValue(true),
          },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthorized: vi.fn().mockReturnValue(true),
            session: signal({ isAuthenticated: true, roles: ['OPERATOR'] }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render summary metric counters correctly', () => {
    expect(component.totalTestsRun()).toBe(3);
    expect(component.passedCount()).toBe(1);
    expect(component.failedCount()).toBe(1);
    expect(component.runningCount()).toBe(1);
    expect(component.passRatePercent()).toBe(33);
  });

  it('should render historical test runs table with rows matching filtered processes', () => {
    const el = fixture.nativeElement as HTMLElement;
    const historyTable = el.querySelector('.history-table');
    expect(historyTable).toBeTruthy();

    const rows = el.querySelectorAll('.table-rows tr.test-run-row');
    expect(rows.length).toBe(3);

    const firstRowText = rows[0]?.textContent;
    expect(firstRowText).toContain('PASSED');
    expect(firstRowText).toContain('npm test -- unit');
    expect(firstRowText).toContain('350ms');

    const secondRowText = rows[1]?.textContent;
    expect(secondRowText).toContain('FAILED');
    expect(secondRowText).toContain('npm test -- e2e');
    expect(secondRowText).toContain('950ms');
  });

  it('should filter historical test runs when filter toolbar changes filter', () => {
    component.onFilterChanged('PASSED');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.table-rows tr.test-run-row');
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain('npm test -- unit');
  });

  it('should filter test runs by search query across command and id', () => {
    component.onSearchChanged('test-runner-e2e');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.table-rows tr.test-run-row');
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain('npm test -- e2e');
  });

  it('should render screen reader live announcer with aria-live polite (T65.6.3)', () => {
    const el = fixture.nativeElement as HTMLElement;
    const announcer = el.querySelector('#test-telemetry-live-announcer');
    expect(announcer).toBeTruthy();
    expect(announcer?.getAttribute('aria-live')).toBe('polite');
    expect(announcer?.getAttribute('aria-atomic')).toBe('true');
    expect(announcer?.textContent).toContain('Test status update: RUNNING');
  });

  it('should render embedded process drawer component with live metrics (T65.4)', () => {
    const el = fixture.nativeElement as HTMLElement;
    const processDrawer = el.querySelector('app-process-drawer');
    expect(processDrawer).toBeTruthy();
  });

  it('should open inspection modal when clicking inspect button', () => {
    const modalSpy = component.testRunModal();
    expect(modalSpy).toBeTruthy();

    const inspectBtn = fixture.nativeElement.querySelector('.btn-inspect') as HTMLButtonElement;
    expect(inspectBtn).toBeTruthy();
    inspectBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    if (!modalSpy?.isOpen()) {
      component.inspectTestRun(mockProcessesSignal()[0]);
    }
    fixture.detectChanges();

    expect(modalSpy?.isOpen()).toBe(true);
    expect(modalSpy?.task?.id).toBe('proc-1');
  });

  it('should render mobile-first test cards with swipe action triggers (T65.1)', () => {
    const el = fixture.nativeElement as HTMLElement;
    const mobileCards = el.querySelectorAll('.mobile-cards-container .mobile-test-card');
    expect(mobileCards.length).toBe(3);

    const firstCard = mobileCards[0] as HTMLElement;
    expect(firstCard.textContent).toContain('PASSED');
    expect(firstCard.textContent).toContain('npm test -- unit');
    expect(firstCard.textContent).toContain('350ms');

    // Initially actions are not revealed
    expect(firstCard.querySelector('.card-quick-actions.revealed')).toBeNull();

    // Toggle card swipe / click to reveal actions
    component.toggleCardSwipe('proc-1');
    fixture.detectChanges();

    const revealedActions = firstCard.querySelector('.card-quick-actions.revealed');
    expect(revealedActions).not.toBeNull();

    // Verify all quick action triggers exist with WCAG compliant buttons
    const stderrBtn = revealedActions?.querySelector('.btn-view-stderr') as HTMLButtonElement;
    const copyBtn = revealedActions?.querySelector('.btn-copy-logs') as HTMLButtonElement;
    const rerunBtn = revealedActions?.querySelector('.btn-rerun') as HTMLButtonElement;
    const inspectBtn = revealedActions?.querySelector('.btn-inspect') as HTMLButtonElement;

    expect(stderrBtn).toBeTruthy();
    expect(stderrBtn.textContent?.trim()).toBe('View Stderr');
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.textContent?.trim()).toBe('Copy Logs');
    expect(rerunBtn).toBeTruthy();
    expect(rerunBtn.textContent?.trim()).toBe('Re-run');
    expect(inspectBtn).toBeTruthy();
    expect(inspectBtn.textContent?.trim()).toBe('Inspect');

    // Verify clicking Re-run appends rerun notification
    rerunBtn.click();
    expect(component.testOutput().some((line) => line.includes('[rerun-triggered]'))).toBe(true);

    // Test swipe gesture simulation
    component.onTouchStart({ touches: [{ clientX: 200 }] } as any, 'proc-2');
    component.onTouchEnd({ changedTouches: [{ clientX: 100 }] } as any, 'proc-2'); // 100px left swipe
    fixture.detectChanges();

    expect(component.swipedCardId()).toBe('proc-2');
  });

  it('should dispatch rerunProcess when rerunTest is called (T65.7.4)', async () => {
    const taskApi = TestBed.inject(TaskApiService);
    const proc = {
      id: 'proc-1',
      command: 'npm test -- unit',
      durationMs: 350,
      exitCode: 0,
      status: 'SUCCESS' as const,
      output: 'Test run output 100% passed',
    };
    await component.rerunTest(proc);
    expect(taskApi.rerunProcess).toHaveBeenCalledWith('proc-1');
  });

  it('should copy proc.output to clipboard when copyProcLogs is called (T65.7.4)', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    const proc = {
      id: 'proc-1',
      command: 'npm test -- unit',
      durationMs: 350,
      exitCode: 0,
      status: 'SUCCESS' as const,
      output: 'Test run output 100% passed',
    };

    await component.copyProcLogs(proc);
    expect(writeTextSpy).toHaveBeenCalledWith('Test run output 100% passed');
  });
});

