import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WindowedSuccessTrendComponent } from './windowed-success-trend.component';
import { HistoryMetricsService } from '../../services/history-metrics.service';
import { signal } from '@angular/core';

describe('WindowedSuccessTrendComponent (T85.4.4)', () => {
  let component: WindowedSuccessTrendComponent;
  let fixture: ComponentFixture<WindowedSuccessTrendComponent>;
  let mockSuccessRateSignal: any;

  beforeEach(async () => {
    mockSuccessRateSignal = signal(88);

    await TestBed.configureTestingModule({
      imports: [WindowedSuccessTrendComponent],
      providers: [
        {
          provide: HistoryMetricsService,
          useValue: {
            rollingSuccessRate: mockSuccessRateSignal
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WindowedSuccessTrendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render SVG trend line with optimal status class when rate is 88%', () => {
    const el = fixture.nativeElement as HTMLElement;
    const svg = el.querySelector('svg.trend-svg');
    expect(svg).toBeTruthy();

    const polyline = el.querySelector('polyline.trend-stroke');
    expect(polyline).toBeTruthy();
    expect(polyline?.classList.contains('optimal')).toBe(true);

    const legendRate = el.querySelector('.chart-legend');
    expect(legendRate?.textContent).toContain('Window Rate: 88%');
  });

  it('should trigger regression alert when success rate drops below 50%', () => {
    mockSuccessRateSignal.set(42);
    fixture.detectChanges();

    expect(component.isRegressionDetected()).toBe(true);
    expect(component.trendColorClass()).toBe('critical');

    const alert = fixture.nativeElement.querySelector('.regression-alert');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Regression Detected');
  });

  it('should update window size signal and sample depth label when changing selector', () => {
    component.setWindowSize('50');
    fixture.detectChanges();

    expect(component.windowSize()).toBe('50');
    expect(component.sampleDepth()).toBe('N=50');

    component.setWindowSize('total');
    fixture.detectChanges();
    expect(component.sampleDepth()).toBe('Full Archive');
  });
});
