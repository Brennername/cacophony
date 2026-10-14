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
  templateUrl: './model-pull-modal.component.html',
  styleUrl: './model-pull-modal.component.css',
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
