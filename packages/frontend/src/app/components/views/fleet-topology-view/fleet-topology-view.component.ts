import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface TopologyNode {
  nodeId: string;
  hostname: string;
  ipAddress: string;
  port?: number;
  gpuType: string;
  vramTotalMb: number;
  vramUsedMb: number;
  gpuBusyPercent: number;
  temperatureCelsius: number;
  gpuThermal?: number;
  apuThermal?: number;
  status: 'ONLINE' | 'BUSY' | 'DEGRADED' | 'OFFLINE' | 'DRAINING' | string;
  activeTasksCount: number;
  lastHeartbeat?: string;
  isOrchestrator?: boolean;
}

/**
 * FleetTopologyViewComponent
 *
 * Real-time network topology visualization dashboard for distributed worker nodes.
 * Features live SSE bindings to /api/fleet/events, dynamic visual pulse animations
 * for task assignment and thermal warnings, and a mobile-first responsive layout.
 */
@Component({
  selector: 'app-fleet-topology-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fleet-topology-view.component.html',
  styleUrl: './fleet-topology-view.component.css',
})
export class FleetTopologyViewComponent implements OnInit, OnDestroy {
  public nodes = signal<TopologyNode[]>([
    {
      nodeId: 'orchestrator-local',
      hostname: 'cacophony-master (AMD Vega)',
      ipAddress: '127.0.0.1',
      port: 24072,
      gpuType: 'AMD_VEGA',
      vramTotalMb: 16384,
      vramUsedMb: 2450,
      gpuBusyPercent: 18,
      temperatureCelsius: 52,
      status: 'ONLINE',
      activeTasksCount: 1,
      isOrchestrator: true,
    },
    {
      nodeId: 'worker-node-cuda-01',
      hostname: 'worker-cuda-01 (RTX 4090)',
      ipAddress: '192.168.1.102',
      port: 24074,
      gpuType: 'NVIDIA_CUDA',
      vramTotalMb: 24576,
      vramUsedMb: 6144,
      gpuBusyPercent: 42,
      temperatureCelsius: 64,
      status: 'ONLINE',
      activeTasksCount: 2,
      isOrchestrator: false,
    },
  ]);

  public pulsingNodes = signal<Set<string>>(new Set<string>());
  public thermalWarningNodes = signal<Set<string>>(new Set<string>());
  public selectedNodeId = signal<string | null>(null);
  public sseConnected = signal<boolean>(false);

  private eventSource: EventSource | null = null;
  private pulseTimeouts = new Map<string, any>();

  public orchestratorNode = computed<TopologyNode | undefined>(() => {
    return this.nodes().find(
      (n) => n.isOrchestrator || n.nodeId.includes('master') || n.nodeId.includes('orchestrator'),
    );
  });

  public workerNodes = computed<TopologyNode[]>(() => {
    const orch = this.orchestratorNode();
    return this.nodes().filter((n) => n.nodeId !== orch?.nodeId);
  });

  public totalClusterVramMb = computed<number>(() => {
    return this.nodes().reduce((sum, n) => sum + (n.vramTotalMb || 0), 0);
  });

  public usedClusterVramMb = computed<number>(() => {
    return this.nodes().reduce((sum, n) => sum + (n.vramUsedMb || 0), 0);
  });

  public totalActiveTasks = computed<number>(() => {
    return this.nodes().reduce((sum, n) => sum + (n.activeTasksCount || 0), 0);
  });

  public onlineNodesCount = computed<number>(() => {
    return this.nodes().filter((n) => n.status === 'ONLINE' || n.status === 'BUSY').length;
  });

  public ngOnInit(): void {
    this.loadInitialNodes();
    this.connectSse();
  }

  public ngOnDestroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    for (const timeout of this.pulseTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.pulseTimeouts.clear();
  }

  public async loadInitialNodes(): Promise<void> {
    try {
      const res = await fetch('/api/fleet/nodes');
      if (res.ok) {
        const data = (await res.json()) as TopologyNode[];
        if (Array.isArray(data) && data.length > 0) {
          this.nodes.set(data);
          this.evaluateThermals(data);
        }
      }
    } catch {
      // Fallback to initial seeds
    }
  }

  public connectSse(): void {
    if (typeof EventSource === 'undefined') {
      return;
    }

    try {
      this.eventSource = new EventSource('/api/fleet/events');

      this.eventSource.onopen = () => {
        this.sseConnected.set(true);
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleFleetEvent(payload);
        } catch {
          // ignore parsing error
        }
      };

      this.eventSource.onerror = () => {
        this.sseConnected.set(false);
      };
    } catch {
      this.sseConnected.set(false);
    }
  }

  public handleFleetEvent(payload: any): void {
    if (!payload || !payload.type) return;

    if (payload.type === 'fleet_init' && Array.isArray(payload.nodes)) {
      if (payload.nodes.length > 0) {
        this.nodes.set(payload.nodes);
        this.evaluateThermals(payload.nodes);
      }
      return;
    }

    if (payload.type === 'fleet_heartbeat' && payload.nodeId) {
      this.triggerNodePulse(payload.nodeId);
      this.updateOrUpsertNode(payload);
    }

    if (payload.type === 'thermal_warning' && payload.nodeId) {
      this.triggerThermalWarning(payload.nodeId);
    }
  }

  public updateOrUpsertNode(data: Partial<TopologyNode> & { nodeId: string }): void {
    const current = [...this.nodes()];
    const idx = current.findIndex((n) => n.nodeId === data.nodeId);

    const isThermalElevated = (data.temperatureCelsius ?? 0) >= 75 || (data.gpuThermal ?? 0) >= 75;

    if (idx >= 0) {
      const existing = current[idx]!;
      current[idx] = {
        ...existing,
        ...data,
        status:
          isThermalElevated && existing.status !== 'OFFLINE'
            ? 'DEGRADED'
            : (data.status ?? existing.status),
      };
    } else {
      current.push({
        nodeId: data.nodeId,
        hostname: data.hostname ?? data.nodeId,
        ipAddress: data.ipAddress ?? '127.0.0.1',
        port: data.port,
        gpuType: data.gpuType ?? 'UNKNOWN',
        vramTotalMb: data.vramTotalMb ?? 16384,
        vramUsedMb: data.vramUsedMb ?? 0,
        gpuBusyPercent: data.gpuBusyPercent ?? 0,
        temperatureCelsius: data.temperatureCelsius ?? 50,
        status: data.status ?? (isThermalElevated ? 'DEGRADED' : 'ONLINE'),
        activeTasksCount: data.activeTasksCount ?? 0,
        isOrchestrator: false,
      });
    }

    this.nodes.set(current);
    this.evaluateThermals(current);
  }

  public triggerNodePulse(nodeId: string): void {
    const updated = new Set(this.pulsingNodes());
    updated.add(nodeId);
    this.pulsingNodes.set(updated);

    if (this.pulseTimeouts.has(nodeId)) {
      clearTimeout(this.pulseTimeouts.get(nodeId));
    }

    const timeout = setTimeout(() => {
      const current = new Set(this.pulsingNodes());
      current.delete(nodeId);
      this.pulsingNodes.set(current);
      this.pulseTimeouts.delete(nodeId);
    }, 2500);

    this.pulseTimeouts.set(nodeId, timeout);
  }

  public triggerThermalWarning(nodeId: string): void {
    const current = new Set(this.thermalWarningNodes());
    current.add(nodeId);
    this.thermalWarningNodes.set(current);
  }

  public evaluateThermals(nodes: TopologyNode[]): void {
    const warnings = new Set<string>();
    for (const node of nodes) {
      if (
        (node.temperatureCelsius || 0) >= 75 ||
        (node.gpuThermal || 0) >= 75 ||
        node.status === 'DEGRADED'
      ) {
        warnings.add(node.nodeId);
      }
    }
    this.thermalWarningNodes.set(warnings);
  }

  public selectNode(nodeId: string): void {
    this.selectedNodeId.set(this.selectedNodeId() === nodeId ? null : nodeId);
  }

  public calculateVramPercent(used: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
  }
}
