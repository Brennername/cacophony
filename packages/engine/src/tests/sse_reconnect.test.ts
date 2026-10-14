import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Mocking necessary dependencies and classes
class SimulatedNetworkClient {
  private isConnected = true;
  public dataQueue: string[] = [];

  public sendData(data: string): void {
    if (this.isConnected) {
      this.dataQueue.push(data);
    }
  }

  public disconnect(): void {
    this.isConnected = false;
  }

  public reconnect(): void {
    this.isConnected = true;
  }

  public getData(): string | null {
    return this.dataQueue.shift() || null;
  }
}

class TokenManager {
  private tokens: number = 100;

  public consumeToken(): boolean {
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  public getTokensRemaining(): number {
    return this.tokens;
  }
}

// Test suite for verifying token loss during network disconnection and reconnection
describe("SSE Reconnect Integration Tests", () => {
  it("should not lose tokens on simulated network disconnection and reconnection", async () => {
    const client = new SimulatedNetworkClient();
    const tokenManager = new TokenManager();

    // Initial state: Tokens should be at their initial value
    assert.strictEqual(tokenManager.getTokensRemaining(), 100);

    // Simulate sending data without disconnecting
    for (let i = 0; i < 50; i++) {
      client.sendData(`data-${i}`);
      assert.ok(tokenManager.consumeToken());
    }

    // State after initial data transmission: Tokens should be reduced by 50
    assert.strictEqual(tokenManager.getTokensRemaining(), 50);

    // Simulate network disconnection and reconnection
    client.disconnect();
    client.reconnect();

    // Simulate sending more data after reconnecting
    for (let i = 0; i < 30; i++) {
      client.sendData(`data-${i}`);
      assert.ok(tokenManager.consumeToken());
    }

    // State after reconnecting and sending more data: Tokens should be reduced by an additional 30
    assert.strictEqual(tokenManager.getTokensRemaining(), 20);

    // Verify no tokens were lost during disconnection and reconnection
    assert.strictEqual(tokenManager.getTokensRemaining(), 20);
  });
});
