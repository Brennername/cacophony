import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mock TerminalApp class for testing
class TerminalApp {
  private keyEventHandler: (event: string) => void;
  private renderLoopThrottler: () => void;
  private cleanExitHandler: () => void;

  constructor() {
    this.keyEventHandler = () => {};
    this.renderLoopThrottler = () => {};
    this.cleanExitHandler = () => {};
  }

  setKeyEventHandler(handler: (event: string) => void): void {
    this.keyEventHandler = handler;
  }

  setRenderLoopThrottler(throttler: () => void): void {
    this.renderLoopThrottler = throttler;
  }

  setCleanExitHandler(handler: () => void): void {
    this.cleanExitHandler = handler;
  }

  handleKeyEvent(event: string): void {
    this.keyEventHandler(event);
  }

  runRenderLoop(): void {
    this.renderLoopThrottler();
  }

  exitCleanly(): void {
    this.cleanExitHandler();
  }
}

describe('TerminalApp', () => {
  it('should handle key events correctly', async () => {
    const terminalApp = new TerminalApp();
    let eventHandled = false;

    terminalApp.setKeyEventHandler((event) => {
      assert.strictEqual(event, 'Enter');
      eventHandled = true;
    });

    terminalApp.handleKeyEvent('Enter');

    assert.ok(eventHandled);
  });

  it('should throttle render loop correctly', async () => {
    const terminalApp = new TerminalApp();
    let throttled = false;

    terminalApp.setRenderLoopThrottler(() => {
      throttled = true;
    });

    terminalApp.runRenderLoop();

    assert.ok(throttled);
  });

  it('should handle clean exit correctly', async () => {
    const terminalApp = new TerminalApp();
    let exitedCleanly = false;

    terminalApp.setCleanExitHandler(() => {
      exitedCleanly = true;
    });

    terminalApp.exitCleanly();

    assert.ok(exitedCleanly);
  });
});
