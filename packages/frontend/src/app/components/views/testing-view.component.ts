import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-testing-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <p>Current Test Command: {{ currentCommand }}</p>
      <p>Target File Paths: {{ targetFilePaths.join(', ') }}</p>
      <p>Elapsed Duration: {{ elapsedDuration }} seconds</p>
      <p>Status: <span [ngClass]="statusClass">{{ statusText }}</span></p>
    </div>
  `,
})
export class TestingViewComponent implements OnInit, OnDestroy {
  currentCommand = 'Running test...';
  targetFilePaths = ['path/to/file1', 'path/to/file2'];
  elapsedDuration = 0;
  statusText = 'Running';
  statusClass = 'status-running';

  private intervalSubscription: Subscription;

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startTimer(): void {
    this.intervalSubscription = interval(1000).pipe(
      tap(() => {
        this.elapsedDuration++;
      })
    ).subscribe();
  }

  stopTimer(): void {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }

  updateStatus(status: string, statusClass: string): void {
    this.statusText = status;
    this.statusClass = statusClass;
  }
}