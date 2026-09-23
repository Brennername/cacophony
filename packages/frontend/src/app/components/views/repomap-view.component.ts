import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RepoMapViewerComponent } from '../repo-map-viewer/repo-map-viewer.component';
import { LspTestLoopPanelComponent } from '../lsp-test-loop-panel/lsp-test-loop-panel.component';
import { RepoStateService } from '../../services/repo-state.service';

/**
 * Repository Map & AST Symbols route view:
 * Full interactive repository architectural dependency graph and live compiler diagnostics.
 */
@Component({
  selector: 'app-repomap-view',
  standalone: true,
  imports: [CommonModule, RepoMapViewerComponent, LspTestLoopPanelComponent],
  template: `
    <div class="view-container">
      <div class="view-header">
        <h1>Repository Architecture & Symbol Map</h1>
        <p class="subtitle">AST dependency graphs, structural symbols, and live language server diagnostics</p>
      </div>

      <div class="repomap-grid">
        <section class="grid-card-wrapper full-width">
          <app-repo-map-viewer [nodes]="repoService.repoSymbols()" />
        </section>

        <section class="grid-card-wrapper full-width">
          <app-lsp-test-loop-panel />
        </section>
      </div>
    </div>
  `,
  styles: [`
    .view-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
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

    .repomap-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    .grid-card-wrapper {
      display: flex;
      flex-direction: column;
    }

    .grid-card-wrapper > * {
      flex: 1;
    }
  `],
})
export class RepoMapViewComponent {
  public readonly repoService = inject(RepoStateService);
}
