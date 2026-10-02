import { Component, OnInit } from '@angular/core';
import { TestRunService } from '../services/test-run.service';

@Component({
  selector: 'app-test-run-modal',
  templateUrl: './test-run-modal.component.html',
  styleUrls: ['./test-run-modal.component.css']
})
export class TestRunModalComponent implements OnInit {
  testResults: any[] = [];

  constructor(private testRunService: TestRunService) { }

  ngOnInit(): void {
    this.fetchTestResults();
  }

  fetchTestResults(): void {
    this.testRunService.getTestResults().subscribe(
      (results) => {
        this.testResults = results;
      },
      (error) => {
        console.error('Error fetching test results:', error);
      }
    );
  }

  highlightFailingAssertions(results: any[]): any[] {
    return results.map(result => {
      if (result.assertions && result.assertions.some(assertion => !assertion.passed)) {
        const failingAssertion = result.assertions.find(assertion => !assertion.passed);
        return {
          ...result,
          highlightedAssertion: {
            expected: failingAssertion.expected,
            actual: failingAssertion.actual,
            message: failingAssertion.message
          }
        };
      }
      return result;
    });
  }

  getFormattedCodeSnippet(expected: any, actual: any): string {
    const formattedExpected = JSON.stringify(expected, null, 2);
    const formattedActual = JSON.stringify(actual, null, 2);
    return `
<code style="color: red;">
  Expected:
  ${formattedExpected}
</code>
<code style="color: green;">
  Actual:
  ${formattedActual}
</code>
`;
  }
}