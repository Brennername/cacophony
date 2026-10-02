/**
 * Common test failure classification categories.
 */
export enum TestFailureCategory {
  AssertionError = "AssertionError",
  TimeoutError = "TimeoutError",
  SyntaxError = "SyntaxError",
  ReferenceError = "ReferenceError",
  OutOfMemoryError = "OutOfMemoryError",
  NetworkError = "NetworkError",
  FileNotFoundException = "FileNotFoundException",
  PermissionError = "PermissionError",
  UnknownError = "UnknownError"
}

// Backward compatibility alias
export const TestFailure = TestFailureCategory;
export type TestFailure = TestFailureCategory;

/**
 * Triages a test failure based on its stderr output.
 *
 * @param stderr - The stderr output of the failed test.
 * @returns A category representing the root cause of the test failure.
 */
export function triageTestFailure(stderr: string): TestFailureCategory {
  if (stderr.includes("AssertionError")) {
    return TestFailureCategory.AssertionError;
  } else if (stderr.includes("TimeoutError")) {
    return TestFailureCategory.TimeoutError;
  } else if (stderr.includes("SyntaxError")) {
    return TestFailureCategory.SyntaxError;
  } else if (stderr.includes("ReferenceError")) {
    return TestFailureCategory.ReferenceError;
  } else if (stderr.includes("OutOfMemoryError")) {
    return TestFailureCategory.OutOfMemoryError;
  } else if (stderr.includes("NetworkError")) {
    return TestFailureCategory.NetworkError;
  } else if (stderr.includes("FileNotFoundError") || stderr.includes("ENOENT")) {
    return TestFailureCategory.FileNotFoundException;
  } else if (stderr.includes("PermissionError") || stderr.includes("EACCES")) {
    return TestFailureCategory.PermissionError;
  } else {
    return TestFailureCategory.UnknownError;
  }
}