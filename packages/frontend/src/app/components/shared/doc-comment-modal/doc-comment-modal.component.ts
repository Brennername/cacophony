import {
  Component,
  ChangeDetectionStrategy,
  input,
  model,
  signal,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocCommentService } from '../../../services/doc-comment.service.js';
import type { DocCommentCandidate } from '@cacophony/shared-types';

/**
 * Mobile-first interactive function doc-comment modal.
 * Enables prompt-guided rerolls, candidate draft carousel selection,
 * and non-destructive single-tap injection directly above target function signatures.
 */
@Component({
  selector: 'app-doc-comment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-comment-modal.component.html',
  styleUrls: ['./doc-comment-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocCommentModalComponent {
  public readonly docService = inject(DocCommentService);

  public readonly isOpen = model<boolean>(false);
  public readonly filePath = input.required<string>();
  public readonly functionIdentifier = input.required<string>();
  public readonly functionSignature = input<string>('');

  public readonly userGuidance = signal<string>('');
  public readonly statusMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.isOpen() && this.filePath() && this.functionIdentifier()) {
        this.docService.loadCandidates(this.filePath(), this.functionIdentifier());
      }
    });
  }

  public close(): void {
    this.isOpen.set(false);
    this.statusMessage.set(null);
  }

  public async onReroll(): Promise<void> {
    const selected = this.docService.selectedCandidate();
    const candidate = await this.docService.synthesize({
      filePath: this.filePath(),
      functionIdentifier: this.functionIdentifier(),
      userGuidance: this.userGuidance().trim() || undefined,
      previousCandidate: selected?.candidateText,
    });

    if (candidate) {
      this.statusMessage.set('New candidate synthesized');
    }
  }

  public onSelectCandidate(candidate: DocCommentCandidate): void {
    this.docService.selectCandidate(candidate);
  }

  public async onAcceptAndInject(): Promise<void> {
    const candidate = this.docService.selectedCandidate();
    if (!candidate) return;

    const ok = await this.docService.inject({
      filePath: this.filePath(),
      functionIdentifier: this.functionIdentifier(),
      commentText: candidate.candidateText,
      candidateId: candidate.id,
    });

    if (ok) {
      this.statusMessage.set('Comment injected successfully');
      setTimeout(() => {
        this.close();
      }, 1200);
    }
  }
}
