import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuccessMeterComponent } from './success-meter.component';
import { ReactiveSignalService } from '../../services/reactive-signal.service';

describe('SuccessMeterComponent', () => {
  let component: SuccessMeterComponent;
  let fixture: ComponentFixture<SuccessMeterComponent>;
  let mockReactiveService: { getSignalValue: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockReactiveService = {
      getSignalValue: vi.fn().mockReturnValue(0.85)
    };

    await TestBed.configureTestingModule({
      imports: [SuccessMeterComponent],
      providers: [
        { provide: ReactiveSignalService, useValue: mockReactiveService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuccessMeterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update SVG dashoffset based on signal value', () => {
    const signalValue = 0.5;
    mockReactiveService.getSignalValue.mockReturnValue(signalValue);

    component.ngOnInit();

    expect(component.dashoffset).toBe(100 - (signalValue * 200));
  });

  it('should apply color threshold classes based on signal value', () => {
    const signalValue = 0.3;
    mockReactiveService.getSignalValue.mockReturnValue(signalValue);

    component.ngOnInit();

    expect(component.colorClass).toBe('low');
  });
});