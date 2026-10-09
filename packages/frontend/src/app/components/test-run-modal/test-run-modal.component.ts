import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-test-run-modal',
  template: '<div class="component-container"></div>',
  styles: []
})
export class TestRunModalComponent implements OnInit {
  @Input() task: any | null = null;
  fullOutput: string = '';
  failingAssertions: string[] = [];
  codeDiffs: string = '';
  environmentVariables: { [key: string]: string } = {};

  constructor() {}

  ngOnInit(): void {
    if (this.task) {
      this.fetchTestRunDetails(this.task['id']);
    }
  }

  private async fetchTestRunDetails(taskId: number): Promise<void> {
    // Simulate fetching test run details from an API
    try {
      const response = await fetch(`/api/test-runs/${taskId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch test run details');
      }
      const data = await response.json();
      this.fullOutput = data.fullOutput;
      this.failingAssertions = data.failingAssertions;
      this.codeDiffs = data.codeDiffs;
      this.environmentVariables = data.environmentVariables;
    } catch (error) {
      console.error('Error fetching test run details:', error);
    }
  }
}
