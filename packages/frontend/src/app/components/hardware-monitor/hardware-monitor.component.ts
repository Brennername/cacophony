import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ArenaStateStore } from '../../services/arena-state.store';
import { HistoryMetricsService } from '../../services/history-metrics.service';

/**
 * Modern System Diagnostics and Telemetry Monitor.
 * Features:
 * 1. Progress-bar APU Temperature monitor (105C = 100%, fencepost color gradients, normal degree display,
 *    and emergency queue cutoff threshold).
 * 2. Moving Area-of-Curve (AOC) sparkline line graphs under each primary telemetry card.
 * 3. High-water mark token velocity tracker with 2-sigma outlier filtering.
 * 4. Deduplicated metrics: GPU Load, CPU Load, System RAM, VRAM, and GTT Memory.
 * 5. Fixed bounding boxes with tabular numbers to prevent digit change flickering.
 * 6. Interactive click navigation to model statistics view.
 */
@Component({
  selector: 'app-hardware-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cacophony-card monitor-card">
      <!-- Header: Hardware Identification & Active Model High-Water Mark HUD -->
      <div class="card-header">
        <div class="header-title-group">
          <div class="device-selector-row">
            <h2>Hardware Sensors & APU Telemetry</h2>
            <div class="device-tags-list">
              <span class="device-tag primary">AMD Cezanne Vega (Local APU)</span>
              @for (acc of accelerators(); track acc.id) {
                @if (!acc.isPrimaryApu) {
                  <span class="device-tag secondary">{{ acc.name }} ({{ acc.pciBus }})</span>
                }
              }
            </div>
          </div>
          <span class="subtext">Direct sysfs kernel telemetry & active accelerator pipeline</span>
        </div>

        <div class="header-badges">
          <!-- Active Model Badge with Link to Model Stats Page -->
          <div
            class="model-badge clickable"
            (click)="navigateToModelStats(metrics().activeModel)"
            title="Click to view full performance telemetry for this model"
          >
            <div class="model-badge-top">
              <span class="badge-label">Active Model</span>
              <span class="badge-link-hint">↗</span>
            </div>
            <span class="badge-val fixed-model-name">{{ metrics().activeModel }}</span>
          </div>

          <!-- Token Velocity High-Water Mark Meter -->
          <div
            class="hwm-badge clickable"
            (click)="navigateToModelStats(metrics().activeModel)"
            title="Current token velocity vs recorded high-water mark peak"
          >
            <div class="hwm-header">
              <span class="hwm-label">Velocity / HWM</span>
              <span class="hwm-peak font-mono">PEAK: {{ highWaterMark().toFixed(1) }} tok/s</span>
            </div>
            <div class="hwm-bar-track">
              <div class="hwm-bar-fill" [style.width.%]="velocityPercentOfHwm()"></div>
              <div class="hwm-marker" [style.left.%]="100" title="High-Water Mark"></div>
            </div>
            <div class="hwm-numbers font-mono">
              <span class="fixed-val num-live">{{ currentLiveVelocity().toFixed(1) }}</span>
              <span class="slash">/</span>
              <span class="fixed-val num-run">{{ currentRunVelocity().toFixed(1) }}</span>
              <span class="unit">tok/s</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Primary Telemetry 6-Card Grid -->
      <div class="sensors-grid">
        <!-- 1. APU / Edge Temperature Card -->
        <div class="sensor-block" [ngClass]="tempZoneClass()">
          <div class="sensor-header">
            <span class="name">APU Temperature</span>
            <div class="val-group">
              <span class="val font-mono fixed-temp">{{ metrics().edgeTempCelsius.toFixed(1) }}°C</span>
              <span class="gap-5"></span> 
              <span class="zone-badge" [ngClass]="tempZoneClass()">{{ tempZoneLabel() }}</span>
            </div>
          </div>

          <!-- Multi-gradient temperature progress bar (105C = 100%) -->
          <div class="progress-bar temp-track">
            <div
              class="progress-fill temp-fill"
              [style.width.%]="tempPercentOfMax()"
              [style.background]="tempFillColor()"
            ></div>
          </div>

          <div class="sub-stat-row">
            <span>Range: 0 - 105°C</span>
            <span [class.text-danger]="metrics().edgeTempCelsius >= 100">
              Cutoff: 105°C {{ metrics().edgeTempCelsius >= 105 ? '(HALT TRIGGERED)' : '' }}
            </span>
          </div>

          <!-- Moving Temperature Sparkline with Cold-to-Hot Danger Gradient -->
          <div class="chart-container">
            <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tempDangerAoc" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25" />
                  <stop offset="60%" stop-color="#10b981" stop-opacity="0.30" />
                  <stop offset="75%" stop-color="#eab308" stop-opacity="0.40" />
                  <stop offset="85%" stop-color="#f97316" stop-opacity="0.55" />
                  <stop offset="93%" stop-color="#ef4444" stop-opacity="0.75" />
                  <stop offset="100%" stop-color="#ff0033" stop-opacity="0.95" />
                </linearGradient>
              </defs>
              <path class="aoc-fill" [attr.d]="getAreaPath(store.tempHistory(), 20, 105)" fill="url(#tempDangerAoc)" />
              <path class="aoc-line" [attr.d]="getLinePath(store.tempHistory(), 20, 105)" [attr.stroke]="tempFillColor()" />
            </svg>
          </div>
        </div>

        <!-- 2. VRAM Utilization Card -->
        <div class="sensor-block">
          <div class="sensor-header">
            <span class="name">VRAM Memory</span>
            <span class="val font-mono fixed-vram">{{ metrics().vramUsedMb }} / {{ metrics().vramTotalMb }} MB ({{ metrics().vramPercent.toFixed(1) }}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill brand" [style.width.%]="metrics().vramPercent"></div>
          </div>
          <div class="sub-stat-row">
            <span>Avail: {{ metrics().vramAvailMb }} MB</span>
            <span>Clock: {{ metrics().mclkMhz }} MHz</span>
          </div>
          <div class="chart-container">
            <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="vramAoc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.05" />
                </linearGradient>
              </defs>
              <path class="aoc-fill" [attr.d]="getAreaPath(store.vramHistory(), 0, 100)" fill="url(#vramAoc)" />
              <path class="aoc-line line-brand" [attr.d]="getLinePath(store.vramHistory(), 0, 100)" />
            </svg>
          </div>
        </div>

        <!-- 3. GPU / APU Load Card -->
        <div class="sensor-block">
          <div class="sensor-header">
            <span class="name">GPU Load</span>
            <span class="val font-mono fixed-load">{{ metrics().gpuBusyPercent }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill emerald" [style.width.%]="metrics().gpuBusyPercent"></div>
          </div>
          <div class="sub-stat-row">
            <span>Core: {{ metrics().sclkMhz }} MHz</span>
            <span>Power: {{ metrics().pptPowerW }} W</span>
          </div>
          <div class="chart-container">
            <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gpuAoc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#10b981" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#10b981" stop-opacity="0.05" />
                </linearGradient>
              </defs>
              <path class="aoc-fill" [attr.d]="getAreaPath(store.gpuLoadHistory(), 0, 100)" fill="url(#gpuAoc)" />
              <path class="aoc-line line-emerald" [attr.d]="getLinePath(store.gpuLoadHistory(), 0, 100)" />
            </svg>
          </div>
        </div>

        <!-- 4. CPU Load & Host System Card -->
        <div class="sensor-block">
          <div class="sensor-header">
            <span class="name">CPU Load</span>
            <span class="val font-mono fixed-cpu">{{ metrics().cpuBusyPercent.toFixed(1) }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill amber" [style.width.%]="metrics().cpuBusyPercent"></div>
          </div>
          <div class="sub-stat-row">
            <span>VDDGFX: {{ metrics().vddgfxMv }} mV</span>
            <span>Power: {{ metrics().pptPowerW }} W</span>
          </div>
          <div class="chart-container">
            <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cpuAoc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.05" />
                </linearGradient>
              </defs>
              <path class="aoc-fill" [attr.d]="getAreaPath(store.cpuLoadHistory(), 0, 100)" fill="url(#cpuAoc)" />
              <path class="aoc-line line-amber" [attr.d]="getLinePath(store.cpuLoadHistory(), 0, 100)" />
            </svg>
          </div>
        </div>

        <!-- 5. System RAM (Memory) Card -->
        <div class="sensor-block">
          <div class="sensor-header">
            <span class="name">System Memory (RAM)</span>
            <span class="val font-mono fixed-ram">{{ metrics().systemMemoryUsedMb }} / {{ metrics().systemMemoryTotalMb }} MB ({{ metrics().systemMemoryPercent.toFixed(1) }}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill cyan" [style.width.%]="metrics().systemMemoryPercent"></div>
          </div>
          <div class="sub-stat-row">
            <span>Free: {{ Math.max(0, metrics().systemMemoryTotalMb - metrics().systemMemoryUsedMb) }} MB</span>
            <span>Usage: {{ metrics().systemMemoryPercent.toFixed(1) }}%</span>
          </div>
          <div class="chart-container">
            <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sysMemAoc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.05" />
                </linearGradient>
              </defs>
              <path class="aoc-fill" [attr.d]="getAreaPath(store.sysMemHistory(), 0, 100)" fill="url(#sysMemAoc)" />
              <path class="aoc-line line-cyan" [attr.d]="getLinePath(store.sysMemHistory(), 0, 100)" />
            </svg>
          </div>
        </div>

        <!-- 6. GTT Shared Memory Card -->
        <div class="sensor-block">
          <div class="sensor-header">
            <span class="name">GTT Shared Memory</span>
            <span class="val font-mono fixed-gtt">{{ metrics().gttUsedMb }} / {{ metrics().gttTotalMb }} MB</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill purple" [style.width.%]="metrics().gttTotalMb ? (metrics().gttUsedMb / metrics().gttTotalMb) * 100 : 0"></div>
          </div>
          <div class="sub-stat-row">
            <span>SOC/VDDNB: {{ metrics().vddnbMv }} mV</span>
            <span>Alloc: {{ metrics().gttTotalMb ? ((metrics().gttUsedMb / metrics().gttTotalMb) * 100).toFixed(1) : 0 }}%</span>
          </div>
          <div class="chart-container">
            <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gttAoc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#a855f7" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#a855f7" stop-opacity="0.05" />
                </linearGradient>
              </defs>
              <path class="aoc-fill" [attr.d]="getAreaPath(store.gttHistory(), 0, 100)" fill="url(#gttAoc)" />
              <path class="aoc-line line-purple" [attr.d]="getLinePath(store.gttHistory(), 0, 100)" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    .monitor-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      min-width: 0;
      max-width: 100%;
    }

    .device-selector-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      min-width: 0;
    }

    .device-tag {
      font-size: 0.6875rem;
      font-family: var(--font-mono);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.1rem 0.4rem;
      color: var(--color-brand);
      font-weight: 600;
    }

    .header-title-group h2 {
      font-size: 1.125rem;
      margin: 0;
      color: var(--text-primary);
    }

    .subtext {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .header-badges {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      min-width: 0;
      max-width: 100%;
    }

    .model-badge {
      display: inline-flex;
      flex-direction: column;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.3rem 0.6rem;
      font-size: 0.75rem;
      transition: border-color 0.2s ease, background 0.2s ease;
      min-width: 0;
      max-width: 100%;
      flex: 1 1 120px;
      box-sizing: border-box;
    }

    .model-badge.clickable {
      cursor: pointer;
    }

    .model-badge.clickable:hover {
      border-color: var(--color-brand);
      background: rgba(59, 130, 246, 0.08);
    }

    .model-badge-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem;
    }

    .model-badge .badge-label {
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.625rem;
    }

    .badge-link-hint {
      font-size: 0.625rem;
      color: var(--color-brand);
    }

    .fixed-model-name {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-accent);
      min-width: 0;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* High-Water Mark Meter */
    .hwm-badge {
      display: inline-flex;
      flex-direction: column;
      gap: 0.2rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.3rem 0.6rem;
      min-width: 0;
      max-width: 100%;
      flex: 1 1 140px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }

    .hwm-badge.clickable {
      cursor: pointer;
    }

    .hwm-badge.clickable:hover {
      border-color: #10b981;
    }

    .hwm-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.625rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .hwm-peak {
      color: #10b981;
      font-weight: 700;
    }

    .hwm-bar-track {
      position: relative;
      height: 4px;
      background: var(--bg-surface);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin: 0.1rem 0;
    }

    .hwm-bar-fill {
      height: 100%;
      background: linear-gradient(to right, #3b82f6, #10b981);
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }

    .hwm-marker {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #10b981;
      transform: translateX(-100%);
    }

    .hwm-numbers {
      display: flex;
      align-items: baseline;
      gap: 0.2rem;
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }

    .fixed-val {
      display: inline-block;
      min-width: 4ch;
      text-align: right;
      font-weight: 600;
    }

    .num-live {
      color: #10b981;
    }

    .num-run {
      color: var(--text-secondary);
    }

    .hwm-numbers .slash {
      color: var(--border-strong);
    }

    .hwm-numbers .unit {
      font-size: 0.625rem;
      color: var(--text-muted);
      margin-left: 0.1rem;
    }

    /* Sensor Grid */
    .sensors-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.75rem;
      min-width: 0;
      max-width: 100%;
    }

    @media (min-width: 640px) {
      .sensors-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .sensors-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    .sensor-block {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .sensor-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.75rem;
    }

    .sensor-header .name {
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .val-group {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .sensor-header .val {
      font-weight: 600;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }

    .fixed-temp { min-width: 6ch; text-align: right; }
    .fixed-vram { min-width: 14ch; text-align: right; }
    .fixed-load { min-width: 4ch; text-align: right; }
    .fixed-cpu  { min-width: 5ch; text-align: right; }
    .fixed-ram  { min-width: 14ch; text-align: right; }
    .fixed-gtt  { min-width: 10ch; text-align: right; }

    .zone-badge {
      font-size: 0.625rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .zone-badge.blue   { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .zone-badge.green  { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .zone-badge.yellow { background: rgba(234, 179, 8, 0.2); color: #facc15; }
    .zone-badge.orange { background: rgba(249, 115, 22, 0.2); color: #fb923c; }
    .zone-badge.red    { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .zone-badge.fire   { background: rgba(255, 0, 51, 0.3); color: #ff0033; animation: pulse-danger 1.5s infinite; }

    @keyframes pulse-danger {
      0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(255, 0, 51, 0.6); }
      50% { opacity: 0.7; box-shadow: 0 0 2px rgba(255, 0, 51, 0.2); }
    }

    .progress-bar {
      height: 6px;
      background: var(--bg-surface);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }

    .progress-fill.brand   { background: var(--color-brand); }
    .progress-fill.emerald { background: #10b981; }
    .progress-fill.amber   { background: #f59e0b; }
    .progress-fill.cyan    { background: #06b6d4; }
    .progress-fill.purple  { background: #a855f7; }

    .sub-stat-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    .text-danger {
      color: #ff0033;
      font-weight: 700;
    }

    /* Area-Under-Curve (AOC) Sparklines */
    .chart-container {
      width: 100%;
      height: 38px;
      margin-top: 0.25rem;
      overflow: hidden;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.25);
    }

    .sparkline {
      width: 100%;
      height: 100%;
      display: block;
    }

    .aoc-fill {
      stroke: none;
    }

    .aoc-line {
      fill: none;
      stroke-width: 1.75;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    .line-brand   { stroke: var(--color-brand); }
    .line-emerald { stroke: #10b981; }
    .line-amber   { stroke: #f59e0b; }
    .line-cyan    { stroke: #06b6d4; }
    .line-purple  { stroke: #a855f7; }
  `],
})
export class HardwareMonitorComponent {
  public readonly store = inject(ArenaStateStore);
  private readonly router = inject(Router);
  public readonly metricsService = inject(HistoryMetricsService);

  public readonly metrics = this.store.telemetry;
  public readonly accelerators = signal<readonly { id: string; name: string; pciBus: string; isPrimaryApu: boolean }[]>([]);

  public readonly currentLiveVelocity = computed(() => this.store.liveTokenVelocity());
  public readonly currentRunVelocity = computed(() => this.store.runTokenVelocity());
  public readonly highWaterMark = computed(() => this.store.activeModelHighWaterMark());

  public readonly velocityPercentOfHwm = computed(() => {
    const hwm = this.highWaterMark();
    if (hwm <= 0) return 0;
    const current = Math.max(this.currentLiveVelocity(), this.currentRunVelocity());
    return Math.min(100, (current / hwm) * 100);
  });

  public readonly Math = Math;

  constructor() {
    this.fetchAccelerators();
  }

  public navigateToModelStats(modelId: string): void {
    if (!modelId || modelId === 'None') {
      void this.router.navigate(['/models']);
      return;
    }
    void this.router.navigate(['/models'], { queryParams: { model: modelId } });
  }

  // 105C is 100% of the temperature scale
  public readonly tempPercentOfMax = computed(() => {
    const temp = this.metrics().edgeTempCelsius;
    return Math.min(100, Math.max(0, (temp / 105) * 100));
  });

  // Color fenceposts:
  // <80: Blue, 80-85: Green, 85-90: Yellow, 90-95: Orange, 95-100: Red, 100-105: Fire Engine Red
  public readonly tempFillColor = computed(() => {
    const temp = this.metrics().edgeTempCelsius;
    if (temp >= 100) return '#ff0033'; // Fire engine red
    if (temp >= 95) return '#ef4444';  // Red
    if (temp >= 90) return '#f97316';  // Orange
    if (temp >= 85) return '#eab308';  // Yellow
    if (temp >= 80) return '#10b981';  // Green
    return '#3b82f6';                  // Blue
  });

  public readonly tempZoneClass = computed(() => {
    const temp = this.metrics().edgeTempCelsius;
    if (temp >= 100) return 'fire';
    if (temp >= 95) return 'red';
    if (temp >= 90) return 'orange';
    if (temp >= 85) return 'yellow';
    if (temp >= 80) return 'green';
    return 'blue';
  });

  public readonly tempZoneLabel = computed(() => {
    const temp = this.metrics().edgeTempCelsius;
    if (temp >= 105) return 'HALT';
    if (temp >= 100) return 'OUCH!';
    if (temp >= 95) return 'CRITICAL';
    if (temp >= 90) return 'HOT';
    if (temp >= 85) return 'WARM';
    if (temp >= 80) return 'NOMINAL';
    return 'COOL';
  });

  public getLinePath(values: number[], minVal = 0, maxVal = 100, width = 200, height = 40): string {
    if (!values || values.length < 2) return `M 0,${height} L ${width},${height}`;
    const range = Math.max(1, maxVal - minVal);
    const step = width / (values.length - 1);
    return values
      .map((v, i) => {
        const x = i * step;
        const normalized = Math.max(0, Math.min(1, (v - minVal) / range));
        const y = height - normalized * (height - 6) - 3;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  public getAreaPath(values: number[], minVal = 0, maxVal = 100, width = 200, height = 40): string {
    if (!values || values.length < 2) return `M 0,${height} L ${width},${height} Z`;
    const line = this.getLinePath(values, minVal, maxVal, width, height);
    return `${line} L ${width},${height} L 0,${height} Z`;
  }

  private async fetchAccelerators(): Promise<void> {
    try {
      const res = await fetch('/api/system');
      if (res.ok) {
        const data = (await res.json()) as { accelerators?: { id: string; name: string; pciBus: string; isPrimaryApu: boolean }[] };
        if (Array.isArray(data.accelerators) && data.accelerators.length > 0) {
          this.accelerators.set(data.accelerators);
        }
      }
    } catch {
      // offline / mock fallback
    }
  }
}
