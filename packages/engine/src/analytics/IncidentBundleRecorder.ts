import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { RegressionBurstAlert, TaskOutcome } from "./FailureClusterDetector.js";

const execAsync = promisify(exec);

export interface GitCommitRecord {
  readonly hash: string;
  readonly author: string;
  readonly date: string;
  readonly message: string;
}

export interface IncidentBundle {
  readonly bundleId: string;
  readonly timestamp: string;
  readonly alert: RegressionBurstAlert;
  readonly gitCommits: readonly GitCommitRecord[];
  readonly failingTasks: readonly TaskOutcome[];
  readonly systemInfo: {
    readonly nodeVersion: string;
    readonly platform: string;
    readonly arch: string;
    readonly memoryUsage: NodeJS.MemoryUsage;
    readonly pid: number;
  };
}

export interface IncidentBundleRecorderOptions {
  readonly storageDir?: string | undefined;
  readonly workspaceRoot?: string | undefined;
}

export class IncidentBundleRecorder {
  private readonly storageDir: string;
  private readonly workspaceRoot: string;

  constructor(options: IncidentBundleRecorderOptions = {}) {
    this.workspaceRoot = options.workspaceRoot ?? process.cwd();
    this.storageDir = options.storageDir ?? path.join(this.workspaceRoot, "data", "diagnostics");
  }

  /**
   * Captures and persists an incident snapshot bundle to disk.
   */
  public async captureBundle(
    alert: RegressionBurstAlert,
    customOutcomes?: readonly TaskOutcome[]
  ): Promise<{ bundlePath: string; bundle: IncidentBundle }> {
    await fs.mkdir(this.storageDir, { recursive: true });

    const gitCommits = await this.retrieveRecentGitCommits(10);
    const bundleId = `incident-${Date.now()}`;
    const filename = `${bundleId}.json`;
    const bundlePath = path.join(this.storageDir, filename);

    const bundle: IncidentBundle = {
      bundleId,
      timestamp: new Date().toISOString(),
      alert,
      gitCommits,
      failingTasks: customOutcomes ?? alert.failingTasks,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        pid: process.pid,
      },
    };

    const tempPath = `${bundlePath}.tmp-${Date.now()}`;
    await fs.writeFile(tempPath, JSON.stringify(bundle, null, 2), "utf-8");
    await fs.rename(tempPath, bundlePath);

    return { bundlePath, bundle };
  }

  /**
   * Retrieves the latest N git commits from the workspace repository.
   */
  public async retrieveRecentGitCommits(count = 10): Promise<readonly GitCommitRecord[]> {
    try {
      const { stdout } = await execAsync(
        `git log -n ${count} --pretty=format:"%H|%an|%ad|%s"`,
        { cwd: this.workspaceRoot, timeout: 5000 }
      );

      if (!stdout || stdout.trim().length === 0) {
        return [];
      }

      return stdout
        .trim()
        .split("\n")
        .map((line) => {
          const [hash = "", author = "", date = "", ...msgParts] = line.split("|");
          return {
            hash: hash.trim(),
            author: author.trim(),
            date: date.trim(),
            message: msgParts.join("|").trim(),
          };
        })
        .filter((c) => c.hash.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Lists and parses existing incident bundles in the storage directory.
   */
  public async listBundles(): Promise<readonly IncidentBundle[]> {
    try {
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter((f) => f.startsWith("incident-") && f.endsWith(".json"));
      const bundles: IncidentBundle[] = [];

      for (const file of jsonFiles) {
        try {
          const raw = await fs.readFile(path.join(this.storageDir, file), "utf-8");
          bundles.push(JSON.parse(raw) as IncidentBundle);
        } catch {
          // ignore corrupted files
        }
      }

      return bundles.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  }
}
