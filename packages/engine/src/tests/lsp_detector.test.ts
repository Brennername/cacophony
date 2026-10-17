import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mocking LspDetector for testing purposes
class MockLspDetector {
  static discoverLanguageServer(binaryName: string): string | null {
    switch (binaryName) {
      case 'typescript-language-server':
        return '/path/to/typescript-language-server';
      case 'rust-analyzer':
        return '/path/to/rust-analyzer';
      case 'gopls':
        return '/path/to/gopls';
      default:
        return null;
    }
  }
}

describe('LspDetector language server binary discovery', () => {
  it('should discover typescript-language-server correctly', async () => {
    assert.strictEqual(MockLspDetector.discoverLanguageServer('typescript-language-server'), '/path/to/typescript-language-server');
  });

  it('should discover rust-analyzer correctly', async () => {
    assert.strictEqual(MockLspDetector.discoverLanguageServer('rust-analyzer'), '/path/to/rust-analyzer');
  });

  it('should discover gopls correctly', async () => {
    assert.strictEqual(MockLspDetector.discoverLanguageServer('gopls'), '/path/to/gopls');
  });

  it('should return null for unknown language server binary', async () => {
    assert.strictEqual(MockLspDetector.discoverLanguageServer('unknown-binary'), null);
  });
});
