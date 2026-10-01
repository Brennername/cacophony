import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuccessMeterComponent } from './success-meter.component';
import { ReactiveSignalService } from '../services/reactive-signal.service';

describe('SuccessMeterComponent', () => {
  let component: SuccessMeterComponent;
  let fixture: ComponentFixture<SuccessMeterComponent>;
  let reactiveSignalService: jasmine.SpyObj<ReactiveSignalService>;

  beforeEach(async () => {
    reactiveSignalService = jasmine.createSpyObj('ReactiveSignalService', ['getSignalValue']);

    await TestBed.configureTestingModule({
      declarations: [ SuccessMeterComponent ],
      providers: [
        { provide: ReactiveSignalService, useValue: reactiveSignalService }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SuccessMeterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update SVG dashoffset based on signal value', () => {
    const signalValue = 0.5;
    reactiveSignalService.getSignalValue.and.returnValue(signalValue);

    component.ngOnInit();

    expect(component.dashoffset).toBe(100 - (signalValue * 200));
  });

  it('should apply color threshold classes based on signal value', () => {
    const signalValue = 0.3;
    reactiveSignalService.getSignalValue.and.returnValue(signalValue);

    component.ngOnInit();

    expect(component.colorClass).toBe('low');
  });
});