import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RepoMapViewerComponent } from './repo-map-viewer.component';

describe('RepoMapViewerComponent', () => {
  let component: RepoMapViewerComponent;
  let fixture: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepoMapViewerComponent],
    });
    fixture = TestBed.createComponent(RepoMapViewerComponent);
    component = fixture.componentInstance;
  });

  it('should generate SVG circles and labels for all supplied symbol nodes', () => {
    // Mock the nodes with some sample data
    const mockNodes = [
      { id: 'sym-1', name: 'TaskScheduler' },
      { id: 'sym-2', name: 'GitWorktreeManager' },
      { id: 'sym-3', name: 'PipelineEngine' }
    ];

    // Assign the mock nodes to the component
    component.nodes = mockNodes;

    // Trigger change detection to update the component
    fixture.detectChanges();

    // Get the SVG element from the template
    const svgElement = fixture.nativeElement.querySelector('svg');

    // Check if there are circles and labels for each node
    expect(svgElement.querySelectorAll('circle').length).toBe(mockNodes.length);
    expect(svgElement.querySelectorAll('text').length).toBe(mockNodes.length);

    // Verify that each circle and label corresponds to a node
    mockNodes.forEach((node, index) => {
      const circle = svgElement.querySelector(`circle[data-id="sym-${index + 1}"]`);
      const text = svgElement.querySelector(`text[data-id="sym-${index + 1}"]`);

      expect(circle).toBeTruthy();
      expect(text).toBeTruthy();
      expect(circle.getAttribute('data-id')).toBe(`sym-${index + 1}`);
      expect(text.getAttribute('data-id')).toBe(`sym-${index + 1}`);
      expect(text.textContent).toBe(node.name);
    });
  });
});