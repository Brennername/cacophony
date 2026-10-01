import { Component, input, output, signal, computed } from '@angular/core';
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
  template: `
    <div class="repomap-container">
      <div class="repomap-toolbar">
        <span class="toolbar-title">Repository Architectural Graph</span>
        <div class="search-box">
          <input
            type="text"
            placeholder="Filter symbols..."
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            class="filter-input"
          />
        </div>
      </div>

      <div class="repomap-viewport">
        <svg class="graph-svg" viewBox="0 0 800 400">
          <!-- Render connecting edges -->
          @for (node of filteredNodes(); track node.id; let idx = $index) {
            @if (idx > 0) {
              <line
                [attr.x1]="getNodeX(idx - 1)"
                [attr.y1]="getNodeY(idx - 1)"
                [attr.x2]="getNodeX(idx)"
                [attr.y2]="getNodeY(idx)"
                stroke="var(--border-color, #475569)"
                stroke-width="1.5"
                stroke-dasharray="3 3"
              />
            }
          }

          <!-- Render symbol nodes -->
          @for (node of filteredNodes(); track node.id; let idx = $index) {
            <g
              class="node-group"
              [class.selected]="selectedNodeId() === node.id"
              (click)="selectNode(node)"
              tabindex="0"
              role="button"
              (keydown.enter)="selectNode(node)"
            >
              <circle
                [attr.cx]="getNodeX(idx)"
                [attr.cy]="getNodeY(idx)"
                [attr.r]="12 + node.centrality * 14"
                [attr.fill]="getNodeColor(node.kind)"
                class="node-circle"
              />
              <text
                [attr.x]="getNodeX(idx)"
                [attr.y]="getNodeY(idx) + 24"
                text-anchor="middle"
                class="node-label"
              >
                {{ node.name }}
              </text>
            </g>
          }
        </svg>
      </div>

      @if (selectedNode(); as node) {
        <footer class="node-details-drawer">
          <div class="detail-item">
            <strong>Symbol:</strong> <code>{{ node.name }}</code> ({{ node.kind }})
          </div>
          <div class="detail-item">
            <strong>Path:</strong> <span>{{ node.filePath }}</span>
          </div>
          <div class="detail-item">
            <strong>Centrality Rank:</strong> <span>{{ (node.centrality * 100).toFixed(1) }}%</span>
          </div>
        </footer>
      }
    </div>
  `,
  styles: [`
    .repomap-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-surface, #1e1e24);
      border-radius: 6px;
      border: 1px solid var(--border-color, #2d2d38);
      overflow: hidden;
    }
    .repomap-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--border-color, #2d2d38);
      background: var(--bg-card, #18181f);
    }
    .toolbar-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-primary, #f8fafc);
    }
    .filter-input {
      background: var(--bg-input, #0f172a);
      border: 1px solid var(--border-color, #334155);
      color: var(--text-primary, #f8fafc);
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .repomap-viewport {
      flex: 1;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 240px;
    }
    .graph-svg {
      width: 100%;
      height: 100%;
    }
    .node-group {
      cursor: pointer;
      outline: none;
    }
    .node-circle {
      transition: all 0.2s ease;
      stroke: transparent;
      stroke-width: 2px;
    }
    .node-group:hover .node-circle {
      stroke: var(--color-primary, #38bdf8);
    }
    .node-group.selected .node-circle {
      stroke: var(--color-warning, #f59e0b);
      stroke-width: 3px;
    }
    .node-label {
      font-size: 11px;
      fill: var(--text-muted, #94a3b8);
      font-family: monospace;
      user-select: none;
    }
    .node-details-drawer {
      padding: 0.6rem 1rem;
      border-top: 1px solid var(--border-color, #2d2d38);
      background: var(--bg-card, #18181f);
      font-size: 0.85rem;
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .detail-item strong {
      color: var(--text-muted, #94a3b8);
      margin-right: 0.35rem;
    }
  `]
})
export class RepoMapViewerComponent {
  public readonly nodes = input<RepoSymbolNode[]>([
    { id: 'sym-1', name: 'TaskScheduler', kind: 'class', filePath: 'packages/engine/src/scheduler/TaskScheduler.ts', centrality: 0.9 },
    { id: 'sym-2', name: 'ContextManager', kind: 'class', filePath: 'packages/engine/src/context/ContextManager.ts', centrality: 0.85 },
    { id: 'sym-3', name: 'SymbolExtractor', kind: 'class', filePath: 'packages/engine/src/repomap/SymbolExtractor.ts', centrality: 0.7 },
    { id: 'sym-4', name: 'SessionManager', kind: 'class', filePath: 'packages/engine/src/inference/SessionManager.ts', centrality: 0.75 },
    { id: 'sym-5', name: 'TelemetryPoller', kind: 'class', filePath: 'packages/engine/src/telemetry/TelemetryPoller.ts', centrality: 0.65 }
  ]);

  public readonly nodeSelected = output<RepoSymbolNode>();

  public readonly searchQuery = signal<string>('');
  public readonly selectedNodeId = signal<string | null>(null);

  public readonly filteredNodes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.nodes();
    return this.nodes().filter(
      (n) => n.name.toLowerCase().includes(q) || n.filePath.toLowerCase().includes(q)
    );
  });

  public readonly selectedNode = computed(() => {
    const id = this.selectedNodeId();
    return this.nodes().find((n) => n.id === id) || null;
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
}