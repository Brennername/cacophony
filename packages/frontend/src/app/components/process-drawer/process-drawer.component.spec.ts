import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessDrawerComponent } from './process-drawer.component';
import { ArenaStateStore, ProcessItem } from '../../services/arena-state.store';
import { TaskApiService } from '../../services/task-api.service';
import { AuthService } from '../../services/auth.service';
import { signal } from '@angular/core';

describe('ProcessDrawerComponent (T65.4, T65.5)', () => {
  let fixture: ComponentFixture<ProcessDrawerComponent>;
  let component: ProcessDrawerComponent;
  let mockProcessesSignal = signal<ProcessItem[]>([]);
  let mockIsAuthorized = vi.fn().mockReturnValue(true);
  let mockRestartProcess = vi.fn().mockResolvedValue(true);
  let mockTerminateProcess = vi.fn().mockResolvedValue(true);

  beforeEach(async () => {
    mockProcessesSignal = signal<ProcessItem[]>([
      {
        id: 'proc-1',
        name: 'ollama',
        command: 'ollama serve',
        pid: 1042,
        durationMs: 45000,
        exitCode: null,
        status: 'RUNNING',
        cpuPercent: 12.5,
        rssMemoryMb: 1024,
      },
      {
        id: 'proc-2',
        name: 'test-runner-1',
        command: 'npm test',
        pid: 2048,
        durationMs: 12000,
        exitCode: null,
        status: 'RUNNING',
        cpuPercent: 25.0,
        rssMemoryMb: 512,
      },
    ]);

    mockIsAuthorized = vi.fn().mockReturnValue(true);
    mockRestartProcess = vi.fn().mockResolvedValue(true);
    mockTerminateProcess = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [ProcessDrawerComponent],
      providers: [
        {
          provide: ArenaStateStore,
          useValue: {
            processes: mockProcessesSignal,
          },
        },
        {
          provide: TaskApiService,
          useValue: {
            restartProcess: mockRestartProcess,
            terminateProcess: mockTerminateProcess,
          },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthorized: mockIsAuthorized,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should calculate active processes and cumulative RSS memory in header summary', () => {
    // 2 running processes: 1024 + 512 = 1536 MB = 1.5 GB
    expect(component.activeProcessCount()).toBe(2);
    expect(component.totalRssGb()).toBe('1.5');
    expect(component.headerSummary()).toBe('2 System Processes Active - 1.5 GB RSS');

    const compiled = fixture.nativeElement as HTMLElement;
    const summaryBadge = compiled.querySelector('#process-drawer-summary');
    expect(summaryBadge?.textContent).toContain('2 System Processes Active - 1.5 GB RSS');
  });

  it('should toggle expansion state when header button is clicked', () => {
    expect(component.isExpanded()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    const headerBtn = compiled.querySelector('#process-drawer-toggle') as HTMLButtonElement;
    expect(headerBtn).toBeTruthy();

    component.toggleDrawer();
    fixture.detectChanges();
    expect(component.isExpanded()).toBe(true);
    expect(headerBtn.getAttribute('aria-expanded')).toBe('true');

    component.toggleDrawer();
    fixture.detectChanges();
    expect(component.isExpanded()).toBe(false);
    expect(headerBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('should open confirmation dialog when restarting critical service like ollama', () => {
    const dialogSpy = vi.spyOn(component.confirmationDialog()!, 'open');
    const ollamaProc = mockProcessesSignal()[0]!;

    component.requestRestart(ollamaProc);
    fixture.detectChanges();

    expect(dialogSpy).toHaveBeenCalledWith('ollama');
    expect(mockRestartProcess).not.toHaveBeenCalled();
  });

  it('should directly restart non-critical service without confirmation modal', () => {
    const testProc = mockProcessesSignal()[1]!;

    component.requestRestart(testProc);
    fixture.detectChanges();

    expect(mockRestartProcess).toHaveBeenCalledWith('test-runner-1');
  });

  it('should open confirmation dialog and terminate process on confirmation', async () => {
    const testProc = mockProcessesSignal()[1]!;
    component.requestTerminate(testProc);
    fixture.detectChanges();

    expect(component.pendingAction()).toBe('terminate');

    await component.onConfirmedAction('test-runner-1');
    expect(mockTerminateProcess).toHaveBeenCalledWith('test-runner-1');
    expect(component.pendingAction()).toBeNull();
  });

  it('should hide action controls when operator is not authorized', () => {
    mockIsAuthorized.mockReturnValue(false);
    fixture = TestBed.createComponent(ProcessDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.canManageProcesses()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    const restartBtns = compiled.querySelectorAll('.restart-btn');
    expect(restartBtns.length).toBe(0);
  });
});
