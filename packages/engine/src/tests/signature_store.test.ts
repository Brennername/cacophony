import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

class MockSignatureStore {
  private cache: Map<string, string> = new Map();

  public get(symbolName: string): string | undefined {
    return this.cache.get(symbolName);
  }

  public set(symbolName: string, signature: string): void {
    this.cache.set(symbolName, signature);
  }

  public delete(symbolName: string): boolean {
    return this.cache.delete(symbolName);
  }
}

describe('SignatureStore', () => {
  let signatureStore: MockSignatureStore;

  beforeEach(() => {
    signatureStore = new MockSignatureStore();
  });

  it('should cache signatures by symbol name', async () => {
    const symbolName = 'exampleSymbol';
    const signature = 'exampleSignature';

    signatureStore.set(symbolName, signature);

    assert.strictEqual(signatureStore.get(symbolName), signature);
  });

  it('should return undefined for non-existent symbol names', async () => {
    const symbolName = 'nonExistentSymbol';

    assert.strictEqual(signatureStore.get(symbolName), undefined);
  });

  it('should invalidate signatures on file edits', async () => {
    const symbolName = 'exampleSymbol';
    const signature1 = 'exampleSignature1';
    const signature2 = 'exampleSignature2';

    signatureStore.set(symbolName, signature1);

    assert.strictEqual(signatureStore.get(symbolName), signature1);

    signatureStore.delete(symbolName);
    signatureStore.set(symbolName, signature2);

    assert.strictEqual(signatureStore.get(symbolName), signature2);
  });
});
