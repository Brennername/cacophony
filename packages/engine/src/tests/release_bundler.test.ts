import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ReleaseBundlerService, type ReleaseTaskItem } from "../gitea/ReleaseBundlerService.js";

describe("ReleaseBundlerService Suite (T80.3)", () => {
  test("computeNextVersion performs semantic increments correctly", () => {
    const bundler = new ReleaseBundlerService();

    const fixTasks: ReleaseTaskItem[] = [
      { id: "t1", title: "fix(engine): resolve race condition in scheduler", testsCount: 5 }
    ];
    assert.equal(bundler.computeNextVersion("1.0.0", fixTasks), "1.0.1");

    const featTasks: ReleaseTaskItem[] = [
      { id: "t1", title: "fix(engine): resolve race condition in scheduler" },
      { id: "t2", title: "feat(epoch): implement arena telemetry epoching" }
    ];
    assert.equal(bundler.computeNextVersion("1.0.0", featTasks), "1.1.0");

    const breakingTasks: ReleaseTaskItem[] = [
      { id: "t1", title: "feat!: redesign database schema for multi-tenancy", breakingChange: true }
    ];
    assert.equal(bundler.computeNextVersion("1.2.3", breakingTasks), "2.0.0");
  });

  test("generateChangelog formats structured markdown without emojis", () => {
    const bundler = new ReleaseBundlerService();

    const tasks: ReleaseTaskItem[] = [
      { id: "T82.1", title: "feat(epoch): database migrations for epoching", category: "feat", testsCount: 3, prNumber: 101 },
      { id: "T82.2", title: "fix(bandit): prevent NaN in beta sample prior", category: "fix", testsCount: 4, prNumber: 102 },
      { id: "T82.3", title: "refactor(stream): extract tap stream manager", category: "refactor", testsCount: 2, prNumber: 103 },
      { id: "T82.4", title: "docs: update taskcade tracking", category: "docs", testsCount: 0 }
    ];

    const changelog = bundler.generateChangelog("1.1.0", tasks, {
      milestoneTitle: "Milestone Era: Epoch Management",
      previousVersion: "1.0.4"
    });

    assert.match(changelog, /# Release v1.1.0/);
    assert.match(changelog, /## Features/);
    assert.match(changelog, /\*\*\[T82.1\]\*\* feat\(epoch\): database migrations for epoching \(#101\)/);
    assert.match(changelog, /## Bug Fixes/);
    assert.match(changelog, /\*\*\[T82.2\]\*\* fix\(bandit\): prevent NaN in beta sample prior \(#102\)/);
    assert.match(changelog, /## Refactoring and Architecture/);
    assert.match(changelog, /## Verification and Quality Metrics/);
    assert.match(changelog, /Passing Automated Tests: 9/);
    assert.match(changelog, /Total Tasks Bundled: 4/);

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
    assert.equal(emojiRegex.test(changelog), false);
  });

  test("bundleMilestone aggregates bundle metadata, branch, and metrics", () => {
    const bundler = new ReleaseBundlerService();

    const tasks: ReleaseTaskItem[] = [
      { id: "T80.1", title: "feat(promotion): implement monorepo build gate", testsCount: 4 },
      { id: "T80.2", title: "feat(promotion): secret and emoji sanitizer", testsCount: 5 }
    ];

    const bundle = bundler.bundleMilestone({
      milestoneTitle: "Sprint 48 Promotion Pipeline",
      previousVersion: "1.2.0",
      tasks
    });

    assert.equal(bundle.version, "1.3.0");
    assert.equal(bundle.releaseBranch, "release/v1.3.0");
    assert.equal(bundle.metrics.totalTasks, 2);
    assert.equal(bundle.metrics.totalTests, 9);
    assert.equal(bundle.metrics.featuresCount, 2);
    assert.equal(bundle.metrics.fixesCount, 0);
  });
});
