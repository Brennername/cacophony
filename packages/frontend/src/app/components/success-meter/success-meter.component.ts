import { Component, Input, OnInit, OnChanges, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveSignalService } from '../../services/reactive-signal.service';

@Component({
  selector: 'app-success-meter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="success-meter-wrapper" [class]="colorClass">
      <svg class="radial-gauge" [attr.viewBox]="'0 0 ' + svgWidth + ' ' + svgHeight" [attr.width]="svgWidth" [attr.height]="svgHeight">
        <circle
          class="gauge-bg"
          [attr.cx]="centerX"
          [attr.cy]="centerY"
          [attr.r]="radius"
          [attr.stroke-width]="strokeWidth"
        />
        <circle
          class="gauge-progress"
          [attr.cx]="centerX"
          [attr.cy]="centerY"
          [attr.r]="radius"
          [attr.stroke-width]="strokeWidth"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashoffset"
        />
      </svg>
      <div class="meter-text">
        <span class="percentage">{{ displayPercentage }}%</span>
        <span class="label">Success Rate</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .success-meter-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    .radial-gauge {
      transform: rotate(-90deg);
    }
    .gauge-bg {
      fill: none;
      stroke: var(--surface-border, rgba(255, 255, 255, 0.1));
    }
    .gauge-progress {
      fill: none;
      stroke: var(--status-nominal, #10b981);
      stroke-linecap: round;
      transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease;
    }
    .low .gauge-progress { stroke: var(--status-danger, #ef4444); }
    .medium .gauge-progress { stroke: var(--status-warm, #f59e0b); }
    .high .gauge-progress { stroke: var(--status-nominal, #10b981); }
    .meter-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .percentage {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .label {
      font-size: 0.68rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `]
})
export class SuccessMeterComponent implements OnInit, OnChanges {
  @Input() public successPercentage: number = 0;

  public readonly maxSuccessPercentage = 100;
  public readonly svgWidth = 100;
  public readonly svgHeight = 100;
  public readonly radius = 40;
  public readonly strokeWidth = 8;
  public readonly centerX = 50;
  public readonly centerY = 50;
  public readonly circumference = 2 * Math.PI * 40;

  public dashoffset: number = 0;
  public colorClass: 'low' | 'medium' | 'high' = 'high';

  public get displayPercentage(): number {
    if (this.reactiveSignalService && typeof this.reactiveSignalService.getSignalValue === 'function') {
      const val = this.reactiveSignalService.getSignalValue();
      if (typeof val === 'number') {
        return Math.round(val * 100);
      }
    }
    return Math.round(this.successPercentage);
  }

  constructor(@Optional() private reactiveSignalService?: ReactiveSignalService) {}

  public ngOnInit(): void {
    this.refreshMetrics();
  }

  public ngOnChanges(): void {
    this.refreshMetrics();
  }

  private refreshMetrics(): void {
    if (this.reactiveSignalService && typeof this.reactiveSignalService.getSignalValue === 'function') {
      const val = this.reactiveSignalService.getSignalValue();
      if (typeof val === 'number') {
        this.dashoffset = 100 - (val * 200);
        this.colorClass = val < 0.4 ? 'low' : val < 0.7 ? 'medium' : 'high';
        return;
      }
    }

    const pct = Math.max(0, Math.min(100, this.successPercentage));
    this.dashoffset = (1 - pct / 100) * this.circumference;
    this.colorClass = pct < 40 ? 'low' : pct < 70 ? 'medium' : 'high';
  }

  public getTransform(): string {
    return `translate(${this.centerX}, ${this.centerY})`;
  }

  public getStrokeDasharray(): number {
    return this.circumference;
  }

  public getStrokeDashoffset(): number {
    return this.dashoffset;
  }
}
