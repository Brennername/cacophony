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
  templateUrl: './repomap-view.component.html',
  styleUrl: './repomap-view.component.css',
})
export class RepoMapViewComponent {
  public readonly repoService = inject(RepoStateService);
}
