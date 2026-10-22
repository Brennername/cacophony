import { execFileSync } from "node:child_process";
import type { TaskRecord } from "@cacophony/shared-types";

export interface GitCommitRecord {
  readonly hash: string;
  readonly author: string;
  readonly timestamp: number;
  readonly subject: string;
  readonly filesChanged?: readonly string[];
}

export interface CommitCorrelationResult {
  readonly culpritCommit: GitCommitRecord | null;
  readonly confidenceScore: number;
  readonly matchedFiles: readonly string[];
  readonly rationale: string;
}

/**
 * GitRegressionCorrelator
 *
 * Correlates task failures and sudden error rate surges back to specific
 * git commit hashes by aligning failure timestamps and touched source paths
 * with the repository's commit history.
 */
export class GitRegressionCorrelator {
  private readonly repoDir: string;
  private readonly customRunner?: ((cmd: string) => string) | undefined;

  constructor(
    repoDir: string = process.cwd(),
    commandRunner?: (cmd: string) => string,
  ) {
    this.repoDir = repoDir;
    this.customRunner = commandRunner;
  }

  /**
   * Executes a git command safely using execFileSync with argument array,
   * completely avoiding shell execution (/bin/sh) and preventing command injection.
   * If a custom test runner is supplied, it falls back to formatting the command string safely.
   */
  private runGit(args: readonly string[]): string {
    if (this.customRunner) {
      return this.customRunner(["git", ...args].join(" "));
    }
    return execFileSync("git", [...args], {
      cwd: this.repoDir,
      encoding: "utf-8",
      timeout: 4000,
    });
  }

  /**
   * Retrieves recent commit history from local git repository.
   */
  /**
   * Retrieves recent commit history from local git repository.
   */
  public getRecentCommits(limit: number = 20): GitCommitRecord[] {
    try {
      const safeLimit = Math.max(
        1,
        Math.min(100, Math.floor(Number(limit)) || 20),
      );
      const output = this.runGit([
        "log",
        "-n",
        String(safeLimit),
        "--pretty=format:%H|%an|%at|%s",
      ]);
      const lines = output
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      return lines.map((line) => {
        const [hash = "", author = "", atStr = "0", ...subParts] =
          line.split("|");
        const subject = subParts.join("|");
        return {
          hash,
          author,
          timestamp: parseInt(atStr, 10) * 1000,
          subject,
        };
      });
    } catch (error) { // Catch all errors during git execution
      console.warn("Error getting recent commits:", error);
      return [];
    }
  }

  /**
   * Identifies which files were modified in a given commit hash.
   */
  /**
   * Identifies which files were modified in a given commit hash.
   */
  public getCommitFiles(commitHash: string): string[] {
    try {
      if (
        typeof commitHash !== "string" ||
        !/^[a-fA-F0-9]{4,64}$/.test(commitHash.trim())
      ) {
        return [];
      }
      const safeHash = commitHash.trim();
      const output = this.runGit([
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        safeHash,
      ]);
      return output
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
    } catch (error) { // Catch all errors during git execution
      console.warn("Error getting commit files:", error);
      return [];
    }
  }

  /**
   * Maps a failed task record back to the most probable culprit commit.
   */
  /**
   * Maps a failed task record back to the most probable culprit commit.
   */
  public correlateFailure(
    failedTask: TaskRecord,
    commitPool?: readonly GitCommitRecord[],
  ): CommitCorrelationResult {
    const commits = commitPool ?? this.getRecentCommits(15);
    if (commits.length === 0) {
      return {
        culpritCommit: null,
        confidenceScore: 0.0,
        matchedFiles: [],
        rationale: "No recent git commit history available.",
      };
    }

    const taskTime = new Date(
      failedTask.completedAt ?? failedTask.updatedAt,
    ).getTime();
    const taskFocusFiles = failedTask.focusFiles
      ? failedTask.focusFiles.split(",").map((f) => f.trim())
      : [];

    for (const commit of commits) {
      const commitFiles = this.getCommitFiles(commit.hash);
      const overlappingFiles = taskFocusFiles.filter((tf) =>
        commitFiles.some((cf) => cf.includes(tf) || tf.includes(cf)),
      );

      if (overlappingFiles.length > 0) {
        return {
          culpritCommit: { ...commit, filesChanged: commitFiles },
          confidenceScore: 0.9,
          matchedFiles: overlappingFiles,
          rationale: `Commit ${commit.hash.slice(0, 8)} modified overlapping focus file(s): ${overlappingFiles.join(", ")}`,
        };
      }
    }

    const candidate =
      commits.find((c) => c.timestamp <= taskTime) ?? commits[0];
    if (candidate) {
      return {
        culpritCommit: candidate,
        confidenceScore: 0.4,
        matchedFiles: [],
        rationale: `Commit ${candidate.hash.slice(0, 8)} is the most recent change preceding task failure time.`,
      };
    }

    return {
      culpritCommit: null,
      confidenceScore: 0.0,
      matchedFiles: [],
      rationale: "No matching commit correlated.",
    };
  }
}
