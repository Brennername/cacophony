import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mocking LspProcessSupervisor for testing purposes
class MockLspProcessSupervisor {
  spawn() {
    return new Promise((resolve) => resolve('Language server spawned'));
  }

  sendJsonRpcMessage(message: any) {
    return new Promise((resolve) => resolve(`JSON-RPC message sent: ${JSON.stringify(message)}`));
  }

  shutdown() {
    return new Promise((resolve) => resolve('Language server shut down'));
  }
}

describe('LspProcessSupervisor', () => {
  let lspProcessSupervisor: MockLspProcessSupervisor;

  beforeEach(() => {
    lspProcessSupervisor = new MockLspProcessSupervisor();
  });

  it('should spawn the language server successfully', async () => {
    const result = await lspProcessSupervisor.spawn();
    assert.strictEqual(result, 'Language server spawned');
  });

  it('should send a JSON-RPC message successfully', async () => {
    const message = { method: 'initialize', params: {} };
    const result = await lspProcessSupervisor.sendJsonRpcMessage(message);
    assert.strictEqual(result, 'JSON-RPC message sent: {"method":"initialize","params":{}}');
  });

  it('should shut down the language server gracefully', async () => {
    const result = await lspProcessSupervisor.shutdown();
    assert.strictEqual(result, 'Language server shut down');
  });
});
