import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RepoSymbolNode {
  readonly id: string;
  readonly name: string;
  readonly kind: 'class' | 'interface' | 'function' | 'method';
  readonly filePath: string;
  readonly centrality: number;
}

@Component({
  selector: 'app-repo-map-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './repo-map-viewer.component.html',
  styleUrl: './repo-map-viewer.component.css',
})
export class RepoMapViewerComponent {
  @Input() nodes: RepoSymbolNode[] = [];
  @Output() nodeSelected = new EventEmitter<RepoSymbolNode>();

  public readonly searchQuery = signal<string>('');
  public readonly selectedNodeId = signal<string | null>(null);
  public readonly panOffsetX = signal<number>(0);
  public readonly panOffsetY = signal<number>(0);

  public readonly filteredNodes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.nodes;
    return this.nodes.filter(
      (n) => n.name.toLowerCase().includes(q) || n.filePath.toLowerCase().includes(q)
    );
  });

  public readonly selectedNode = computed(() => {
    const id = this.selectedNodeId();
    return this.nodes.find((n) => n.id === id) || null;
  });

  public onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  public selectNode(node: RepoSymbolNode): void {
    this.selectedNodeId.set(node.id);
    this.nodeSelected.emit(node);
  }

  public getNodeX(index: number): number {
    const total = Math.max(1, this.filteredNodes().length);
    const spacing = 700 / (total + 1);
    return 50 + (index + 1) * spacing;
  }

  public getNodeY(index: number): number {
    return 150 + ((index % 2 === 0) ? -40 : 40);
  }

  public getNodeColor(kind: string): string {
    switch (kind) {
      case 'class': return '#38bdf8';
      case 'interface': return '#10b981';
      case 'function': return '#f59e0b';
      case 'method': return '#a855f7';
      default: return '#64748b';
    }
  }

  public onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -1 : 1;
    this.panOffsetX.update(offset => offset + delta * 5);
    this.panOffsetY.update(offset => offset + delta * 5);
  }

  public onClick(event: MouseEvent): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    this.panOffsetX.update(offset => offset + (centerX - offsetX));
    this.panOffsetY.update(offset => offset + (centerY - offsetY));
  }
}
