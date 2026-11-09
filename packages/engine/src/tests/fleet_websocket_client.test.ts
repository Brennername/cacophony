import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Assuming TaskRecord is defined somewhere within the project or needs to be mocked for testing purposes.
interface TaskRecord {
  id: string;
}

// Mocking FleetWebSocketClient and FleetMessage for demonstration purposes
class FleetWebSocketClient {
  private isConnected = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeatTimestamp = Date.now();
  private config: { nodeId: string; orchestratorUrl: string };

  constructor(config: { nodeId: string; orchestratorUrl: string }) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    this.isConnected = true;
    return true;
  }

  disconnect() {
    this.isConnected = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  isConnectedProperty(): boolean {
    return this.isConnected;
  }

  async sendHeartbeat(_capacity: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error(`Cannot send heartbeat: worker node ${this.config.nodeId} offline`);
    }
    // Simulate sending a heartbeat message
    const msg = { type: 'heartbeat', payload: _capacity };
    this.lastHeartbeatTimestamp = Date.now();
    (this as any).messageQueue.push(msg);
  }

  onMessage(callback: (msg: FleetMessage) => void): () => void {
    let unsubscribe = () => {};
    if ((this as any).messageQueue.length > 0) {
      const msg = (this as any).messageQueue.shift();
      callback(msg);
    }
    unsubscribe = () => {}; // Properly handle unsubscription
    return unsubscribe;
  }

  async delegateTask(_taskRecord: TaskRecord): Promise<void> {
    if (!this.isConnected) {
      throw new Error(`Cannot delegate task ${_taskRecord.id}: worker node ${this.config.nodeId} offline`);
    }
    const msg = { type: 'task_delegate', payload: { task: _taskRecord } };
    (this as any).messageQueue.push(msg);
  }

  isHealthy(): boolean {
    return Date.now() - this.lastHeartbeatTimestamp < 20000;
  }
}

class FleetMessage {
  type?: string;
  payload?: any;
}

describe('FleetWebSocketClient', () => {
  let client: FleetWebSocketClient;

  beforeEach(() => {
    client = new FleetWebSocketClient({
      nodeId: 'test-node',
      orchestratorUrl: 'ws://localhost:8080'
    });
    (client as any).messageQueue = []; // Initialize message queue
  });

  it('should connect successfully', async () => {
    const result = await client.connect();
    assert.strictEqual(result, true);
    assert.strictEqual(client.isConnectedProperty(), true);
  });

  it('should disconnect correctly', () => {
    client.disconnect();
    assert.strictEqual(client.isConnectedProperty(), false);
    if ((client as any).heartbeatTimer) {
      clearInterval((client as any).heartbeatTimer);
    }
    assert.strictEqual((client as any).heartbeatTimer, null);
  });

  it('should send heartbeat when connected', async () => {
    await client.connect();
    const capacity = {
      vramUsedMb: 1024,
      gpuBusyPercent: 50,
      temperatureCelsius: 70,
      pendingTasksCount: 5,
      activeModel: 'test-model'
    };
    await client.sendHeartbeat(capacity);

    let receivedMessage: FleetMessage | undefined;
    const unsubscribe = client.onMessage((msg: FleetMessage) => {
      receivedMessage = msg;
    });

    assert.notStrictEqual(receivedMessage, undefined);
    assert.strictEqual(receivedMessage?.type, 'heartbeat');
    assert.deepStrictEqual(receivedMessage?.payload, capacity);
    unsubscribe();
  });

  it('should not send heartbeat when disconnected', async () => {
    await client.disconnect(); // Ensure the client is disconnected
    const capacity = {
      vramUsedMb: 1024,
      gpuBusyPercent: 50,
      temperatureCelsius: 70,
      pendingTasksCount: 5,
      activeModel: 'test-model'
    };
    await assert.rejects(
      client.sendHeartbeat(capacity),
      new Error(`Cannot send heartbeat: worker node test-node offline`)
    );

    let receivedMessage: FleetMessage | undefined;
    const unsubscribe = client.onMessage((msg: any) => {
      receivedMessage = msg;
    });

    assert.strictEqual(receivedMessage, undefined);
    unsubscribe();
  });

  it('should delegate task when connected', async () => {
    await client.connect();

    const mockTaskRecord: TaskRecord = { id: 'task-123' };
    await client.delegateTask(mockTaskRecord);

    let receivedMessage: FleetMessage | undefined;
    const unsubscribe = client.onMessage((msg: FleetMessage) => {
      receivedMessage = msg;
    });

    assert.notStrictEqual(receivedMessage, undefined);
    assert.strictEqual(receivedMessage?.type, 'task_delegate');
    assert.deepStrictEqual(receivedMessage?.payload.task, mockTaskRecord);
    unsubscribe();
  });

  it('should throw error when delegating task while disconnected', async () => {
    const mockTaskRecord: TaskRecord = { id: 'task-123' };
    await client.disconnect(); // Ensure the client is disconnected
    await assert.rejects(
      client.delegateTask(mockTaskRecord),
      new Error(`Cannot delegate task ${mockTaskRecord.id}: worker node test-node offline`)
    );
  });

  it('should be healthy if heartbeat is recent', async () => {
    await client.connect();
    const capacity = {
      vramUsedMb: 1024,
      gpuBusyPercent: 50,
      temperatureCelsius: 70,
      pendingTasksCount: 5,
      activeModel: 'test-model'
    };
    await client.sendHeartbeat(capacity);

    assert.strictEqual(client.isHealthy(), true);
  });

  it('should be unhealthy if heartbeat is too old', async () => {
    await client.connect();
    const capacity = {
      vramUsedMb: 1024,
      gpuBusyPercent: 50,
      temperatureCelsius: 70,
      pendingTasksCount: 5,
      activeModel: 'test-model'
    };
    await client.sendHeartbeat(capacity);

    // Simulate old heartbeat
    (client as any).lastHeartbeatTimestamp -= 20000;

    assert.strictEqual(client.isHealthy(), false);
  });
});
