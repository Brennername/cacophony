import { Injectable, signal } from '@angular/core';
import type { DocCommentCandidate } from '@cacophony/shared-types';

export interface SynthesizeCommentRequest {
  filePath: string;
  functionIdentifier: string;
  codeContent?: string;
  userGuidance?: string;
  previousCandidate?: string;
  modelId?: string;
}

export interface InjectCommentRequest {
  filePath: string;
  functionIdentifier: string;
  commentText: string;
  candidateId?: string;
}

/**
 * Service orchestrating function doc-comment synthesis, reroll iterations,
 * candidate selection, and non-destructive AST injection.
 */
@Injectable({
  providedIn: 'root',
})
export class DocCommentService {
  public readonly candidates = signal<readonly DocCommentCandidate[]>([]);
  public readonly selectedCandidate = signal<DocCommentCandidate | null>(null);
  public readonly isGenerating = signal<boolean>(false);
  public readonly isInjecting = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  /**
   * Loads candidate drafts for a target function.
   */
  public async loadCandidates(
    filePath: string,
    functionIdentifier: string,
  ): Promise<readonly DocCommentCandidate[]> {
    this.error.set(null);
    try {
      const url = `/api/doc-comments/candidates?filePath=${encodeURIComponent(filePath)}&functionIdentifier=${encodeURIComponent(functionIdentifier)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        throw new Error(`Failed to load candidates (${res.status})`);
      }
      const data = (await res.json()) as DocCommentCandidate[];
      this.candidates.set(data);
      if (data.length > 0) {
        const accepted = data.find((c) => c.status === 'ACCEPTED');
        this.selectedCandidate.set(accepted || data[0] || null);
      } else {
        this.selectedCandidate.set(null);
      }
      return data;
    } catch (err: any) {
      this.error.set(err.message || 'Error fetching doc comment candidates');
      return [];
    }
  }

  /**
   * Synthesizes or rerolls a candidate comment via the local model.
   */
  public async synthesize(
    request: SynthesizeCommentRequest,
  ): Promise<DocCommentCandidate | null> {
    this.isGenerating.set(true);
    this.error.set(null);

    try {
      const res = await fetch('/api/doc-comments/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to synthesize doc comment (${res.status})`);
      }

      const data = (await res.json()) as { success: boolean; candidate: DocCommentCandidate };
      const newCandidate = data.candidate;

      this.candidates.update((prev) => [newCandidate, ...prev]);
      this.selectedCandidate.set(newCandidate);
      return newCandidate;
    } catch (err: any) {
      this.error.set(err.message || 'Doc comment synthesis failed');
      return null;
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Injects the accepted comment directly above the function head.
   */
  public async inject(request: InjectCommentRequest): Promise<boolean> {
    this.isInjecting.set(true);
    this.error.set(null);

    try {
      const res = await fetch('/api/doc-comments/inject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to inject comment (${res.status})`);
      }

      if (request.candidateId) {
        this.candidates.update((list) =>
          list.map((c) =>
            c.id === request.candidateId
              ? { ...c, status: 'ACCEPTED', acceptedAt: new Date().toISOString() }
              : { ...c, status: 'DISCARDED', discardedAt: new Date().toISOString() },
          ),
        );
      }

      return true;
    } catch (err: any) {
      this.error.set(err.message || 'Comment injection failed');
      return false;
    } finally {
      this.isInjecting.set(false);
    }
  }

  /**
   * Selects a candidate active in the modal viewer.
   */
  public selectCandidate(candidate: DocCommentCandidate): void {
    this.selectedCandidate.set(candidate);
  }
}
