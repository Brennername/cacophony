import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TerminalLogViewerComponent } from '../terminal-log-viewer/terminal-log-viewer.component';
import type { OllamaPullProgressEvent } from '@cacophony/shared-types';

interface RecommendedModelItem {
  readonly tag: string;
  readonly name: string;
  readonly description: string;
  readonly size: string;
  readonly category: 'recommended' | 'reasoning' | 'utility';
}

/**
 * ModelPullModalComponent
 *
 * Interactive modal allowing operators to pull new models from a curated catalog
 * or custom string with live progress bar and piped terminal output stream.
 */
@Component({
  selector: 'app-model-pull-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TerminalLogViewerComponent],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="title-group">
            <h2>Download Model to Local Fleet</h2>
            <p class="subtitle">Stream layers directly into local Ollama storage</p>
          </div>
          <button class="close-btn" (click)="close()" title="Close modal">✕</button>
        </div>

        <div class="modal-body">
          <!-- Curated Catalog Quick-Select -->
          <div class="catalog-section">
            <label class="section-label">Recommended Hardware-Calibrated Models</label>
            <div class="cards-grid">
              @for (item of recommendedModels; track item.tag) {
                <div
                  class="catalog-card"
                  [class.selected]="selectedModelTag === item.tag"
                  (click)="selectModel(item.tag)"
                >
                  <div class="card-top">
                    <span class="card-name">{{ item.name }}</span>
                    <span class="card-size tabular">{{ item.size }}</span>
                  </div>
                  <div class="card-tag font-mono">{{ item.tag }}</div>
                  <div class="card-desc">{{ item.description }}</div>
                </div>
              }
            </div>
          </div>

          <!-- Custom Tag Input -->
          <div class="input-section">
            <label class="section-label" for="customModelInput">Or enter any Ollama library tag</label>
            <div class="input-row">
              <input
                id="customModelInput"
                type="text"
                class="tag-input font-mono"
                placeholder="e.g. qwen2.5-coder:3b or deepseek-r1:8b-4k"
                [(ngModel)]="selectedModelTag"
                [disabled]="isPulling()"
              />
              <button
                class="pull-action-btn"
                [disabled]="!selectedModelTag || isPulling()"
                (click)="onStartPull()"
              >
                {{ isPulling() ? 'Downloading...' : 'Pull Model' }}
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          @if (isPulling()) {
            <div class="progress-section">
              <div class="progress-info">
                <span class="progress-status">{{ progress()?.status || 'Downloading layers...' }}</span>
                <span class="progress-percent tabular">{{ progress()?.percent ? progress()?.percent + '%' : '' }}</span>
              </div>
              <div class="progress-bar-bg">
                <div
                  class="progress-bar-fill"
                  [style.width.%]="progress()?.percent || (progress()?.status === 'success' ? 100 : 15)"
                ></div>
              </div>
            </div>
          }

          <!-- Piped Terminal View -->
          <div class="terminal-section">
            <app-terminal-log-viewer
              title="Ollama Pull Stream Output"
              [lines]="terminalLogs()"
              (onClear)="onClearLogs.emit()"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button class="done-btn" (click)="close()">
            {{ isPulling() ? 'Run in Background' : 'Done' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }

    .modal-card {
      background: var(--bg-surface, #161b22);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      border-radius: var(--radius-lg, 12px);
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }

    .modal-header {
      padding: 16px 20px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .title-group h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-primary, #e6edf3);
    }

    .subtitle {
      margin: 4px 0 0;
      font-size: 0.8rem;
      color: var(--text-muted, #8b949e);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted, #8b949e);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 4px;
    }

    .close-btn:hover { color: var(--text-primary, #e6edf3); }

    .modal-body {
      padding: 16px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted, #8b949e);
      margin-bottom: 8px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }

    .catalog-card {
      background: var(--bg-surface-elevated, #21262d);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--radius-md, 8px);
      padding: 10px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }

    .catalog-card:hover {
      border-color: var(--color-brand, #388bfd);
      background: rgba(56, 139, 253, 0.05);
    }

    .catalog-card.selected {
      border-color: var(--color-brand, #388bfd);
      background: rgba(56, 139, 253, 0.12);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .card-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary, #e6edf3);
    }

    .card-size {
      font-size: 0.75rem;
      color: var(--color-brand, #58a6ff);
    }

    .card-tag {
      font-size: 0.7rem;
      color: var(--text-muted, #8b949e);
      margin-bottom: 6px;
    }

    .card-desc {
      font-size: 0.75rem;
      color: var(--text-muted, #8b949e);
      line-height: 1.3;
    }

    .input-row {
      display: flex;
      gap: 10px;
    }

    .tag-input {
      flex: 1;
      background: var(--bg-surface-elevated, #0d1117);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 0.85rem;
      color: var(--text-primary, #e6edf3);
    }

    .tag-input:focus {
      outline: none;
      border-color: var(--color-brand, #388bfd);
    }

    .pull-action-btn {
      background: var(--color-brand, #1f6feb);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
    }

    .pull-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .progress-section {
      background: var(--bg-surface-elevated, #0d1117);
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      margin-bottom: 6px;
      color: var(--text-primary, #e6edf3);
    }

    .progress-bar-bg {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--color-success, #238636);
      transition: width 0.2s ease;
    }

    .modal-footer {
      padding: 12px 20px;
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .done-btn {
      background: var(--bg-surface-elevated, #21262d);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
      color: var(--text-primary, #e6edf3);
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .done-btn:hover { background: rgba(255, 255, 255, 0.08); }
  `]
})
export class ModelPullModalComponent {
  public readonly isPulling = input<boolean>(false);
  public readonly progress = input<OllamaPullProgressEvent | null>(null);
  public readonly terminalLogs = input<readonly string[]>([]);
  public readonly onPull = output<string>();
  public readonly onClose = output<void>();
  public readonly onClearLogs = output<void>();

  public selectedModelTag = 'qwen2.5-coder:3b';

  public readonly recommendedModels: readonly RecommendedModelItem[] = [
    {
      tag: 'qwen2.5-coder:3b',
      name: 'Qwen 2.5 Coder 3B',
      description: 'Lightning-fast utility and quick AST refactors (~9 tok/s)',
      size: '1.9 GB',
      category: 'recommended'
    },
    {
      tag: 'qwen2.5-coder:7b-instruct-q4_K_M',
      name: 'Qwen 2.5 Coder 7B',
      description: 'Highest empirical accuracy (69.8% win rate) sweet spot',
      size: '4.7 GB',
      category: 'recommended'
    },
    {
      tag: 'gemma3:4b-it-qat-4k',
      name: 'Gemma 3 4B QAT 4K',
      description: 'Context-capped instruction following on Vega APU',
      size: '4.0 GB',
      category: 'utility'
    },
    {
      tag: 'deepseek-r1:8b-4k',
      name: 'DeepSeek R1 8B 4K',
      description: 'Deep architectural planning & reasoning fallback',
      size: '5.2 GB',
      category: 'reasoning'
    }
  ];

  public selectModel(tag: string): void {
    if (!this.isPulling()) {
      this.selectedModelTag = tag;
    }
  }

  public onStartPull(): void {
    if (this.selectedModelTag.trim() && !this.isPulling()) {
      this.onPull.emit(this.selectedModelTag.trim());
    }
  }

  public close(): void {
    this.onClose.emit();
  }
}
