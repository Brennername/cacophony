import { Component, Input, OnInit, OnChanges, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveSignalService } from '../../services/reactive-signal.service';

@Component({
  selector: 'app-success-meter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './success-meter.component.html',
  styleUrl: './success-meter.component.css',
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
