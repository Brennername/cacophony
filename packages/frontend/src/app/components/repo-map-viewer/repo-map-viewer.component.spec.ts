import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RepoMapViewerComponent } from './repo-map-viewer.component';

describe('RepoMapViewerComponent', () => {
  it('should filter nodes and select active architectural symbol', () => {
    TestBed.configureTestingModule({
      imports: [RepoMapViewerComponent],
    });
    const fixture = TestBed.createComponent(RepoMapViewerComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.filteredNodes().length).toBe(5);
    comp.searchQuery.set('Scheduler');
    expect(comp.filteredNodes().length).toBe(1);
    expect(comp.filteredNodes()[0]!.name).toBe('TaskScheduler');

    comp.selectNode(comp.filteredNodes()[0]!);
    expect(comp.selectedNodeId()).toBe('sym-1');
    expect(comp.selectedNode()?.name).toBe('TaskScheduler');
  });
});
