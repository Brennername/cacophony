import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Assuming rule.validate is a function that needs to be defined elsewhere in your project
// For the purpose of this example, let's define a mock implementation
const rule = {
  validate: (file: string) => {
    // Mock implementation to reject subfolders containing unauthorized files
    return !file.includes('/unauthorized/');
  }
};

describe('Loose Root File Guard Rule', () => {
  it('should reject subfolders containing unauthorized files', () => {
    const file1 = 'src/main.ts';
    const file2 = 'src/unauthorized/subfolder/file.ts';

    assert(rule.validate(file1) === true, 'File should be allowed');
    assert(rule.validate(file2) === false, 'Subfolder with unauthorized file should be rejected');
  });
});
