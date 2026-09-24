import type { TelemetryPoller } from "./TelemetryPoller.js";
import type { TaskRepository, ModelHealthRepository } from "@cacophony/db";

/**
 * Service to export runtime engine, APU hardware metrics, and task statistics
 * formatted according to Prometheus / OpenMetrics text specifications.
 */
export class PrometheusMetricsExporter {
  private readonly telemetryPoller: TelemetryPoller | undefined;
  private readonly taskRepo: TaskRepository | undefined;
  private readonly modelHealthRepo: ModelHealthRepository | undefined;

  constructor(options?: {
    telemetryPoller?: TelemetryPoller | undefined;
    taskRepo?: TaskRepository | undefined;
    modelHealthRepo?: ModelHealthRepository | undefined;
  }) {
    this.telemetryPoller = options?.telemetryPoller;
    this.taskRepo = options?.taskRepo;
    this.modelHealthRepo = options?.modelHealthRepo;
  }

  /**
   * Generates OpenMetrics formatted Prometheus text document.
   */
  public async getMetricsText(): Promise<string> {
    const lines: string[] = [];

    // Hardware Telemetry Gauges
    lines.push("# HELP cacophony_gpu_busy_percent Current GPU utilization percentage");
    lines.push("# TYPE cacophony_gpu_busy_percent gauge");

    lines.push("# HELP cacophony_vram_used_bytes Total VRAM memory consumed in bytes");
    lines.push("# TYPE cacophony_vram_used_bytes gauge");

    lines.push("# HELP cacophony_vram_total_bytes Total available physical VRAM in bytes");
    lines.push("# TYPE cacophony_vram_total_bytes gauge");

    lines.push("# HELP cacophony_apu_temp_celsius APU edge thermal reading in degrees Celsius");
    lines.push("# TYPE cacophony_apu_temp_celsius gauge");

    lines.push("# HELP cacophony_power_watts Package PPT power draw in Watts");
    lines.push("# TYPE cacophony_power_watts gauge");

    lines.push("# HELP cacophony_core_clock_mhz Core engine clock speed in MHz");
    lines.push("# TYPE cacophony_core_clock_mhz gauge");

    lines.push("# HELP cacophony_vram_clock_mhz Memory clock speed in MHz");
    lines.push("# TYPE cacophony_vram_clock_mhz gauge");

    const snapshot = this.telemetryPoller?.getLatest();
    if (snapshot) {
      lines.push(`cacophony_gpu_busy_percent ${snapshot.gpu.gpuBusyPercent}`);
      lines.push(`cacophony_vram_used_bytes ${snapshot.gpu.vramUsedBytes}`);
      lines.push(`cacophony_vram_total_bytes ${snapshot.gpu.vramTotalBytes}`);
      lines.push(`cacophony_apu_temp_celsius ${snapshot.gpu.edgeTempCelsius}`);
      lines.push(`cacophony_power_watts ${snapshot.gpu.pptWatts}`);
      lines.push(`cacophony_core_clock_mhz ${snapshot.gpu.sclkMhz}`);
      lines.push(`cacophony_vram_clock_mhz ${snapshot.gpu.mclkMhz ?? 0}`);
    } else {
      lines.push("cacophony_gpu_busy_percent 0");
      lines.push("cacophony_vram_used_bytes 0");
      lines.push("cacophony_vram_total_bytes 17179869184");
      lines.push("cacophony_apu_temp_celsius 0");
      lines.push("cacophony_power_watts 0");
      lines.push("cacophony_core_clock_mhz 0");
      lines.push("cacophony_vram_clock_mhz 0");
    }

    // Task & Model Health Counters
    lines.push("# HELP cacophony_tasks_total Total tasks by execution status and model");
    lines.push("# TYPE cacophony_tasks_total counter");

    if (this.taskRepo) {
      try {
        const pending = await this.taskRepo.listPending();
        lines.push(`cacophony_tasks_total{status="PENDING",role="all"} ${pending.length}`);
      } catch {
        lines.push('cacophony_tasks_total{status="PENDING",role="all"} 0');
      }
    } else {
      lines.push('cacophony_tasks_total{status="PENDING",role="all"} 0');
    }

    if (this.modelHealthRepo) {
      try {
        const profiles = await this.modelHealthRepo.listProfiles();
        for (const p of profiles) {
          lines.push(`cacophony_tasks_total{status="COMPLETED",model="${p.modelId}"} ${p.totalSuccess}`);
          lines.push(`cacophony_tasks_total{status="FAILED",model="${p.modelId}"} ${p.totalFailures}`);
        }
      } catch {
        // ignore
      }
    }

    lines.push("");
    return lines.join("\n");
  }
}
