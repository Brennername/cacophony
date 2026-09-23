import { Injectable, signal } from '@angular/core';

export interface RepoSymbolNode {
  id: string;
  name: string;
  kind: 'class' | 'interface' | 'function' | 'method';
  filePath: string;
  centrality: number;
}

export interface CheckpointRecord {
  id: string;
  hash: string;
  message: string;
  createdAt: string;
  filesChanged: number;
}

/**
 * Service providing real data for RepoMap and Git Checkpoints.
 */
@Injectable({
  providedIn: 'root'
})
export class RepoStateService {
  public readonly repoSymbols = signal<RepoSymbolNode[]>([]);
  public readonly checkpoints = signal<CheckpointRecord[]>([]);

  constructor() {
    this.fetchRepoSymbols();
    this.fetchCheckpoints();
  }

  public async fetchRepoSymbols(): Promise<void> {
    try {
      const res = await fetch('/api/repomap');
      if (res.ok) {
        const data = await res.json() as RepoSymbolNode[];
        if (data.length > 0) {
          this.repoSymbols.set(data);
        }
      }
    } catch {
      // offline fallback
    }
  }

  public async fetchCheckpoints(): Promise<void> {
    try {
      const res = await fetch('/api/checkpoints');
      if (res.ok) {
        const data = await res.json() as CheckpointRecord[];
        if (data.length > 0) {
          this.checkpoints.set(data);
        }
      }
    } catch {
      // offline fallback
    }
  }
}
