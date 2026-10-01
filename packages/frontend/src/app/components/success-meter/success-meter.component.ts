import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-success-meter',
  templateUrl: './success-meter.component.html',
  styleUrls: ['./success-meter.component.css']
})
export class SuccessMeterComponent implements OnInit {
  @Input() successPercentage: number = 0;
  private readonly maxSuccessPercentage = 100;
  private readonly svgWidth = 200;
  private readonly svgHeight = 200;
  private readonly radius = 90;
  private readonly strokeWidth = 10;
  private readonly centerX = this.svgWidth / 2;
  private readonly centerY = this.svgHeight / 2;
  private readonly circumference = 2 * Math.PI * this.radius;

  constructor() {}

  ngOnInit(): void {
    if (this.successPercentage < 0 || this.successPercentage > this.maxSuccessPercentage) {
      throw new Error('Success percentage must be between 0 and 100');
    }
  }

  getTransform(): string {
    return `translate(${this.centerX}, ${this.centerY})`;
  }

  getStrokeDasharray(): number {
    return this.circumference;
  }

  getStrokeDashoffset(): number {
    const offset = (1 - this.successPercentage / this.maxSuccessPercentage) * this.circumference;
    return offset;
  }

  getCircleStyle(): any {
    return {
      fill: 'none',
      stroke: '#4CAF50', // Green color for success
      strokeWidth: this.strokeWidth,
      transform: `rotate(-90deg) translate(${this.radius}px)`
    };
  }
}