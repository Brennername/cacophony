export type ExecutionSafetyMode = "plan" | "build" | "auto";

export interface BatchExecutionResult {
  readonly exitCode: number;
  readonly mode: ExecutionSafetyMode;
  readonly prompt: string;
  readonly success: boolean;
  readonly error?: string;
  readonly diffs?: readonly string[];
  readonly testsPassed?: boolean;
}

/**
 * ExecutionSafetyManager enforces guardrails across Plan, Build, and Auto modes.
 * - Plan: Read-only context analysis, no disk modifications allowed.
 * - Build: Allows disk edits and test runs, requires explicit approval for Git commit/PR.
 * - Auto: Full autonomy through pipeline.
 */
export class ExecutionSafetyManager {
  private currentMode: ExecutionSafetyMode = "build";

  constructor(initialMode: ExecutionSafetyMode = "build") {
    this.currentMode = initialMode;
  }

  public getMode(): ExecutionSafetyMode {
    return this.currentMode;
  }

  public setMode(mode: ExecutionSafetyMode): void {
    this.currentMode = mode;
  }

  public canModifyDisk(): boolean {
    return this.currentMode === "build" || this.currentMode === "auto";
  }

  public requiresApprovalForCommit(): boolean {
    return this.currentMode === "build";
  }

  public assertCanModifyDisk(operationName: string): void {
    if (!this.canModifyDisk()) {
      throw new Error(`Disk modification forbidden in Plan Mode: cannot execute '${operationName}'`);
    }
  }
}
