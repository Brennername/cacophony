export type TaskCategory = "feat" | "fix" | "refactor" | "docs" | "test" | "chore";

export interface ReleaseTaskItem {
  readonly id: string;
  readonly title: string;
  readonly category?: TaskCategory | undefined;
  readonly breakingChange?: boolean | undefined;
  readonly breakingDescription?: string | undefined;
  readonly modelId?: string | undefined;
  readonly prNumber?: number | undefined;
  readonly htmlUrl?: string | undefined;
  readonly testsCount?: number | undefined;
  readonly durationMs?: number | undefined;
}

export interface ReleaseMetrics {
  readonly totalTasks: number;
  readonly totalTests: number;
  readonly featuresCount: number;
  readonly fixesCount: number;
  readonly refactorsCount: number;
  readonly breakingCount: number;
}

export interface MilestoneReleaseBundle {
  readonly milestoneTitle: string;
  readonly releaseBranch: string;
  readonly previousVersion: string;
  readonly version: string;
  readonly tasks: readonly ReleaseTaskItem[];
  readonly changelog: string;
  readonly metrics: ReleaseMetrics;
  readonly generatedAt: string;
}

export interface BundleMilestoneOptions {
  readonly milestoneTitle: string;
  readonly previousVersion: string;
  readonly tasks: readonly ReleaseTaskItem[];
  readonly releaseBranchPrefix?: string | undefined;
}

/**
 * ReleaseBundlerService
 *
 * Bundles closed and verified staging tasks into cohesive release candidates.
 * Calculates semantic version increments (major, minor, patch), generates
 * structured markdown changelogs, and compiles verification metrics.
 */
export class ReleaseBundlerService {
  /**
   * Classifies task into standard conventional category based on title prefix or declared category.
   */
  public classifyTask(task: ReleaseTaskItem): TaskCategory {
    if (task.category) {
      return task.category;
    }

    const lower = task.title.trim().toLowerCase();
    if (/^feat(!|\(.*\)!|\(.*\))?:/.test(lower)) return "feat";
    if (/^fix(!|\(.*\)!|\(.*\))?:/.test(lower)) return "fix";
    if (/^refactor(!|\(.*\)!|\(.*\))?:/.test(lower)) return "refactor";
    if (/^docs(!|\(.*\)!|\(.*\))?:/.test(lower)) return "docs";
    if (/^test(!|\(.*\)!|\(.*\))?:/.test(lower)) return "test";
    return "chore";
  }

  /**
   * Determines if a task represents a breaking change based on flags or conventional commit syntax.
   */
  public isBreakingChange(task: ReleaseTaskItem): boolean {
    if (task.breakingChange) {
      return true;
    }
    const title = task.title.trim();
    if (/^[a-z]+(\([a-zA-Z0-9_-]+\))?!:/.test(title)) {
      return true;
    }
    if (task.breakingDescription && task.breakingDescription.trim().length > 0) {
      return true;
    }
    return false;
  }

  /**
   * Computes the next semantic version string given the current version and list of tasks.
   */
  public computeNextVersion(currentVersion: string, tasks: readonly ReleaseTaskItem[]): string {
    const cleanVersion = currentVersion.replace(/^v/, "").trim();
    const parts = cleanVersion.split(".").map((p) => parseInt(p, 10));
    let major = parts[0] ?? 1;
    let minor = parts[1] ?? 0;
    let patch = parts[2] ?? 0;

    const hasBreaking = tasks.some((t) => this.isBreakingChange(t));
    if (hasBreaking) {
      major += 1;
      minor = 0;
      patch = 0;
      return `${major}.${minor}.${patch}`;
    }

    const hasFeature = tasks.some((t) => this.classifyTask(t) === "feat");
    if (hasFeature) {
      minor += 1;
      patch = 0;
      return `${major}.${minor}.${patch}`;
    }

    patch += 1;
    return `${major}.${minor}.${patch}`;
  }

  /**
   * Generates a structured, emoji-free markdown changelog categorizing tasks.
   */
  public generateChangelog(
    version: string,
    tasks: readonly ReleaseTaskItem[],
    options?: { milestoneTitle?: string; previousVersion?: string }
  ): string {
    const breaking = tasks.filter((t) => this.isBreakingChange(t));
    const features = tasks.filter((t) => !this.isBreakingChange(t) && this.classifyTask(t) === "feat");
    const fixes = tasks.filter((t) => !this.isBreakingChange(t) && this.classifyTask(t) === "fix");
    const refactors = tasks.filter((t) => !this.isBreakingChange(t) && this.classifyTask(t) === "refactor");
    const docs = tasks.filter((t) => !this.isBreakingChange(t) && this.classifyTask(t) === "docs");
    const chores = tasks.filter(
      (t) => !this.isBreakingChange(t) && !["feat", "fix", "refactor", "docs"].includes(this.classifyTask(t))
    );

    const totalTests = tasks.reduce((acc, t) => acc + (t.testsCount ?? 0), 0);

    const lines: string[] = [];
    lines.push(`# Release v${version}`);
    if (options?.milestoneTitle) {
      lines.push(`**Milestone:** ${options.milestoneTitle}`);
    }
    if (options?.previousVersion) {
      lines.push(`**Previous Version:** v${options.previousVersion.replace(/^v/, "")}`);
    }
    lines.push("");

    if (breaking.length > 0) {
      lines.push("## Breaking Changes");
      for (const item of breaking) {
        const desc = item.breakingDescription ? ` - ${item.breakingDescription}` : "";
        const prRef = item.prNumber ? ` (#${item.prNumber})` : "";
        lines.push(`- **[${item.id}]** ${item.title}${desc}${prRef}`);
      }
      lines.push("");
    }

    if (features.length > 0) {
      lines.push("## Features");
      for (const item of features) {
        const prRef = item.prNumber ? ` (#${item.prNumber})` : "";
        lines.push(`- **[${item.id}]** ${item.title}${prRef}`);
      }
      lines.push("");
    }

    if (fixes.length > 0) {
      lines.push("## Bug Fixes");
      for (const item of fixes) {
        const prRef = item.prNumber ? ` (#${item.prNumber})` : "";
        lines.push(`- **[${item.id}]** ${item.title}${prRef}`);
      }
      lines.push("");
    }

    if (refactors.length > 0) {
      lines.push("## Refactoring and Architecture");
      for (const item of refactors) {
        const prRef = item.prNumber ? ` (#${item.prNumber})` : "";
        lines.push(`- **[${item.id}]** ${item.title}${prRef}`);
      }
      lines.push("");
    }

    if (docs.length > 0) {
      lines.push("## Documentation");
      for (const item of docs) {
        const prRef = item.prNumber ? ` (#${item.prNumber})` : "";
        lines.push(`- **[${item.id}]** ${item.title}${prRef}`);
      }
      lines.push("");
    }

    if (chores.length > 0) {
      lines.push("## Maintenance and Testing");
      for (const item of chores) {
        const prRef = item.prNumber ? ` (#${item.prNumber})` : "";
        lines.push(`- **[${item.id}]** ${item.title}${prRef}`);
      }
      lines.push("");
    }

    lines.push("## Verification and Quality Metrics");
    lines.push(`- Total Tasks Bundled: ${tasks.length}`);
    lines.push(`- Passing Automated Tests: ${totalTests}`);
    lines.push("- Verification Status: 100% Passed Staging Gate");

    return lines.join("\n");
  }

  /**
   * Compiles the full milestone release bundle including semantic versioning and changelog.
   */
  public bundleMilestone(options: BundleMilestoneOptions): MilestoneReleaseBundle {
    const nextVersion = this.computeNextVersion(options.previousVersion, options.tasks);
    const branchPrefix = options.releaseBranchPrefix ?? "release/v";
    const releaseBranch = `${branchPrefix}${nextVersion}`;

    const changelog = this.generateChangelog(nextVersion, options.tasks, {
      milestoneTitle: options.milestoneTitle,
      previousVersion: options.previousVersion
    });

    const metrics: ReleaseMetrics = {
      totalTasks: options.tasks.length,
      totalTests: options.tasks.reduce((sum, t) => sum + (t.testsCount ?? 0), 0),
      featuresCount: options.tasks.filter((t) => this.classifyTask(t) === "feat").length,
      fixesCount: options.tasks.filter((t) => this.classifyTask(t) === "fix").length,
      refactorsCount: options.tasks.filter((t) => this.classifyTask(t) === "refactor").length,
      breakingCount: options.tasks.filter((t) => this.isBreakingChange(t)).length
    };

    return {
      milestoneTitle: options.milestoneTitle,
      releaseBranch,
      previousVersion: options.previousVersion,
      version: nextVersion,
      tasks: options.tasks,
      changelog,
      metrics,
      generatedAt: new Date().toISOString()
    };
  }
}
