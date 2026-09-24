import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Workspace isolation configuration options.
 */
export interface WorkspaceIsolationConfig {
  readonly baseWorkspacesDir?: string;
  readonly defaultTtlMs?: number; // Time-to-live before automatic cleanup (default 1 hour)
  readonly maxConcurrentWorkspaces?: number;
}

/**
 * Managed temporary workspace instance.
 */
export interface IsolatedWorkspace {
  readonly workspaceId: string;
  readonly rootPath: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly activeTaskIds: Set<string>;
  readonly isCleanedUp: boolean;
}

/**
 * WorkspaceIsolationManager
 *
 * Manages per-workspace filesystem roots, isolated environments, and permission boundaries.
 * Prevents path collisions and file corruption during concurrent worker task execution.
 */
export class WorkspaceIsolationManager {
  private readonly baseWorkspacesDir: string;
  private readonly defaultTtlMs: number;
  private readonly maxConcurrentWorkspaces: number;
  private readonly workspaces = new Map<string, IsolatedWorkspace>();

  constructor(config: WorkspaceIsolationConfig = {}) {
    this.baseWorkspacesDir = config.baseWorkspacesDir ?? path.join(os.tmpdir(), "cacophony-sandboxes");
    this.defaultTtlMs = config.defaultTtlMs ?? 3600_000;
    this.maxConcurrentWorkspaces = config.maxConcurrentWorkspaces ?? 16;
    fs.mkdirSync(this.baseWorkspacesDir, { recursive: true });
  }

  /**
   * Allocates an isolated filesystem sandbox root for a task or session.
   */
  public allocateWorkspace(workspaceId: string, initialTaskIds: readonly string[] = []): IsolatedWorkspace {
    if (this.workspaces.has(workspaceId)) {
      const existing = this.workspaces.get(workspaceId)!;
      for (const t of initialTaskIds) {
        existing.activeTaskIds.add(t);
      }
      return existing;
    }

    if (this.workspaces.size >= this.maxConcurrentWorkspaces) {
      this.cleanupStaleWorkspaces(0); // aggressive prune
    }

    const rootPath = path.join(this.baseWorkspacesDir, `ws-${workspaceId}`);
    fs.mkdirSync(rootPath, { recursive: true });

    const now = Date.now();
    const ws: IsolatedWorkspace = {
      workspaceId,
      rootPath,
      createdAt: now,
      expiresAt: now + this.defaultTtlMs,
      activeTaskIds: new Set(initialTaskIds),
      isCleanedUp: false
    };

    this.workspaces.set(workspaceId, ws);
    return ws;
  }

  public getWorkspace(workspaceId: string): IsolatedWorkspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  /**
   * Releases an isolated workspace and safely deletes its directory tree.
   */
  public releaseWorkspace(workspaceId: string): boolean {
    const ws = this.workspaces.get(workspaceId);
    if (!ws || ws.isCleanedUp) {
      return false;
    }

    try {
      if (fs.existsSync(ws.rootPath)) {
        fs.rmSync(ws.rootPath, { recursive: true, force: true });
      }
    } catch {
      // Ignore transient cleanup errors
    }

    (ws as { isCleanedUp: boolean }).isCleanedUp = true;
    this.workspaces.delete(workspaceId);
    return true;
  }

  /**
   * Removes workspaces that have exceeded their time-to-live expiration.
   */
  public cleanupStaleWorkspaces(now = Date.now()): number {
    let cleaned = 0;
    for (const [id, ws] of this.workspaces.entries()) {
      if (now >= ws.expiresAt && ws.activeTaskIds.size === 0) {
        if (this.releaseWorkspace(id)) {
          cleaned++;
        }
      }
    }
    return cleaned;
  }

  public getAllActiveWorkspaces(): readonly IsolatedWorkspace[] {
    return Array.from(this.workspaces.values()).filter((w) => !w.isCleanedUp);
  }
}
