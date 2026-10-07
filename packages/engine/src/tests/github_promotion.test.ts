import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GitHubPromotionPipeline } from "../gitea/GitHubPromotionPipeline.js";
import { type IGitPlatformProvider, type GitPlatformPullRequest, type CreateGitPullRequestOptions } from "../gitea/IGitPlatformProvider.js";
import { SandboxedProcessRunner, type SandboxedProcessOptions, type SandboxedProcessResult } from "../testing/SandboxedProcessRunner.js";

class MockGitHubProvider implements IGitPlatformProvider {
  public readonly providerType = "github" as const;
  public openedPrs: Array<{ owner: string; repo: string; options: CreateGitPullRequestOptions }> = [];
  public nextPrId = 100;

  public async openPullRequest(
    owner: string,
    repo: string,
    options: CreateGitPullRequestOptions
  ): Promise<GitPlatformPullRequest> {
    this.openedPrs.push({ owner, repo, options });
    const prNumber = ++this.nextPrId;
    return {
      id: prNumber,
      number: prNumber,
      title: options.title,
      body: options.body,
      state: "open",
      merged: false,
      headRef: options.head,
      baseRef: options.base,
      htmlUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`
    };
  }

  public async createBranch(): Promise<any> { return { name: "test" }; }
  public async getPullRequest(): Promise<any> { throw new Error("not implemented"); }
  public async getPullRequestDiff(): Promise<string> { return ""; }
  public async submitReview(): Promise<any> { return { id: 1, status: "APPROVED" }; }
  public async mergePullRequest(): Promise<boolean> { return true; }
}

class MockRunner extends SandboxedProcessRunner {
  public executedCommands: string[] = [];
  public mockExitCode = 0;

  public override async run(command: string, _options: SandboxedProcessOptions): Promise<SandboxedProcessResult> {
    this.executedCommands.push(command);
    return {
      exitCode: this.mockExitCode,
      signal: null,
      durationMs: 50,
      stdout: "Command output",
      stderr: this.mockExitCode === 0 ? "" : "Simulated command failure",
      timedOut: false,
      truncated: false
    };
  }
}

describe("GitHubPromotionPipeline Suite (T80.4)", () => {
  test("quarantine gauntlet aborts promotion if secret leak is detected", async () => {
    const mockProvider = new MockGitHubProvider();
    const mockRunner = new MockRunner();
    const pipeline = new GitHubPromotionPipeline({
      gitPlatformProvider: mockProvider,
      runner: mockRunner,
      repoOwner: "test-owner",
      repoName: "test-repo"
    });

    const sampleAws = ["AKIA", "IOSFODNN7EXAMPLE"].join("");
    const dirtyDiff = `
--- a/config.ts
+++ b/config.ts
@@ -1,1 +1,2 @@
+const key = "${sampleAws}";
`;

    const result = await pipeline.promoteMilestoneToGitHub({
      releaseBranch: "release/v1.1.0",
      milestoneTitle: "Milestone 80",
      changelog: "### Features\n- New feature",
      diff: dirtyDiff
    });

    assert.equal(result.success, false);
    assert.equal(result.quarantinePassed, false);
    assert.match(result.error!, /secret leak/i);
    assert.equal(mockProvider.openedPrs.length, 0);
  });

  test("dry-run mode verifies quarantine without pushing or creating PR", async () => {
    const mockProvider = new MockGitHubProvider();
    const mockRunner = new MockRunner();
    const pipeline = new GitHubPromotionPipeline({
      gitPlatformProvider: mockProvider,
      runner: mockRunner,
      repoOwner: "test-owner",
      repoName: "test-repo"
    });

    const cleanDiff = `
--- a/code.ts
+++ b/code.ts
@@ -1,1 +1,2 @@
+export const value = 42;
`;

    const result = await pipeline.promoteMilestoneToGitHub({
      releaseBranch: "release/v1.2.0",
      milestoneTitle: "Sprint 48 Promotion",
      changelog: "## Features\n- Clean feature",
      diff: cleanDiff,
      dryRun: true
    });

    assert.equal(result.success, true);
    assert.equal(result.dryRun, true);
    assert.equal(result.quarantinePassed, true);
    assert.equal(mockRunner.executedCommands.length, 0);
    assert.equal(mockProvider.openedPrs.length, 0);
  });

  test("successful promotion pushes branch and opens cohesive PR with badges and changelog", async () => {
    const mockProvider = new MockGitHubProvider();
    const mockRunner = new MockRunner();
    const pipeline = new GitHubPromotionPipeline({
      gitPlatformProvider: mockProvider,
      runner: mockRunner,
      repoOwner: "cacophony-org",
      repoName: "cacophony",
      baseBranch: "main",
      gitRemote: "origin"
    });

    const result = await pipeline.promoteMilestoneToGitHub({
      releaseBranch: "release/v1.2.0",
      milestoneTitle: "Sprint 48 Promotion",
      changelog: "## Features\n- Verification and promotion gauntlet",
      dryRun: false
    });

    assert.equal(result.success, true);
    assert.equal(result.dryRun, false);
    assert.equal(result.quarantinePassed, true);
    assert.equal(result.pullRequest?.number, 101);
    assert.equal(mockRunner.executedCommands.length, 1);
    assert.match(mockRunner.executedCommands[0]!, /git push origin release\/v1\.2\.0:release\/v1\.2\.0/);

    assert.equal(mockProvider.openedPrs.length, 1);
    const openedPr = mockProvider.openedPrs[0]!;
    assert.equal(openedPr.owner, "cacophony-org");
    assert.equal(openedPr.repo, "cacophony");
    assert.equal(openedPr.options.title, "[Milestone Release] Sprint 48 Promotion");
    assert.match(openedPr.options.body, /Cacophony_Verification-100%25_Passed/);
    assert.match(openedPr.options.body, /## Features/);
  });
});
