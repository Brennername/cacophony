import * as childProcess from "node:child_process";
import * as util from "node:util";
import type { TestExecutionRepository } from "@cacophony/db";
import { TestRunnerDetector, type DetectedTestSuite } from "./TestRunnerDetector.js";
import { TestOutputParser, type ParsedTestOutput } from "./TestOutputParser.js";

const execAsync = util.promisify(childProcess.exec);

export interface TestExecutionOptions {
  readonly taskId?: string | undefined;
  readonly sessionId?: string | undefined;
  readonly changedFiles?: readonly string[] | undefined;
  readonly timeoutMs?: number | undefined; // default 120000 (60s)
  readonly commandOverride?: string | undefined;
  readonly attemptNumber?: number | undefined;
}

export interface TestRunResult {
  readonly id: string;
  readonly framework: string;
  readonly command: string;
  readonly exitCode: number;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly parsed: ParsedTestOutput;
  readonly remediationSnippet: string;
}

/**
 * AutomatedTestLoopRunner
 *
 * Executes scoped test suites automatically post-edit:
 * - Detects or accepts scoped test commands
 * - Executes in child process with timeout protection
 * - Parses outputs, extracts assertion diffs, and persists run records into database
 */
export class AutomatedTestLoopRunner {
  private readonly detector: TestRunnerDetector;
  private readonly parser: TestOutputParser;

  constructor(
    private readonly repository?: TestExecutionRepository | undefined,
    detector?: TestRunnerDetector | undefined,
    parser?: TestOutputParser | undefined
  ) {
    this.detector = detector ?? new TestRunnerDetector();
    this.parser = parser ?? new TestOutputParser();
  }

  public async runTests(
    workspaceRoot: string,
    options: TestExecutionOptions = {}
  ): Promise<TestRunResult> {
    const startTime = Date.now();
    const runId = `test-run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const timeoutMs = options.timeoutMs ?? 120000;
    const attempt = options.attemptNumber ?? 1;

    let detected: DetectedTestSuite;
    let finalCommand: string;

    if (options.commandOverride) {
      detected = { framework: "generic", defaultCommand: options.commandOverride, confidence: 1.0 };
      finalCommand = options.commandOverride;
    } else {
      detected = await this.detector.detect(workspaceRoot);
      finalCommand = this.detector.scopeCommand(detected, options.changedFiles ?? []);
    }

    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      const execResult = await execAsync(finalCommand, {
        cwd: workspaceRoot,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024
      });
      stdout = execResult.stdout;
      stderr = execResult.stderr;
      exitCode = 0;
    } catch (err: unknown) {
      const errorObj = err as { stdout?: string; stderr?: string; code?: number; message?: string };
      stdout = errorObj.stdout || "";
      stderr = errorObj.stderr || errorObj.message || String(err);
      exitCode = typeof errorObj.code === "number" ? errorObj.code : 1;
    }

    const durationMs = Date.now() - startTime;
    const parsed = this.parser.parse(stdout, stderr);
    const passed = exitCode === 0 && parsed.passed;
    const remediationSnippet = this.parser.formatRemediationSnippet(parsed);

    if (this.repository) {
      await this.repository.recordRun({
        id: runId,
        task_id: options.taskId ?? null,
        session_id: options.sessionId ?? null,
        test_framework: detected.framework,
        test_command: finalCommand,
        scoped_files_json: JSON.stringify(options.changedFiles ?? []),
        exit_code: exitCode,
        passed,
        duration_ms: durationMs,
        stdout,
        stderr,
        failed_assertions_json: JSON.stringify(parsed.failures),
        root_causes_json: JSON.stringify(parsed.rootCauses),
        remediation_attempt: attempt
      });
    }

    return {
      id: runId,
      framework: detected.framework,
      command: finalCommand,
      exitCode,
      passed,
      durationMs,
      stdout,
      stderr,
      parsed,
      remediationSnippet
    };
  }
}
