import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestRunModalComponent } from './test-run-modal.component';

describe('TestRunModalComponent (T59.6.2)', () => {
  let component: TestRunModalComponent;
  let fixture: ComponentFixture<TestRunModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestRunModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestRunModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should open modal and render tab buttons for all four sections', () => {
    component.open({
      id: 'task-test-1',
      fullOutput: 'PASS src/tests/sample.test.ts',
      failingAssertions: ['AssertionError: Expected 200 to equal 200'],
      codeDiffs: 'diff --git a/file.ts b/file.ts',
      environmentVariables: { NODE_ENV: 'test' }
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const tabs = el.querySelectorAll('.modal-tabs .tab-btn');
    expect(tabs.length).toBe(4);
    expect(tabs[0].textContent).toContain('Full Output');
    expect(tabs[1].textContent).toContain('Failing Assertions');
    expect(tabs[2].textContent).toContain('Code Diffs');
    expect(tabs[3].textContent).toContain('Environment Variables');
  });

  it('should switch tabs when clicking tab buttons', () => {
    component.open({
      id: 'task-test-2',
      fullOutput: 'Log output',
      failingAssertions: [],
      codeDiffs: '',
      environmentVariables: { TEST: 'true' }
    });
    fixture.detectChanges();

    component.setTab('environment_variables');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('environment_variables');
    const el = fixture.nativeElement as HTMLElement;
    const envKey = el.querySelector('.env-key');
    expect(envKey?.textContent).toContain('TEST');
  });

  it('should close when clicking close button or dismiss button', () => {
    component.open({ id: 'task-test-3' });
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    component.close();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });
});
