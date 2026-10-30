import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { triageTestFailure, TestFailureCategory } from '../testing/TestFailureTriager.js';

describe('TestFailureTriager', () => {
  it('should classify syntax errors correctly', () => {
    const stderr = "SyntaxError: Unexpected token '}'";
    const result = triageTestFailure(stderr);
    assert.strictEqual(result, TestFailureCategory.SyntaxError);
  });

  it('should classify assertion errors correctly', () => {
    const stderr = "AssertionError: expected true to be false";
    const result = triageTestFailure(stderr);
    assert.strictEqual(result, TestFailureCategory.AssertionError);
  });

  it('should classify timeout errors correctly', () => {
    const stderr = "TimeoutError: operation timed out";
    const result = triageTestFailure(stderr);
    assert.strictEqual(result, TestFailureCategory.TimeoutError);
  });

  it('should classify reference errors correctly', () => {
    const stderr = "ReferenceError: myVar is not defined";
    const result = triageTestFailure(stderr);
    assert.strictEqual(result, TestFailureCategory.ReferenceError);
  });

  it('should classify out of memory errors correctly', () => {
    const stderr = "OutOfMemoryError: Process out of memory";
    const result = triageTestFailure(stderr);
    assert.strictEqual(result, TestFailureCategory.OutOfMemoryError);
  });

  it('should classify network errors correctly', () => {
    const stderr = "NetworkError: Failed to fetch";
    const result = triageTestFailure(stderr);
    assert.strictEqual(result, TestFailureCategory.NetworkError);
  });

  it('should classify file not found errors correctly', () => {
    const stderr = "FileNotFoundError: ENOENT: no such file or directory, open 'path/to/file'";
    const result = triageTestFailure(stderr);
    assert.strictEqual(result, TestFailureCategory.FileNotFoundException);
  });

  it('should classify permission errors correctly', () => {
    const stderr = "PermissionError: EACCES: permission denied, open 'path/to/file'";
    const result = triageTestFailure(stderr);
    assert.strictEqual(result, TestFailureCategory.PermissionError);
  });

  it('should classify unknown errors correctly', () => {
    const stderr = "Unknown error occurred";
    const result = triageTestFailure(stderr);
    assert.strictEqual(result, TestFailureCategory.UnknownError);
  });
});