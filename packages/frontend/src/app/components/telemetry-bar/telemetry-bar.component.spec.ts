import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TelemetryBarComponent } from './telemetry-bar.component';
import { HistoryMetricsService } from '../../services/history-metrics.service';
import { ArenaStateStore } from '../../services/arena-state.store';
import { signal } from '@angular/core';

describe('TelemetryBarComponent (T57.5.2)', () => {
  let component: TelemetryBarComponent;
  let fixture: ComponentFixture<TelemetryBarComponent>;
  let mockSuccessRateSignal: any;
  let mockTelemetrySignal: any;

  beforeEach(async () => {
    mockSuccessRateSignal = signal(85);
    mockTelemetrySignal = signal({
      activeModel: 'qwen2.5-coder:7b',
      gpuBusyPercent: 42,
      cpuBusyPercent: 20,
      systemMemoryUsedMb: 4000,
      systemMemoryTotalMb: 16000,
      systemMemoryPercent: 25,
      vramUsedMb: 6000,
      vramTotalMb: 16384,
      vramAvailMb: 10384,
      vramPercent: 36,
      gttUsedMb: 100,
      gttTotalMb: 16000,
      edgeTempCelsius: 58,
      thermalZone: 'nominal',
      vddgfxMv: 800,
      socMv: 850,
      vddnbMv: 850,
      pptPowerW: 25,
      sclkMhz: 1200,
      mclkMhz: 1600
    });

    await TestBed.configureTestingModule({
      imports: [TelemetryBarComponent],
      providers: [
        {
          provide: HistoryMetricsService,
          useValue: {
            rollingSuccessRate: mockSuccessRateSignal
          }
        },
        {
          provide: ArenaStateStore,
          useValue: {
            telemetry: mockTelemetrySignal
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TelemetryBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render compact success rate pill and optimal status color class', () => {
    const el = fixture.nativeElement as HTMLElement;
    const successPill = el.querySelector('.success-pill');
    expect(successPill).toBeTruthy();
    expect(successPill?.textContent).toContain('85%');
    expect(successPill?.classList.contains('optimal')).toBe(true);
  });

  it('should dynamically update status color class when success rate shifts', () => {
    mockSuccessRateSignal.set(65);
    fixture.detectChanges();
    expect(component.statusColorClass()).toBe('warning');

    mockSuccessRateSignal.set(30);
    fixture.detectChanges();
    expect(component.statusColorClass()).toBe('critical');
  });

  it('should render active model indicator', () => {
    const el = fixture.nativeElement as HTMLElement;
    const modelPill = el.querySelector('.model-pill');
    expect(modelPill).toBeTruthy();
    expect(modelPill?.textContent).toContain('qwen2.5-coder:7b');
  });
});
