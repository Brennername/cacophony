import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestingViewComponent } from './testing-view.component';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

describe('TestingViewComponent', () => {
  let component: TestingViewComponent;
  let fixture: ComponentFixture<TestingViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TestingViewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render summary metrics', () => {
    // Mock the summary data
    const mockSummaryData = {
      totalTests: 10,
      passedTests: 8,
      failedTests: 2
    };

    // Assign the mock data to the component's property
    component.summaryMetrics = mockSummaryData;

    // Trigger change detection
    fixture.detectChanges();

    // Verify that the summary metrics are rendered
    const totalTestsElement = fixture.debugElement.query(By.css('.total-tests'));
    const passedTestsElement = fixture.debugElement.query(By.css('.passed-tests'));
    const failedTestsElement = fixture.debugElement.query(By.css('.failed-tests'));

    expect(totalTestsElement.nativeElement.textContent).toContain('Total Tests: 10');
    expect(passedTestsElement.nativeElement.textContent).toContain('Passed Tests: 8');
    expect(failedTestsElement.nativeElement.textContent).toContain('Failed Tests: 2');
  });

  it('should respond to active test execution signal changes', () => {
    // Mock the active test execution signal
    const mockActiveSignal = of(true);

    // Assign the mock data to the component's property
    component.activeTestExecutionSignal = mockActiveSignal;

    // Trigger change detection
    fixture.detectChanges();

    // Verify that the component responds to the active test execution signal
    const activeSignalElement = fixture.debugElement.query(By.css('.active-test-execution'));

    expect(activeSignalElement.nativeElement.textContent).toContain('Active Test Execution: true');

    // Emit a new value from the mock signal
    mockActiveSignal.next(false);

    // Trigger change detection again
    fixture.detectChanges();

    // Verify that the component updates with the new signal value
    expect(activeSignalElement.nativeElement.textContent).toContain('Active Test Execution: false');
  });
});