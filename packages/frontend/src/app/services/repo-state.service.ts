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

@Injectable({
  providedIn: 'root'
})
export class RepoStateService {
  public readonly repoSymbols = signal<RepoSymbolNode[]>([]);
  public readonly checkpoints = signal<CheckpointRecord[]>([]);

  private eventSource: EventSource | null = null;

  constructor() {
    this.fetchRepoSymbols();
    this.fetchCheckpoints();
    this.startEventListening();
  }

  private startEventListening(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          const eventData = JSON.parse(event.data);
          if (eventData.type === 'repomap_updated') {
            this.fetchRepoSymbols();
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        setTimeout(() => this.startEventListening(), 5000);
      };
    } catch {
      // Graceful fallback
    }
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
    } catch (error) {
      console.error('Failed to fetch repo symbols:', error);
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
    } catch (error) {
      console.error('Failed to fetch checkpoints:', error);
    }
  }
}