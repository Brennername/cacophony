import { describe, it, expect } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FleetTopologyViewComponent } from './fleet-topology-view.component';

describe('FleetTopologyViewComponent (T86.3)', () => {
  function createComponent(): ComponentFixture<FleetTopologyViewComponent> {
    TestBed.configureTestingModule({
      imports: [FleetTopologyViewComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(FleetTopologyViewComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should render cluster summary metrics correctly', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.nodes().length).toBeGreaterThanOrEqual(2);
    expect(component.onlineNodesCount()).toBe(2);
    expect(component.totalActiveTasks()).toBe(3);
    expect(component.totalClusterVramMb()).toBe(16384 + 24576);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.view-title')?.textContent).toContain('Fleet Network Topology');
    expect(compiled.querySelectorAll('.summary-card').length).toBe(4);
  });

  it('should distinguish orchestrator hub from worker nodes', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    const orch = component.orchestratorNode();
    expect(orch).toBeDefined();
    expect(orch?.nodeId).toBe('orchestrator-local');

    const workers = component.workerNodes();
    expect(workers.length).toBe(1);
    expect(workers[0]?.nodeId).toBe('worker-node-cuda-01');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.orchestrator-card')).toBeTruthy();
    expect(compiled.querySelectorAll('.worker-card').length).toBe(1);
  });

  it('should handle real-time SSE heartbeat events and update node state with pulse', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.handleFleetEvent({
      type: 'fleet_heartbeat',
      nodeId: 'worker-node-cuda-01',
      hostname: 'worker-cuda-01 (RTX 4090)',
      status: 'BUSY',
      temperatureCelsius: 68,
      vramUsedMb: 12288,
      vramTotalMb: 24576,
      activeTasksCount: 3,
      gpuType: 'NVIDIA_CUDA',
    });
    fixture.detectChanges();

    const worker = component.nodes().find((n) => n.nodeId === 'worker-node-cuda-01');
    expect(worker).toBeDefined();
    expect(worker?.status).toBe('BUSY');
    expect(worker?.vramUsedMb).toBe(12288);
    expect(worker?.activeTasksCount).toBe(3);
    expect(component.pulsingNodes().has('worker-node-cuda-01')).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    const workerEl = compiled.querySelector('.worker-card');
    expect(workerEl?.classList.contains('node-pulsing')).toBe(true);
  });

  it('should flag thermal warnings when node temperature exceeds 75C', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.handleFleetEvent({
      type: 'fleet_heartbeat',
      nodeId: 'worker-node-cuda-01',
      temperatureCelsius: 82,
      gpuThermal: 82,
      status: 'ONLINE',
    });
    fixture.detectChanges();

    expect(component.thermalWarningNodes().has('worker-node-cuda-01')).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.warning-banner')).toBeTruthy();
    expect(compiled.querySelector('.warning-banner')?.textContent).toContain(
      'THERMAL THROTTLING ALERT (82',
    );
  });

  it('should toggle node selection on card click', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.selectedNodeId()).toBeNull();
    component.selectNode('orchestrator-local');
    expect(component.selectedNodeId()).toBe('orchestrator-local');

    component.selectNode('orchestrator-local');
    expect(component.selectedNodeId()).toBeNull();
  });
});
