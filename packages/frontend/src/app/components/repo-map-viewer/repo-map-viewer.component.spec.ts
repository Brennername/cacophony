import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RepoMapViewerComponent } from './repo-map-viewer.component';

describe('RepoMapViewerComponent', () => {
  let comp: RepoMapViewerComponent;
  let fixture: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RepoMapViewerComponent],
    });
    fixture = TestBed.createComponent(RepoMapViewerComponent);
    comp = fixture.componentInstance;
  });

  it('should filter nodes and select active architectural symbol', () => {
    // Initialize mock data
    const mockNodes = [
      { id: 'sym-1', name: 'TaskScheduler' },
      { id: 'sym-2', name: 'DatabaseManager' },
      { id: 'sym-3', name: 'NetworkHandler' },
      { id: 'sym-4', name: 'SecurityModule' },
      { id: 'sym-5', name: 'UserInterface' }
    ];
    fixture.componentRef.setInput('nodes', mockNodes as any);
    fixture.detectChanges();

    // Check initial node count
    expect(comp.filteredNodes().length).toBe(5);

    // Filter nodes by search query
    comp.searchQuery.set('Scheduler');
    expect(comp.filteredNodes().length).toBe(1);
    expect(comp.filteredNodes()[0]!.name).toBe('TaskScheduler');

    // Select a filtered node
    comp.selectNode(comp.filteredNodes()[0]!);
    expect(comp.selectedNodeId()).toBe('sym-1');
    expect(comp.selectedNode()?.name).toBe('TaskScheduler');
  });
});