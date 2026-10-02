import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestingService } from '../services/testing.service';

@Component({
  selector: 'app-testing-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h1>Test Execution Summary</h1>
      <p>Total Tests Run: {{ totalTestsRun }}</p>
      <p>Passed Count: {{ passedCount }}</p>
      <p>Failed Count: {{ failedCount }}</p>
      <p>Current Pass Rate %: {{ passRatePercentage.toFixed(2) }}%</p>
      <p>Average Test Duration: {{ averageDuration }}ms</p>
    </div>
  `
})
export class TestingViewComponent {
  totalTestsRun: number = 0;
  passedCount: number = 0;
  failedCount: number = 0;
  passRatePercentage: number = 0;
  averageDuration: number = 0;

  constructor(private testingService: TestingService) {}

  ngOnInit(): void {
    this.updateTestSummary();
  }

  updateTestSummary(): void {
    const testResults = this.testingService.getTestResults();
    if (testResults) {
      this.totalTestsRun = testResults.length;
      this.passedCount = testResults.filter(result => result.status === 'passed').length;
      this.failedCount = testResults.filter(result => result.status === 'failed').length;
      this.passRatePercentage = (this.passedCount / this.totalTestsRun) * 100;
      this.averageDuration = testResults.reduce((acc, result) => acc + result.duration, 0) / testResults.length;
    }
  }
}