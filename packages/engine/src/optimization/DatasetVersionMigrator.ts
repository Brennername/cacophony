import fs from "node:fs/promises";
import path from "node:path";
import {
  ArenaDatasetManifest,
  CURRENT_ARENA_DATASET_VERSION,
  LEGACY_ARENA_DATASET_VERSION,
  HistoricalTaskRecord,
} from "@cacophony/shared-types";

export interface DatasetMigrationOptions {
  readonly inplace?: boolean;
  readonly targetDir?: string | undefined;
  readonly description?: string | undefined;
}

export interface DatasetMigrationResult {
  readonly manifest: ArenaDatasetManifest;
  readonly previousVersion: string;
  readonly targetDirectory: string;
  readonly tasksMigrated: number;
}

/**
 * DatasetVersionMigrator
 *
 * Upgrades legacy v1.0.0 arena datasets to v2.0.0 by standardizing
 * task record schemas, generating ArenaDatasetManifest, and updating stats.json.
 */
export class DatasetVersionMigrator {
  /**
   * Migrates a dataset directory to CURRENT_ARENA_DATASET_VERSION (2.0.0).
   */
  public async migrate(
    datasetDir: string,
    options: DatasetMigrationOptions = {},
  ): Promise<DatasetMigrationResult> {
    const sourceDir = path.resolve(datasetDir);
    const targetDir = options.targetDir
      ? path.resolve(options.targetDir)
      : sourceDir;

    // Verify source exists
    await fs.access(sourceDir);

    // Determine current version before migration
    const previousVersion = await this.detectVersion(sourceDir);

    // If destination is different from source, ensure target directory exists
    if (targetDir !== sourceDir) {
      await fs.mkdir(targetDir, { recursive: true });
    }

    let totalTasksCount = 0;
    const categories: Array<"completed" | "failed" | "exhausted"> = [
      "completed",
      "failed",
      "exhausted",
    ];

    for (const category of categories) {
      const srcSubdir = path.join(sourceDir, category);
      const destSubdir = path.join(targetDir, category);

      try {
        const files = await fs.readdir(srcSubdir);
        if (files.length > 0) {
          await fs.mkdir(destSubdir, { recursive: true });
        }

        for (const file of files) {
          if (!file.endsWith(".json")) {
            continue;
          }

          const srcFilePath = path.join(srcSubdir, file);
          const raw = await fs.readFile(srcFilePath, "utf-8");
          const parsed = JSON.parse(raw);

          // Standardize task record
          const standardized = this.standardizeTaskRecord(parsed, category, file);
          const destFilePath = path.join(destSubdir, file);
          await fs.writeFile(
            destFilePath,
            JSON.stringify(standardized, null, 2),
            "utf-8",
          );
          totalTasksCount++;
        }
      } catch {
        // Category directory might not exist in small or mock datasets
      }
    }

    // Copy patches or postmortems if present
    for (const extra of ["patches", "postmortems"]) {
      const srcExtra = path.join(sourceDir, extra);
      const destExtra = path.join(targetDir, extra);
      try {
        const files = await fs.readdir(srcExtra);
        if (files.length > 0) {
          await fs.mkdir(destExtra, { recursive: true });
          for (const file of files) {
            const content = await fs.readFile(path.join(srcExtra, file));
            await fs.writeFile(path.join(destExtra, file), content);
          }
        }
      } catch {
        // Optional folder
      }
    }

    // Update stats.json if present
    const srcStatsPath = path.join(sourceDir, "stats.json");
    const destStatsPath = path.join(targetDir, "stats.json");
    try {
      const statsRaw = await fs.readFile(srcStatsPath, "utf-8");
      const statsObj = JSON.parse(statsRaw);
      statsObj.format_version = CURRENT_ARENA_DATASET_VERSION;
      statsObj.last_updated = new Date().toISOString();
      await fs.writeFile(
        destStatsPath,
        JSON.stringify(statsObj, null, 2),
        "utf-8",
      );
    } catch {
      // Create minimal stats.json if absent
      const minimalStats = {
        total_completed: 0,
        total_failed: 0,
        total_processed: totalTasksCount,
        failure_reasons: {},
        last_updated: new Date().toISOString(),
        format_version: CURRENT_ARENA_DATASET_VERSION,
      };
      await fs.writeFile(
        destStatsPath,
        JSON.stringify(minimalStats, null, 2),
        "utf-8",
      );
    }

    // Generate manifest.json conforming to ArenaDatasetManifest
    const manifest: ArenaDatasetManifest = {
      version: CURRENT_ARENA_DATASET_VERSION,
      schemaRevision: 2,
      totalTasks: totalTasksCount,
      createdAt: new Date().toISOString(),
      ...(options.description ? { description: options.description } : {}),
    };

    const manifestPath = path.join(targetDir, "manifest.json");
    await fs.writeFile(
      manifestPath,
      JSON.stringify(manifest, null, 2),
      "utf-8",
    );

    return {
      manifest,
      previousVersion,
      targetDirectory: targetDir,
      tasksMigrated: totalTasksCount,
    };
  }

  private async detectVersion(dir: string): Promise<string> {
    try {
      const manifestPath = path.join(dir, "manifest.json");
      const raw = await fs.readFile(manifestPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.version) {
        return parsed.version;
      }
    } catch {}

    try {
      const statsPath = path.join(dir, "stats.json");
      const raw = await fs.readFile(statsPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.format_version) {
        return String(parsed.format_version);
      }
    } catch {}

    return LEGACY_ARENA_DATASET_VERSION;
  }

  private standardizeTaskRecord(
    record: Record<string, any>,
    status: "completed" | "failed" | "exhausted",
    filename: string,
  ): HistoricalTaskRecord {
    const id = record["id"] || record["task_id"] || filename.replace(/\.json$/, "");
    return {
      id,
      taskType: record["taskType"] || record["task_type"] || "standard",
      model: record["model"] || "unknown",
      status,
      targetBranch: record["targetBranch"] || record["target_branch"],
      sourceTaskId: record["sourceTaskId"] || record["source_task_id"],
      prompt: record["prompt"],
      testCommand: record["testCommand"] || record["test_command"],
      focusFiles: record["focusFiles"] || record["focus_files"],
      finishedAt: record["finishedAt"] || record["finished_at"] || new Date().toISOString(),
      failureReason: record["failureReason"] || record["failure_reason"],
      patchContent: record["patchContent"] || record["patch_content"],
    };
  }
}
