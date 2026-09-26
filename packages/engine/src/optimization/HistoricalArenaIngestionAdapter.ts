import fs from "node:fs/promises";
import path from "node:path";
import {
  HistoricalArenaStats,
  HistoricalTaskRecord,
  HistoricalPostmortemRecord,
  MitigationParadoxReport,
  ArenaDatasetManifest,
  CURRENT_ARENA_DATASET_VERSION,
  LEGACY_ARENA_DATASET_VERSION,
} from "@cacophony/shared-types";

/**
 * HistoricalArenaIngestionAdapter
 *
 * Ingests external historical run data and empirical benchmarks from any versioned arena dataset directory
 * without depending on legacy shell scripts or runners.
 */
export class HistoricalArenaIngestionAdapter {
  private readonly defaultBasePath: string;

  constructor(basePath?: string) {
    this.defaultBasePath =
      basePath ||
      process.env["ARENA_DATASET_DIR"] ||
      path.resolve(process.cwd(), "data/arena");
  }

  /**
   * Discovers and returns the version of the dataset directory.
   * Reads manifest.json if present; falls back to stats.json inspection or legacy v1.0.0.
   */
  public async getDatasetVersion(basePath = this.defaultBasePath): Promise<string> {
    try {
      const manifestPath = path.join(basePath, "manifest.json");
      const raw = await fs.readFile(manifestPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ArenaDatasetManifest>;
      if (parsed.version) {
        return parsed.version;
      }
    } catch {
      // Manifest not present, inspect stats.json
    }

    try {
      const statsPath = path.join(basePath, "stats.json");
      const raw = await fs.readFile(statsPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.format_version) {
        return String(parsed.format_version);
      }
      return LEGACY_ARENA_DATASET_VERSION;
    } catch {
      return CURRENT_ARENA_DATASET_VERSION;
    }
  }

  /**
   * Reads and parses stats.json summary telemetry.
   */
  public async loadStats(basePath = this.defaultBasePath): Promise<HistoricalArenaStats> {
    const statsPath = path.join(basePath, "stats.json");
    const raw = await fs.readFile(statsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const version = await this.getDatasetVersion(basePath);

    return {
      totalCompleted: parsed.total_completed,
      totalFailed: parsed.total_failed,
      totalProcessed: parsed.total_processed,
      failureReasons: parsed.failure_reasons || {},
      lastUpdated: parsed.last_updated,
      formatVersion: version,
    };
  }

  /**
   * Loads task records from completed, failed, or exhausted subdirectories.
   */
  public async loadTasks(
    category: "completed" | "failed" | "exhausted",
    limit = 50,
    basePath = this.defaultBasePath
  ): Promise<HistoricalTaskRecord[]> {
    const dir = path.join(basePath, category);
    try {
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter((f) => f.endsWith(".json")).slice(0, limit);

      const records: HistoricalTaskRecord[] = [];
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(dir, file), "utf-8");
          const d = JSON.parse(content);

          let patchContent: string | undefined;
          const patchFile = file.replace(/\.json$/, ".patch");
          try {
            patchContent = await fs.readFile(path.join(basePath, "patches", patchFile), "utf-8");
          } catch {
            // Optional patch
          }

          records.push({
            id: d.id || file.replace(/\.json$/, ""),
            ...(d.task_type ? { taskType: d.task_type } : {}),
            model: d.model || "unknown",
            status: category,
            ...(d.target_branch ? { targetBranch: d.target_branch } : {}),
            ...(d.source_task_id ? { sourceTaskId: d.source_task_id } : {}),
            ...(d.prompt ? { prompt: d.prompt } : {}),
            ...(d.test_command ? { testCommand: d.test_command } : {}),
            ...(d.focus_files ? { focusFiles: d.focus_files } : {}),
            ...(d.finished_at ? { finishedAt: d.finished_at } : {}),
            ...(d.failure_reason ? { failureReason: d.failure_reason } : {}),
            ...(patchContent !== undefined ? { patchContent } : {}),
          });
        } catch {
          // Skip corrupt records
        }
      }
      return records;
    } catch {
      return [];
    }
  }

  /**
   * Loads postmortem failure records.
   */
  public async loadPostmortems(
    limit = 50,
    basePath = this.defaultBasePath
  ): Promise<HistoricalPostmortemRecord[]> {
    const dir = path.join(basePath, "postmortems");
    try {
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter((f) => f.endsWith(".json")).slice(0, limit);

      const records: HistoricalPostmortemRecord[] = [];
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(dir, file), "utf-8");
          const d = JSON.parse(content);
          records.push({
            taskId: d.task_id || file.replace(/\.json$/, ""),
            generatedAt: d.generated_at,
            failureStatus: d.failure_status,
            ...(d.failure_class ? { failureClass: d.failure_class } : {}),
            model: d.model || "unknown",
            ...(d.ctx_tier ? { ctxTier: d.ctx_tier } : {}),
            ...(d.error_snippets ? { errorSnippets: d.error_snippets } : {}),
          });
        } catch {
          // Skip corrupt records
        }
      }
      return records;
    } catch {
      return [];
    }
  }

  /**
   * MitigationParadoxAnalyzer
   *
   * Formulates the historical analysis comparing deterministic validation rejections
   * (review_failed, validation_failed, disallowed_root_files) vs actual test assertion failures.
   */
  public analyzeMitigationParadox(stats: HistoricalArenaStats): MitigationParadoxReport {
    const totalProcessed = stats.totalProcessed;
    const totalCompleted = stats.totalCompleted;
    const totalFailed = stats.totalFailed;

    const rawPassRatePct = totalProcessed > 0 ? (totalCompleted / totalProcessed) * 100 : 0;

    const realTestFailureCount = stats.failureReasons["test_failed"] || 0;
    const realTestFailurePct = totalProcessed > 0 ? (realTestFailureCount / totalProcessed) * 100 : 0;

    const reviewFailedCount = stats.failureReasons["review_failed"] || 0;
    const validationFailedCount = stats.failureReasons["validation_failed"] || 0;
    const disallowedRootFilesCount = stats.failureReasons["disallowed_root_files"] || 0;
    const noChangesCount = stats.failureReasons["no_changes_produced"] || 0;

    // Verifier rejections are failures triggered by rules rather than test assertions
    const verifierRejectionCount = reviewFailedCount + validationFailedCount + disallowedRootFilesCount;
    const verifierRejectionPct = totalProcessed > 0 ? (verifierRejectionCount / totalProcessed) * 100 : 0;

    // Under silent_repair or soft_warning, a significant portion of review_failed and validation_failed tasks are recoverable
    const estimatedRecoverableTasks = Math.round(reviewFailedCount * 0.75 + validationFailedCount * 0.85 + disallowedRootFilesCount * 0.90);
    const counterfactualPassRatePct = totalProcessed > 0 ? ((totalCompleted + estimatedRecoverableTasks) / totalProcessed) * 100 : 0;

    return {
      totalProcessed,
      totalCompleted,
      totalFailed,
      rawPassRatePct: Math.round(rawPassRatePct * 100) / 100,
      realTestFailureCount,
      realTestFailurePct: Math.round(realTestFailurePct * 100) / 100,
      verifierRejectionCount,
      verifierRejectionPct: Math.round(verifierRejectionPct * 100) / 100,
      reviewFailedCount,
      noChangesCount,
      counterfactualPassRatePct: Math.round(counterfactualPassRatePct * 100) / 100,
      estimatedRecoverableTasks,
    };
  }
}
