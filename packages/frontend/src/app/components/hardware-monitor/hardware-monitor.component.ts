import { Component, inject, signal } from '@angular/core';
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
        <div class="header-title-group">
          <div class="device-selector-row">
            <h2>Hardware Sensors & GPU Telemetry</h2>
            <div class="device-tags-list">
              <span class="device-tag primary">AMD Cezanne Vega (Local APU)</span>
              @for (acc of accelerators(); track acc.id) {
                @if (!acc.isPrimaryApu) {
                  <span class="device-tag secondary">{{ acc.name }} ({{ acc.pciBus }})</span>
                }
              }
            </div>
          </div>
          <span class="subtext">Direct sysfs kernel telemetry (supports multi-GPU/APU node topology)</span>
        </div>
        <div class="header-badges">
          <div class="model-badge">
            <span class="badge-label">Active Model</span>
            <span class="badge-val">{{ metrics().activeModel }}</span>
          </div>
          <div class="thermal-badge" [ngClass]="metrics().thermalZone">
            <span class="dot"></span>
            <span class="temp-text">{{ metrics().edgeTempCelsius }}°C</span>
            <span class="zone-label">{{ metrics().thermalZone | uppercase }}</span>
          </div>
        </div>
      </div>

      <!-- Compact 2-column or 3-column sensor grid -->
      <div class="compact-sensors-grid">
        <!-- VRAM Bar & Stats -->
        <div class="sensor-block">
          <div class="sensor-header">
            <span class="name">VRAM Memory</span>
            <span class="val">{{ metrics().vramUsedMb }} / {{ metrics().vramTotalMb }} MB ({{ metrics().vramPercent }}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill brand" [style.width.%]="metrics().vramPercent"></div>
          </div>
          <div class="sub-stat-row">
            <span>Avail: {{ metrics().vramAvailMb }} MB</span>
            <span>Clock: {{ metrics().mclkMhz }} MHz</span>
          </div>
        </div>

        <!-- GPU / APU Load & Core Clock -->
        <div class="sensor-block">
          <div class="sensor-header">
            <span class="name">GPU Load</span>
            <span class="val">{{ metrics().gpuBusyPercent }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="metrics().gpuBusyPercent"></div>
          </div>
          <div class="sub-stat-row">
            <span>Core: {{ metrics().sclkMhz }} MHz</span>
            <span>Power: {{ metrics().pptPowerW }} W</span>
          </div>
        </div>

        <!-- GTT Shared Memory -->
        <div class="sensor-block">
          <div class="sensor-header">
            <span class="name">GTT Shared Memory</span>
            <span class="val">{{ metrics().gttUsedMb }} / {{ metrics().gttTotalMb }} MB</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill cyan" [style.width.%]="metrics().gttTotalMb ? (metrics().gttUsedMb / metrics().gttTotalMb) * 100 : 0"></div>
          </div>
          <div class="sub-stat-row">
            <span>VDDGFX: {{ metrics().vddgfxMv }} mV</span>
            <span>VDDNB/SOC: {{ metrics().vddnbMv }} mV</span>
          </div>
        </div>
      </div>

      <!-- Quick Metrics Strip -->
      <div class="metrics-strip">
        <div class="strip-pill">
          <span class="strip-label">GPU Load</span>
          <span class="strip-value">{{ metrics().gpuBusyPercent }}%</span>
        </div>
        <div class="strip-pill">
          <span class="strip-label">APU Core Freq</span>
          <span class="strip-value">{{ metrics().sclkMhz }} MHz</span>
        </div>
        <div class="strip-pill">
          <span class="strip-label">VRAM Freq</span>
          <span class="strip-value">{{ metrics().mclkMhz }} MHz</span>
        </div>
        <div class="strip-pill">
          <span class="strip-label">Temp</span>
          <span class="strip-value">{{ metrics().edgeTempCelsius }}°C</span>
        </div>
        <div class="strip-pill">
          <span class="strip-label">Power (PPT)</span>
          <span class="strip-value">{{ metrics().pptPowerW }} W</span>
        </div>
        <div class="strip-pill">
          <span class="strip-label">VDDGFX</span>
          <span class="strip-value">{{ metrics().vddgfxMv }} mV</span>
        </div>
        <div class="strip-pill">
          <span class="strip-label">VDDNB (SOC)</span>
          <span class="strip-value">{{ metrics().vddnbMv }} mV</span>
        </div>
        <div class="strip-pill">
          <span class="strip-label">VRAM Used / Total</span>
          <span class="strip-value">{{ metrics().vramUsedMb }} / {{ metrics().vramTotalMb }} MB</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monitor-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .device-selector-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
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
    }

    .model-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.2rem 0.5rem;
      font-size: 0.75rem;
    }

    .model-badge .badge-label {
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.625rem;
    }

    .model-badge .badge-val {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-accent);
    }

    .thermal-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
    }

    .thermal-badge .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .thermal-badge.nominal {
      color: var(--status-nominal);
      border-color: var(--status-nominal);
    }
    .thermal-badge.nominal .dot {
      background: var(--status-nominal);
      box-shadow: 0 0 6px var(--status-nominal);
    }

    .compact-sensors-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.625rem;
    }

    @media (min-width: 768px) {
      .compact-sensors-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .sensor-block {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.5rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .sensor-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.75rem;
    }

    .sensor-header .name {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .sensor-header .val {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text-primary);
    }

    .progress-bar {
      height: 6px;
      background: var(--bg-surface);
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

    .sub-stat-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    .metrics-strip {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.375rem;
    }

    @media (min-width: 640px) {
      .metrics-strip {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .metrics-strip {
        grid-template-columns: repeat(8, 1fr);
      }
    }

    .strip-pill {
      display: flex;
      flex-direction: column;
      padding: 0.375rem 0.5rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .strip-label {
      font-size: 0.5625rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .strip-value {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-top: 0.125rem;
    }
  `],
})
export class HardwareMonitorComponent {
  private readonly store = inject(ArenaStateStore);
  public readonly metrics = this.store.telemetry;
  public readonly accelerators = signal<readonly { id: string; name: string; pciBus: string; isPrimaryApu: boolean }[]>([]);

  constructor() {
    this.fetchAccelerators();
  }

  private async fetchAccelerators(): Promise<void> {
    try {
      const res = await fetch('/api/system');
      if (res.ok) {
        const data = await res.json() as { accelerators?: { id: string; name: string; pciBus: string; isPrimaryApu: boolean }[] };
        if (Array.isArray(data.accelerators) && data.accelerators.length > 0) {
          this.accelerators.set(data.accelerators);
        }
      }
    } catch {
      // ignore
    }
  }
}
