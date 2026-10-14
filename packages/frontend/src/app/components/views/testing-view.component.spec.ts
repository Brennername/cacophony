import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestingViewComponent } from './testing-view.component';
import { ArenaStateStore } from '../../services/arena-state.store';
import { signal } from '@angular/core';

describe('TestingViewComponent (T59.4 & T59.6)', () => {
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
        startedAt: new Date().toISOString()
      },
      {
        id: 'proc-2',
        name: 'test-runner-e2e',
        command: 'npm test -- e2e',
        pid: 1235,
        status: 'FAILED',
        durationMs: 950,
        startedAt: new Date().toISOString()
      }
    ]);
    mockActiveTaskSignal = signal(null);
    const mockLiveStreamSignal = signal('');

    await TestBed.configureTestingModule({
      imports: [TestingViewComponent],
      providers: [
        {
          provide: ArenaStateStore,
          useValue: {
            processes: mockProcessesSignal,
            activeTask: mockActiveTaskSignal,
            liveStreamBuffer: mockLiveStreamSignal
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render summary metric counters correctly', () => {
    expect(component.totalTestsRun()).toBe(2);
    expect(component.passedCount()).toBe(1);
    expect(component.failedCount()).toBe(1);
    expect(component.passRatePercent()).toBe(50);
  });

  it('should render historical test runs table with rows matching filtered processes', () => {
    const el = fixture.nativeElement as HTMLElement;
    const historyTable = el.querySelector('.history-table');
    expect(historyTable).toBeTruthy();

    const rows = el.querySelectorAll('.table-rows tr.test-run-row');
    expect(rows.length).toBe(2);

    const firstRowText = rows[0].textContent;
    expect(firstRowText).toContain('PASSED');
    expect(firstRowText).toContain('npm test -- unit');
    expect(firstRowText).toContain('350ms');

    const secondRowText = rows[1].textContent;
    expect(secondRowText).toContain('FAILED');
    expect(secondRowText).toContain('npm test -- e2e');
    expect(secondRowText).toContain('950ms');
  });

  it('should filter historical test runs when filter tab is switched', () => {
    component.filterTests('PASSED');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.table-rows tr.test-run-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('npm test -- unit');
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
});
