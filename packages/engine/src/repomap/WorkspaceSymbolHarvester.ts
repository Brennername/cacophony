import { SymbolGraph, TaskScheduler } from '@cacophony/shared-types';
import { Workspace } from '../gitea/Workspace';

class WorkspaceSymbolHarvester {
  private symbolGraph: SymbolGraph | null = null;
  private taskScheduler: TaskScheduler;

  constructor(taskScheduler: TaskScheduler) {
    this.taskScheduler = taskScheduler;
    this.taskScheduler.on('taskCompleted', () => this.invalidateCache());
    this.taskScheduler.on('fileModified', (filePath) => this.invalidateCacheIfFileIsSymbolGraph(filePath));
  }

  private invalidateCache(): void {
    this.symbolGraph = null;
  }

  private invalidateCacheIfFileIsSymbolGraph(filePath: string): void {
    if (filePath.endsWith('.symbol-graph')) {
      this.symbolGraph = null;
    }
  }

  async getSymbolGraph(workspace: Workspace): Promise<SymbolGraph> {
    if (!this.symbolGraph) {
      this.symbolGraph = await this.fetchSymbolGraph(workspace);
    }
    return this.symbolGraph;
  }

  private async fetchSymbolGraph(workspace: Workspace): Promise<SymbolGraph> {
    // Logic to fetch symbol graph from the workspace
    // This could involve parsing files, analyzing code, etc.
    // For demonstration purposes, let's assume we're fetching it from a remote service
    const response = await fetch(`https://api.example.com/symbol-graph?workspaceId=${workspace.id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch symbol graph');
    }
    return await response.json();
  }
}

export { WorkspaceSymbolHarvester };