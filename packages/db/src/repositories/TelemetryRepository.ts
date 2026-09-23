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
