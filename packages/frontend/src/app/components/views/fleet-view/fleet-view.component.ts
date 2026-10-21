import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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
  imports: [CommonModule, RouterModule],
  templateUrl: './fleet-view.component.html',
  styleUrl: './fleet-view.component.css',
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

  public diagnosticReport = signal<any | null>(null);
  public copyButtonText = signal<string>('Copy Command');

  public async copyInstallCommand(): Promise<void> {
    const report = this.diagnosticReport();
    const cmd =
      report?.unifiedInstallCommand ||
      'sudo apt update && sudo apt install -y radeontop lm-sensors btop htop mesa-utils vulkan-tools pciutils';
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
        const liveNodes = (await res.json()) as FleetNodeView[];
        if (liveNodes.length > 0) {
          this.nodes.set(liveNodes);
        }
      }
    } catch {
      // offline fallback
    }

    try {
      const toolsRes = await fetch('/api/hardware/tools');
      if (toolsRes.ok) {
        const report = await toolsRes.json();
        this.diagnosticReport.set(report);
      }
    } catch {
      // offline fallback
    }
  }
}
