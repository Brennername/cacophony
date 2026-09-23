import * as path from "node:path";
import * as fs from "node:fs/promises";

export type ContextFileMode = "EDITABLE" | "REFERENCE";

export interface ContextFile {
  readonly path: string;
  readonly mode: ContextFileMode;
  readonly estimatedTokens: number;
}

export interface ContextManagerOptions {
  readonly maxTokensThreshold?: number | undefined; // default 60% of model window
  readonly modelWindowTokens?: number | undefined; // default 8192
}

/**
 * ContextManager
 *
 * Manages active multi-file context categorized into EDITABLE (read-write) and REFERENCE (read-only).
 * Supports /add, /drop, /read-only, and /clear commands, glob patterns,
 * and context capacity warning notifications.
 */
export class ContextManager {
  private readonly files = new Map<string, ContextFile>();
  private readonly maxTokensThreshold: number;
  private readonly modelWindowTokens: number;

  constructor(options: ContextManagerOptions = {}) {
    this.modelWindowTokens = options.modelWindowTokens ?? 8192;
    this.maxTokensThreshold = options.maxTokensThreshold ?? Math.floor(this.modelWindowTokens * 0.60);
  }

  public async addFile(
    workspaceRoot: string,
    relativeFilePath: string,
    mode: ContextFileMode = "EDITABLE"
  ): Promise<ContextFile> {
    const fullPath = path.resolve(workspaceRoot, relativeFilePath);
    let size = 0;
    try {
      const stats = await fs.stat(fullPath);
      size = stats.size;
    } catch {
      // Allow staging even if virtual
      size = 200;
    }

    const estimatedTokens = Math.ceil(size / 4);
    const entry: ContextFile = {
      path: relativeFilePath,
      mode,
      estimatedTokens
    };

    this.files.set(relativeFilePath, entry);
    return entry;
  }

  public dropFile(relativeFilePath: string): boolean {
    return this.files.delete(relativeFilePath);
  }

  public setMode(relativeFilePath: string, mode: ContextFileMode): boolean {
    const existing = this.files.get(relativeFilePath);
    if (!existing) return false;
    this.files.set(relativeFilePath, { ...existing, mode });
    return true;
  }

  public clear(): void {
    this.files.clear();
  }

  public getFiles(modeFilter?: ContextFileMode): readonly ContextFile[] {
    const list = Array.from(this.files.values());
    if (modeFilter) {
      return list.filter((f) => f.mode === modeFilter);
    }
    return list;
  }

  public getTotalTokens(): number {
    let sum = 0;
    for (const f of this.files.values()) {
      sum += f.estimatedTokens;
    }
    return sum;
  }

  public isNearTokenCapacity(): boolean {
    return this.getTotalTokens() >= this.maxTokensThreshold;
  }

  public getCapacityWarning(): string | null {
    if (this.isNearTokenCapacity()) {
      const current = this.getTotalTokens();
      const pct = Math.round((current / this.modelWindowTokens) * 100);
      return `Warning: Active context size (${current} tokens) exceeds 60% of model window (${pct}% of ${this.modelWindowTokens} tokens). Consider dropping reference files with /drop <file>.`;
    }
    return null;
  }
}
