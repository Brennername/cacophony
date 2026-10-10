import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

class TaskSseStreams {
  private clients: Map<string, Set<(token: string) => void>>;

  constructor() {
    this.clients = new Map();
  }

  connect(taskId: string, client: (token: string) => void): void {
    if (!this.clients.has(taskId)) {
      this.clients.set(taskId, new Set());
    }
    this.clients.get(taskId)?.add(client);
  }

  disconnect(taskId: string, client: (token: string) => void): void {
    this.clients.get(taskId)?.delete(client);
  }

  async sendToken(taskId: string, token: string): Promise<void> {
    const clients = this.clients.get(taskId);
    if (clients) {
      for (const client of clients) {
        client(token);
      }
    }
  }

  async closeAllConnections(): Promise<void> {
    this.clients.clear();
  }
}

describe('Task SSE Streams Integration Tests', () => {
  let taskSseStreams: TaskSseStreams;

  beforeEach(() => {
    // Initialize the TaskSseStreams instance before each test
    taskSseStreams = new TaskSseStreams();
  });

  afterEach(async () => {
    // Clean up any resources after each test
    await taskSseStreams.closeAllConnections();
  });

  it('should connect multiple SSE clients to different tasks', async () => {
    const taskId1 = 'task-001';
    const taskId2 = 'task-002';

    // Create mock SSE client functions for testing
    let receivedTokenStream1: string[] = [];
    let receivedTokenStream2: string[] = [];

    const sseClient1 = (token: string) => {
      receivedTokenStream1.push(token);
    };

    const sseClient2 = (token: string) => {
      receivedTokenStream2.push(token);
    };

    // Connect clients to different tasks
    taskSseStreams.connect(taskId1, sseClient1);
    taskSseStreams.connect(taskId2, sseClient2);

    // Simulate token streams for each task
    const tokensForTask1 = ['token-001', 'token-002'];
    const tokensForTask2 = ['token-003', 'token-004'];

    for (const token of tokensForTask1) {
      await taskSseStreams.sendToken(taskId1, token);
    }

    for (const token of tokensForTask2) {
      await taskSseStreams.sendToken(taskId2, token);
    }

    // Verify that each client received the correct token stream
    assert.deepEqual(receivedTokenStream1, tokensForTask1, 'Client 1 did not receive the correct token stream');
    assert.deepEqual(receivedTokenStream2, tokensForTask2, 'Client 2 did not receive the correct token stream');
  });

  it('should handle disconnection of a single client without affecting others', async () => {
    const taskId = 'task-001';

    // Create mock SSE client functions for testing
    let receivedTokenStream1: string[] = [];
    let receivedTokenStream2: string[] = [];

    const sseClient1 = (token: string) => {
      receivedTokenStream1.push(token);
    };

    const sseClient2 = (token: string) => {
      receivedTokenStream2.push(token);
    };

    // Connect clients to the same task
    taskSseStreams.connect(taskId, sseClient1);
    taskSseStreams.connect(taskId, sseClient2);

    // Simulate token stream for the task
    const tokens = ['token-001', 'token-002'];

    for (const token of tokens) {
      await taskSseStreams.sendToken(taskId, token);
    }

    // Disconnect one client
    taskSseStreams.disconnect(taskId, sseClient1);

    // Send more tokens to verify the disconnected client does not receive them
    const additionalTokens = ['token-003', 'token-004'];
    for (const token of additionalTokens) {
      await taskSseStreams.sendToken(taskId, token);
    }

    // Verify that the disconnected client did not receive additional tokens
    assert.deepEqual(receivedTokenStream1, tokens, 'Disconnected client received unexpected tokens');

    // Verify that the other client received all tokens
    const expectedReceivedTokenStream2 = [...tokens, ...additionalTokens];
    assert.deepEqual(receivedTokenStream2, expectedReceivedTokenStream2, 'Connected client did not receive all tokens');
  });
});
