import type { AutomatedTestLoopRunner, TestRunResult } from "./AutomatedTestLoopRunner.js";
import type { GitUndoManager } from "../git/GitUndoManager.js";

export interface RemediationOptions {
  readonly maxAttempts?: number | undefined; // default 3
  readonly rollbackOnFailure?: boolean | undefined; // default true
}

export interface RemediationResult {
  readonly success: boolean;
  readonly totalAttempts: number;
  readonly rolledBack: boolean;
  readonly finalTestResult: TestRunResult;
}

export type CodeRemediationHandler = (
  remediationSnippet: string,
  attempt: number
) => Promise<void>;

/**
 * ClosedLoopTestRemediator
 *
 * Coordinates bounded closed-loop test remediation:
 * - Runs test suite via AutomatedTestLoopRunner
 * - If failing, invokes model remediation handler with parsed failure snippets (up to maxAttempts)
 * - Automatically rolls back changes via GitUndoManager if all attempts fail
 */
export class ClosedLoopTestRemediator {
  private readonly maxAttempts: number;
  private readonly rollbackOnFailure: boolean;

  constructor(
    private readonly testRunner: AutomatedTestLoopRunner,
    private readonly undoManager?: GitUndoManager | undefined,
    options: RemediationOptions = {}
  ) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.rollbackOnFailure = options.rollbackOnFailure ?? true;
  }

  public async executeLoop(
    workspaceRoot: string,
    remediationHandler: CodeRemediationHandler,
    contextOptions: { taskId?: string; sessionId?: string; changedFiles?: readonly string[] } = {}
  ): Promise<RemediationResult> {
    let attempt = 1;
    let latestRun: TestRunResult | null = null;

    while (attempt <= this.maxAttempts) {
      latestRun = await this.testRunner.runTests(workspaceRoot, {
        taskId: contextOptions.taskId,
        sessionId: contextOptions.sessionId,
        changedFiles: contextOptions.changedFiles,
        attemptNumber: attempt
      });

      if (latestRun.passed) {
        return {
          success: true,
          totalAttempts: attempt,
          rolledBack: false,
          finalTestResult: latestRun
        };
      }

      if (attempt < this.maxAttempts) {
        // Invoke remediation callback to generate and apply code fix
        await remediationHandler(latestRun.remediationSnippet, attempt);
      }

      attempt++;
    }

    // All attempts failed
    let rolledBack = false;
    if (this.rollbackOnFailure && this.undoManager) {
      const undoRes = await this.undoManager.undo(workspaceRoot, contextOptions.sessionId);
      rolledBack = undoRes.success;
    }

    return {
      success: false,
      totalAttempts: this.maxAttempts,
      rolledBack,
      finalTestResult: latestRun!
    };
  }
}
