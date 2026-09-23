/**
 * ExecutionMutex
 *
 * Enforces single concurrency for GPU-intensive and compilation workloads on the
 * Vega APU, preventing concurrent VRAM thrashing and kernel ring resets.
 */
export class ExecutionMutex {
  private locked = false;
  private readonly waitQueue: Array<() => void> = [];

  /**
   * Acquires the execution lock. Returns a release function that must be called
   * upon workload completion.
   */
  public async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }

    return new Promise<() => void>((resolve) => {
      this.waitQueue.push(() => {
        this.locked = true;
        resolve(() => this.release());
      });
    });
  }

  /**
   * Checks whether the mutex is currently locked.
   */
  public isLocked(): boolean {
    return this.locked;
  }

  /**
   * Returns current count of queued waiting callers.
   */
  public getWaitingCount(): number {
    return this.waitQueue.length;
  }

  private release(): void {
    const next = this.waitQueue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}
