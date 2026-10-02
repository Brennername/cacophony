import { TestFailure } from '../shared-types/TestFailure';

/**
 * Triages a test failure based on its stderr output.
 *
 * @param stderr - The stderr output of the failed test.
 * @returns A category representing the root cause of the test failure.
 */
export function triageTestFailure(stderr: string): TestFailure {
  if (stderr.includes('AssertionError')) {
    return TestFailure.AssertionError;
  } else if (stderr.includes('TimeoutError')) {
    return TestFailure.TimeoutError;
  } else if (stderr.includes('SyntaxError')) {
    return TestFailure.SyntaxError;
  } else if (stderr.includes('ReferenceError')) {
    return TestFailure.ReferenceError;
  } else if (stderr.includes('OutOfMemoryError')) {
    return TestFailure.OutOfMemoryError;
  } else if (stderr.includes('NetworkError')) {
    return TestFailure.NetworkError;
  } else if (stderr.includes('FileNotFoundError')) {
    return TestFailure.FileNotFoundException;
  } else if (stderr.includes('PermissionError')) {
    return TestFailure.PermissionError;
  } else {
    return TestFailure.UnknownError;
  }
}