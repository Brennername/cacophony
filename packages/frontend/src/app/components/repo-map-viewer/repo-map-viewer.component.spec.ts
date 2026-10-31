import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { RepoMapViewerComponent, RepoSymbolNode } from './repo-map-viewer.component';

describe('RepoMapViewerComponent (T102.1.6)', () => {
  let component: RepoMapViewerComponent;
  let fixture: ComponentFixture<RepoMapViewerComponent>;

  const mockNodes: RepoSymbolNode[] = [
    {
      id: 'node-1',
      name: 'TaskScheduler',
      kind: 'class',
      filePath: 'packages/engine/src/scheduler/TaskScheduler.ts',
      centrality: 0.95,
    },
    {
      id: 'node-2',
      name: 'IHardwareTelemetryProvider',
      kind: 'interface',
      filePath: 'packages/engine/src/telemetry/IHardwareTelemetryProvider.ts',
      centrality: 0.8,
    },
    {
      id: 'node-3',
      name: 'sanitizeGiteaUrl',
      kind: 'function',
      filePath: 'packages/frontend/src/app/utils/url-normalizer.ts',
      centrality: 0.6,
    },
    {
      id: 'node-4',
      name: 'evaluateDispatchEligibility',
      kind: 'method',
      filePath: 'packages/engine/src/dispatch/EligibilityChecker.ts',
      centrality: 0.5,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepoMapViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RepoMapViewerComponent);
    component = fixture.componentInstance;
    component.nodes = [...mockNodes];
    fixture.detectChanges();
  });

  it('should initialize with default signals and input nodes', () => {
    expect(component.nodes.length).toBe(4);
    expect(component.searchQuery()).toBe('');
    expect(component.selectedNodeId()).toBeNull();
    expect(component.selectedNode()).toBeNull();
    expect(component.filteredNodes().length).toBe(4);
  });

  it('should filter nodes by symbol name in search query', () => {
    const event = { target: { value: 'TaskScheduler' } } as unknown as Event;
    component.onSearchInput(event);

    const filtered = component.filteredNodes();
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.name).toBe('TaskScheduler');
  });

  it('should filter nodes by filePath in search query', () => {
    const event = { target: { value: 'url-normalizer' } } as unknown as Event;
    component.onSearchInput(event);

    const filtered = component.filteredNodes();
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.name).toBe('sanitizeGiteaUrl');
  });

  it('should select node, update selectedNodeId and computed selectedNode, and emit nodeSelected', () => {
    let emittedNode: RepoSymbolNode | undefined;
    component.nodeSelected.subscribe((n) => {
      emittedNode = n;
    });

    const targetNode = mockNodes[1]!;
    component.selectNode(targetNode);

    expect(component.selectedNodeId()).toBe('node-2');
    expect(component.selectedNode()).toEqual(targetNode);
    expect(emittedNode).toEqual(targetNode);
  });

  it('should return correct theme color per symbol kind', () => {
    expect(component.getNodeColor('class')).toBe('#38bdf8');
    expect(component.getNodeColor('interface')).toBe('#10b981');
    expect(component.getNodeColor('function')).toBe('#f59e0b');
    expect(component.getNodeColor('method')).toBe('#a855f7');
    expect(component.getNodeColor('unknown')).toBe('#64748b');
  });

  it('should compute node coordinates correctly', () => {
    const x0 = component.getNodeX(0);
    const x1 = component.getNodeX(1);
    expect(x1).toBeGreaterThan(x0);

    const yEven = component.getNodeY(0);
    const yOdd = component.getNodeY(1);
    expect(yEven).toBe(110);
    expect(yOdd).toBe(190);
  });

  it('should adjust pan offset on wheel event', () => {
    const initialX = component.panOffsetX();
    const initialY = component.panOffsetY();

    const wheelUp = {
      preventDefault: () => {},
      deltaY: -100,
    } as unknown as WheelEvent;

    component.onWheel(wheelUp);
    expect(component.panOffsetX()).toBe(initialX + 5);
    expect(component.panOffsetY()).toBe(initialY + 5);

    const wheelDown = {
      preventDefault: () => {},
      deltaY: 100,
    } as unknown as WheelEvent;

    component.onWheel(wheelDown);
    expect(component.panOffsetX()).toBe(initialX);
    expect(component.panOffsetY()).toBe(initialY);
  });

  it('should adjust pan offset on click event relative to center', () => {
    const initialX = component.panOffsetX();
    const initialY = component.panOffsetY();

    const mockElement = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    };

    const clickEvent = {
      target: mockElement,
      clientX: 500,
      clientY: 400,
    } as unknown as MouseEvent;

    component.onClick(clickEvent);
    expect(component.panOffsetX()).toBe(initialX + (400 - 500));
    expect(component.panOffsetY()).toBe(initialY + (300 - 400));
  });
});
