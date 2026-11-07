import {
  Component,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ComplianceReviewResult, ComplianceAuditItem } from '@cacophony/shared-types';

/**
 * Mobile-first review transcript card providing full visibility into
 * compliance review stages, advisory instructions breakdown, and model reasoning.
 */
@Component({
  selector: 'app-review-transcript-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-transcript-card.component.html',
  styleUrls: ['./review-transcript-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewTranscriptCardComponent {
  public readonly reviewResult = input.required<ComplianceReviewResult>();
  public readonly reviewerModel = input<string>('qwen2.5-coder:7b');
  public readonly stageDurationMs = input<number>(0);
}
