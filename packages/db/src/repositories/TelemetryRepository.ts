import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { HardwareTelemetrySnapshot, ThermalZone } from "@cacophony/shared-types";

interface TelemetryRow {
  readonly timestamp: string;
  readonly gpu_busy_pct: number;
  readonly vram_used_bytes: number | string;
  readonly vram_total_bytes: number | string;
  readonly gtt_used_bytes: number | string;
  readonly gtt_total_bytes: number | string;
  readonly edge_temp_c: number;
  readonly vddgfx_mv: number;
  readonly soc_mv: number;
  readonly ppt_watts: number;
  readonly sclk_mhz: number;
  readonly current_model: string | null;
}

/**
 * TelemetryRepository
 *
 * Persists periodic hardware sensor readings harvested from AMD Vega APU
 * DRM and hwmon sysfs nodes, enabling historical sparklines and KDE-style meters.
 */
export class TelemetryRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Persists a telemetry snapshot to the database.
   */
  public async insertSnapshot(snapshot: HardwareTelemetrySnapshot): Promise<void> {
    await this.driver.execute(
      `INSERT INTO telemetry_snapshots (
        timestamp, gpu_busy_pct, vram_used_bytes, vram_total_bytes,
        gtt_used_bytes, gtt_total_bytes, edge_temp_c, vddgfx_mv,
        soc_mv, ppt_watts, sclk_mhz, current_model
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        snapshot.timestamp,
        snapshot.gpu.gpuBusyPercent,
        snapshot.gpu.vramUsedBytes,
        snapshot.gpu.vramTotalBytes,
        snapshot.gpu.gttUsedBytes,
        snapshot.gpu.gttTotalBytes,
        snapshot.gpu.edgeTempCelsius,
        snapshot.gpu.vddgfxMilliVolts,
        snapshot.gpu.socMilliVolts,
        snapshot.gpu.pptWatts,
        snapshot.gpu.sclkMhz,
        snapshot.activeModel?.name ?? null
      ]
    );
  }

  /**
   * Retrieves the most recent telemetry snapshot.
   */
  public async getLatestSnapshot(): Promise<HardwareTelemetrySnapshot | null> {
    const row = await this.driver.queryOne<TelemetryRow>(
      "SELECT * FROM telemetry_snapshots ORDER BY timestamp DESC LIMIT 1"
    );
    return row ? this.mapRow(row) : null;
  }

  /**
   * Retrieves the last N telemetry snapshots for charting and graphs.
   */
  public async getRecentSnapshots(limit = 60): Promise<readonly HardwareTelemetrySnapshot[]> {
    const rows = await this.driver.query<TelemetryRow>(
      "SELECT * FROM telemetry_snapshots ORDER BY timestamp DESC LIMIT $1",
      [limit]
    );
    return [...rows].reverse().map((r: TelemetryRow) => this.mapRow(r));
  }

  /**
   * Prunes telemetry snapshots older than a specified ISO date or timestamp.
   */
  public async pruneOlderThan(cutoffIso: string): Promise<number> {
    const res = await this.driver.execute(
      "DELETE FROM telemetry_snapshots WHERE timestamp < $1",
      [cutoffIso]
    );
    return res.rowsAffected;
  }

  /**
   * Retrieves aggregated telemetry buckets (min, avg, max) over a time window.
   */
  public async getAggregatedHistory(sinceIso: string): Promise<{
    readonly count: number;
    readonly avgGpuBusy: number;
    readonly peakGpuBusy: number;
    readonly avgTempC: number;
    readonly peakTempC: number;
    readonly avgPowerWatts: number;
    readonly peakPowerWatts: number;
  }> {
    const row = await this.driver.queryOne<{
      readonly total_count: number | string;
      readonly avg_busy: number | string;
      readonly max_busy: number | string;
      readonly avg_temp: number | string;
      readonly max_temp: number | string;
      readonly avg_power: number | string;
      readonly max_power: number | string;
    }>(
      `SELECT
        COUNT(*) as total_count,
        COALESCE(AVG(gpu_busy_pct), 0) as avg_busy,
        COALESCE(MAX(gpu_busy_pct), 0) as max_busy,
        COALESCE(AVG(edge_temp_c), 0) as avg_temp,
        COALESCE(MAX(edge_temp_c), 0) as max_temp,
        COALESCE(AVG(ppt_watts), 0) as avg_power,
        COALESCE(MAX(ppt_watts), 0) as max_power
      FROM telemetry_snapshots WHERE timestamp >= $1`,
      [sinceIso]
    );

    if (!row) {
      return {
        count: 0,
        avgGpuBusy: 0,
        peakGpuBusy: 0,
        avgTempC: 0,
        peakTempC: 0,
        avgPowerWatts: 0,
        peakPowerWatts: 0
      };
    }

    return {
      count: Number(row.total_count),
      avgGpuBusy: Number(Number(row.avg_busy).toFixed(1)),
      peakGpuBusy: Number(row.max_busy),
      avgTempC: Number(Number(row.avg_temp).toFixed(1)),
      peakTempC: Number(row.max_temp),
      avgPowerWatts: Number(Number(row.avg_power).toFixed(1)),
      peakPowerWatts: Number(row.max_power)
    };
  }

  private mapRow(row: TelemetryRow): HardwareTelemetrySnapshot {
    const vramUsed = Number(row.vram_used_bytes);
    const vramTotal = Number(row.vram_total_bytes);
    const vramPct = vramTotal > 0 ? Number(((vramUsed / vramTotal) * 100).toFixed(1)) : 0;
    const temp = Number(row.edge_temp_c);

    let thermalZone: ThermalZone = "Nominal";
    let pacingDelaySeconds = 0;
    if (temp >= 90) {
      thermalZone = "Danger";
      pacingDelaySeconds = 10;
    } else if (temp >= 80) {
      thermalZone = "Elevated";
      pacingDelaySeconds = 15;
    } else if (temp >= 70) {
      thermalZone = "Warm";
      pacingDelaySeconds = 5;
    }

    return {
      timestamp: String(row.timestamp),
      gpu: {
        gpuBusyPercent: Number(row.gpu_busy_pct),
        vramUsedBytes: vramUsed,
        vramTotalBytes: vramTotal,
        vramPercent: vramPct,
        gttUsedBytes: Number(row.gtt_used_bytes),
        gttTotalBytes: Number(row.gtt_total_bytes),
        edgeTempCelsius: temp,
        vddgfxMilliVolts: Number(row.vddgfx_mv),
        socMilliVolts: Number(row.soc_mv),
        pptWatts: Number(row.ppt_watts),
        sclkMhz: Number(row.sclk_mhz)
      },
      thermalZone,
      pacingDelaySeconds,
      activeModel: row.current_model ? {
        name: row.current_model,
        model: row.current_model,
        sizeBytes: 0,
        vramSizeBytes: 0
      } : null
    };
  }
}
