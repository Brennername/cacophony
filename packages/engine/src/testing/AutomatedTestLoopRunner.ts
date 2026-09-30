import type { TestExecutionRepository } from "@cacophony/db";
import { TestRunnerDetector, type DetectedTestSuite } from "./TestRunnerDetector.js";
import { TestOutputParser, type ParsedTestOutput } from "./TestOutputParser.js";
import { SandboxedProcessRunner } from "./SandboxedProcessRunner.js";

export interface TestExecutionOptions {
  readonly taskId?: string | undefined;
  readonly sessionId?: string | undefined;
  readonly changedFiles?: readonly string[] | undefined;
  readonly timeoutMs?: number | undefined; 
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
  private readonly sandboxedRunner: SandboxedProcessRunner;

  constructor(
    private readonly repository?: TestExecutionRepository | undefined,
    detector?: TestRunnerDetector | undefined,
    parser?: TestOutputParser | undefined,
    sandboxedRunner?: SandboxedProcessRunner | undefined
  ) {
    this.detector = detector ?? new TestRunnerDetector();
    this.parser = parser ?? new TestOutputParser();
    this.sandboxedRunner = sandboxedRunner ?? new SandboxedProcessRunner();
  }

  public async runTests(
    workspaceRoot: string,
    options: TestExecutionOptions = {}
  ): Promise<TestRunResult> {
    const runId = `test-run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const timeoutMs = options.timeoutMs ?? 180000;
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

    const sandboxedResult = await this.sandboxedRunner.run(finalCommand, {
      cwd: workspaceRoot,
      timeoutMs,
      maxBufferBytes: 256 * 1024
    });

    const stdout = sandboxedResult.stdout;
    const stderr = sandboxedResult.stderr;
    const exitCode = sandboxedResult.exitCode;
    const durationMs = sandboxedResult.durationMs;
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
