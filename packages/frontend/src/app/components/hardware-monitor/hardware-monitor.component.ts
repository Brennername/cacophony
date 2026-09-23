import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * KDE System Monitor aesthetic hardware diagnostics monitor.
 * Displays live GPU busy %, VRAM utilization, GTT memory, temperature zone badge,
 * electrical voltage, PPT power, and GPU clock.
 */
@Component({
  selector: 'app-hardware-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cacophony-card monitor-card">
      <div class="card-header">
        <div>
          <h2>Hardware Diagnostics (AMD APU)</h2>
          <span class="subtext">Direct Linux sysfs sensor telemetry</span>
        </div>
        <div class="thermal-badge" [ngClass]="metrics().thermalZone">
          <span class="dot"></span>
          <span class="temp-text">{{ metrics().edgeTempCelsius }}°C</span>
          <span class="zone-label">{{ metrics().thermalZone | uppercase }}</span>
        </div>
      </div>

      <div class="metrics-grid">
        <!-- GPU Busy Meter -->
        <div class="gauge-item">
          <div class="gauge-header">
            <span>GPU Load</span>
            <span class="val">{{ metrics().gpuBusyPercent }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="metrics().gpuBusyPercent"></div>
          </div>
        </div>

        <!-- VRAM Utilization -->
        <div class="gauge-item">
          <div class="gauge-header">
            <span>VRAM Allocation</span>
            <span class="val">{{ metrics().vramUsedMb }} / {{ metrics().vramTotalMb }} MB</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill brand" [style.width.%]="(metrics().vramUsedMb / metrics().vramTotalMb) * 100"></div>
          </div>
        </div>

        <!-- GTT Memory -->
        <div class="gauge-item">
          <div class="gauge-header">
            <span>GTT Shared Memory</span>
            <span class="val">{{ metrics().gttUsedMb }} / {{ metrics().gttTotalMb }} MB</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill cyan" [style.width.%]="(metrics().gttUsedMb / metrics().gttTotalMb) * 100"></div>
          </div>
        </div>
      </div>

      <!-- Electrical & Frequency Row -->
      <div class="electrical-row">
        <div class="metric-pill">
          <span class="label">Core Voltage</span>
          <span class="num">{{ metrics().vddgfxMv }} mV</span>
        </div>
        <div class="metric-pill">
          <span class="label">Package PPT</span>
          <span class="num">{{ metrics().pptPowerW }} W</span>
        </div>
        <div class="metric-pill">
          <span class="label">SCLK Frequency</span>
          <span class="num">{{ metrics().sclkMhz }} MHz</span>
        </div>
        <div class="metric-pill model">
          <span class="label">VRAM Loaded Model</span>
          <span class="num highlight">{{ metrics().activeModel }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monitor-card {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .subtext {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .thermal-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.8125rem;
      font-weight: 600;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
    }

    .thermal-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .thermal-badge.nominal {
      color: var(--status-nominal);
      border-color: var(--status-nominal);
    }
    .thermal-badge.nominal .dot {
      background: var(--status-nominal);
      box-shadow: 0 0 8px var(--status-nominal);
    }

    .metrics-grid {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .gauge-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 0.375rem;
    }

    .gauge-header .val {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text-primary);
    }

    .progress-bar {
      height: 8px;
      background: var(--bg-surface-elevated);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--status-nominal);
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }

    .progress-fill.brand {
      background: var(--color-brand);
    }

    .progress-fill.cyan {
      background: var(--color-accent);
    }

    .electrical-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.625rem;
    }

    @media (min-width: 640px) {
      .electrical-row {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .metric-pill {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0.75rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .metric-pill .label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .metric-pill .num {
      font-family: var(--font-mono);
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-top: 0.25rem;
    }

    .metric-pill .highlight {
      color: var(--color-accent);
    }
  `],
})
export class HardwareMonitorComponent {
  private readonly store = inject(ArenaStateStore);
  public readonly metrics = this.store.telemetry;
}
