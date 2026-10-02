import { Injectable, signal } from '@angular/core';
import { EventSourcePolyfill } from 'eventsource';

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

  private eventSource: EventSourcePolyfill | null = null;

  constructor() {
    this.fetchRepoSymbols();
    this.fetchCheckpoints();

    // Start listening for 'repomap_updated' events
    this.startEventListening();
  }

  private startEventListening(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSourcePolyfill('/api/events');

    this.eventSource.onmessage = (event) => {
      const eventData = JSON.parse(event.data);
      if (eventData.type === 'repomap_updated') {
        this.fetchRepoSymbols();
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      this.eventSource?.close();
      setTimeout(() => this.startEventListening(), 5000); // Retry after 5 seconds
    };
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