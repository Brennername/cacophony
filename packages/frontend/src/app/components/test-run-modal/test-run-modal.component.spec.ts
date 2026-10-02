import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { TestRunModalComponent } from './test-run-modal.component';
import { ModalService } from '../../services/modal.service';
import { of } from 'rxjs';

describe('TestRunModalComponent', () => {
  let component: TestRunModalComponent;
  let fixture: ComponentFixture<TestRunModalComponent>;
  let modalServiceMock: any;
  let debugElement: DebugElement;

  beforeEach(async () => {
    modalServiceMock = {
      openModal$: of({}),
      closeModal$: of({})
    };

    await TestBed.configureTestingModule({
      declarations: [TestRunModalComponent],
      providers: [{ provide: ModalService, useValue: modalServiceMock }]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestRunModalComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should open modal on button click', () => {
    const button = debugElement.query(By.css('.open-modal-button'));
    button.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.isModalOpen).toBeTrue();
  });

  it('should close modal on escape key press', () => {
    component.isModalOpen = true;
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    fixture.detectChanges();
    expect(component.isModalOpen).toBeFalse();
  });

  it('should extract assertion from modal content', () => {
    component.content = '<div class="assertion">Test Assertion</div>';
    const assertions = component.extractAssertions();
    expect(assertions).toContain('Test Assertion');
  });
});