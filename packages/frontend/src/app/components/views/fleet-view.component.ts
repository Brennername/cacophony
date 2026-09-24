import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FleetNodeView {
  nodeId: string;
  hostname: string;
  ipAddress: string;
  gpuType: string;
  vramTotalMb: number;
  vramUsedMb: number;
  gpuBusyPercent: number;
  temperatureCelsius: number;
  status: string;
  activeTasksCount: number;
}

/**
 * Distributed Multi-Node Fleet Overview and Hardware Diagnostics route view:
 * Real-time monitoring of cluster worker nodes across AMD APU, RDNA, NVIDIA, and Apple Silicon.
 */
@Component({
  selector: 'app-fleet-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Distributed Fleet Nodes & Accelerators</h1>
          <p class="subtitle">Multi-machine coordinator topology, heterogeneous GPUs, and thermal telemetry</p>
        </div>
        <div class="header-stat">
          <span class="stat-num">{{ nodes().length }}</span>
          <span class="stat-label">Active Cluster Nodes</span>
        </div>
      </div>

      <div class="fleet-grid">
        @for (node of nodes(); track node.nodeId) {
          <div class="cacophony-card node-card">
            <div class="node-header">
              <div class="node-title">
                <span class="status-dot" [ngClass]="node.status.toLowerCase()"></span>
                <strong>{{ node.hostname }}</strong>
                <span class="node-ip font-mono">{{ node.ipAddress }}</span>
              </div>
              <span class="gpu-badge">{{ node.gpuType }}</span>
            </div>

            <div class="node-stats">
              <div class="stat-col">
                <span class="label">GPU Load</span>
                <span class="val font-mono">{{ node.gpuBusyPercent }}%</span>
              </div>
              <div class="stat-col">
                <span class="label">VRAM</span>
                <span class="val font-mono">{{ node.vramUsedMb }} / {{ node.vramTotalMb }} MB</span>
              </div>
              <div class="stat-col">
                <span class="label">Temperature</span>
                <span class="val font-mono" [class.warn]="node.temperatureCelsius >= 80">
                  {{ node.temperatureCelsius }}°C
                </span>
              </div>
              <div class="stat-col">
                <span class="label">Tasks</span>
                <span class="val font-mono">{{ node.activeTasksCount }} running</span>
              </div>
            </div>

            <div class="bar-container">
              <div class="bar-fill" [style.width.%]="node.gpuBusyPercent"></div>
            </div>
          </div>
        }
      </div>

      <div class="cacophony-card diagnostic-tools-card">
        <div class="tools-header">
          <div class="tools-title">
            <h3>Recommended Hardware Diagnostic & Sensor Utilities</h3>
            <p class="subtitle">Install native Linux monitoring tools to enable live VRAM bus, thermal sensors, and GPU compute ring inspection</p>
          </div>
          <button class="copy-btn" (click)="copyInstallCommand()">{{ copyButtonText() }}</button>
        </div>
        <div class="code-snippet font-mono">
          <code>sudo apt update && sudo apt install -y radeontop lm-sensors btop htop mesa-utils vulkan-tools pciutils</code>
        </div>
        <div class="tools-pills">
          <span class="tool-pill"><strong>radeontop:</strong> AMD VRAM & GTT aperture bus monitor</span>
          <span class="tool-pill"><strong>lm-sensors:</strong> SoC voltage & package thermals</span>
          <span class="tool-pill"><strong>btop:</strong> Real-time swap, memory & thread monitor</span>
          <span class="tool-pill"><strong>vulkaninfo:</strong> Compute queue & heap inspector</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .view-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .view-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .header-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .stat-num {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-brand);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .fleet-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    @media (min-width: 768px) {
      .fleet-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .node-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .node-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
    }

    .node-ip {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-dot.online { background: var(--status-nominal); }
    .status-dot.busy { background: var(--color-brand); }
    .status-dot.degraded { background: var(--status-warm); }
    .status-dot.offline { background: var(--status-danger); }

    .gpu-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--color-accent);
    }

    .node-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      background: var(--bg-surface-elevated);
      padding: 0.625rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    .stat-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .label {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .val {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-top: 0.15rem;
    }

    .val.warn {
      color: var(--status-danger);
    }

    .bar-container {
      height: 6px;
      background: var(--bg-surface-elevated);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: var(--status-nominal);
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }

    .diagnostic-tools-card {
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border: 1px solid rgba(59, 130, 246, 0.3);
      background: rgba(15, 23, 42, 0.7);
    }

    .tools-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .tools-title h3 {
      font-size: 1.05rem;
      margin: 0;
      color: var(--text-primary);
    }

    .copy-btn {
      padding: 0.4rem 0.9rem;
      border-radius: var(--radius-sm);
      background: var(--color-brand);
      color: #fff;
      font-size: 0.8rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .copy-btn:hover {
      opacity: 0.9;
    }

    .code-snippet {
      padding: 0.75rem 1rem;
      background: #090d16;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      overflow-x: auto;
      font-size: 0.85rem;
      color: #38bdf8;
    }

    .tools-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tool-pill {
      font-size: 0.75rem;
      padding: 0.3rem 0.6rem;
      border-radius: var(--radius-full);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .tool-pill strong {
      color: var(--text-primary);
    }
  `],
})
export class FleetViewComponent implements OnInit {
  public nodes = signal<FleetNodeView[]>([
    {
      nodeId: 'node-master-vega',
      hostname: 'cacophony-master (AMD Vega)',
      ipAddress: '127.0.0.1',
      gpuType: 'AMD_VEGA',
      vramTotalMb: 16384,
      vramUsedMb: 2450,
      gpuBusyPercent: 22,
      temperatureCelsius: 56,
      status: 'ONLINE',
      activeTasksCount: 1,
    },
    {
      nodeId: 'node-worker-cuda',
      hostname: 'worker-cuda-01 (RTX 4090)',
      ipAddress: '192.168.1.102',
      gpuType: 'NVIDIA_CUDA',
      vramTotalMb: 24576,
      vramUsedMb: 6100,
      gpuBusyPercent: 45,
      temperatureCelsius: 62,
      status: 'ONLINE',
      activeTasksCount: 2,
    },
  ]);

  public copyButtonText = signal<string>('Copy Command');

  public async copyInstallCommand(): Promise<void> {
    const cmd = 'sudo apt update && sudo apt install -y radeontop lm-sensors btop htop mesa-utils vulkan-tools pciutils';
    try {
      await navigator.clipboard.writeText(cmd);
      this.copyButtonText.set('Copied!');
      setTimeout(() => this.copyButtonText.set('Copy Command'), 2000);
    } catch {
      // Fallback
    }
  }

  public async ngOnInit(): Promise<void> {
    try {
      const res = await fetch('/api/fleet/nodes');
      if (res.ok) {
        const liveNodes = await res.json() as FleetNodeView[];
        if (liveNodes.length > 0) {
          this.nodes.set(liveNodes);
        }
      }
    } catch {
      // offline fallback
    }
  }
}
