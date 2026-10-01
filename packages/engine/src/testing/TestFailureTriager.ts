import { TestResult } from '@cacophony/shared-types';

export class TestFailureTriager {
  /**
   * Classifies a test failure based on its type.
   * @param result - The result of the test which failed.
   * @returns A string representing the type of failure: 'AssertionFailure', 'CompilationError', 'RuntimeCrash', or 'Timeout'.
   */
  classifyFailure(result: TestResult): string {
    if (result.error && result.error.name === 'AssertionError') {
      return 'AssertionFailure';
    } else if (result.error && result.error.name === 'SyntaxError' || result.error?.name === 'TypeError') {
      return 'CompilationError';
    } else if (result.error && result.error.name === 'UnhandledPromiseRejectionWarning') {
      return 'RuntimeCrash';
    } else if (result.timeout) {
      return 'Timeout';
    } else {
      throw new Error('Unknown failure type');
    }
  }
}