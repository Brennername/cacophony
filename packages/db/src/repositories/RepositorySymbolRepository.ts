import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export interface RepoSymbolRecord {
  readonly id: string;
  readonly workspace_root: string;
  readonly file_path: string;
  readonly symbol_name: string;
  readonly symbol_kind: string;
  readonly line_start: number;
  readonly line_end: number;
  readonly signature: string;
  readonly pagerank_score: number;
  readonly incoming_refs_count: number;
  readonly file_mtime: number;
  readonly updated_at: string;
}

/**
 * RepositorySymbolRepository
 *
 * Manages database persistence for the AST symbol index, PageRank scores,
 * and incoming reference counts used by RepoMapGenerator.
 */
export class RepositorySymbolRepository {
  constructor(private readonly driver: IDatabaseDriver) {}

  public async upsertSymbols(symbols: readonly Omit<RepoSymbolRecord, "updated_at">[]): Promise<void> {
    if (symbols.length === 0) return;
    const now = new Date().toISOString();

    for (const s of symbols) {
      await this.driver.query(
        `INSERT INTO repository_symbol_graph (
          id, workspace_root, file_path, symbol_name, symbol_kind,
          line_start, line_end, signature, pagerank_score, incoming_refs_count, file_mtime, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          symbol_kind = EXCLUDED.symbol_kind,
          line_start = EXCLUDED.line_start,
          line_end = EXCLUDED.line_end,
          signature = EXCLUDED.signature,
          pagerank_score = EXCLUDED.pagerank_score,
          incoming_refs_count = EXCLUDED.incoming_refs_count,
          file_mtime = EXCLUDED.file_mtime,
          updated_at = EXCLUDED.updated_at`,
        [
          s.id,
          s.workspace_root,
          s.file_path,
          s.symbol_name,
          s.symbol_kind,
          s.line_start,
          s.line_end,
          s.signature,
          s.pagerank_score,
          s.incoming_refs_count,
          s.file_mtime,
          now
        ]
      );
    }
  }

  public async getTopRankedSymbols(workspaceRoot: string, limit = 100): Promise<readonly RepoSymbolRecord[]> {
    return this.driver.query<RepoSymbolRecord>(
      `SELECT * FROM repository_symbol_graph
       WHERE workspace_root = $1
       ORDER BY pagerank_score DESC, incoming_refs_count DESC
       LIMIT $2`,
      [workspaceRoot, limit]
    );
  }

  public async getSymbolsByFile(workspaceRoot: string, filePath: string): Promise<readonly RepoSymbolRecord[]> {
    return this.driver.query<RepoSymbolRecord>(
      `SELECT * FROM repository_symbol_graph
       WHERE workspace_root = $1 AND file_path = $2
       ORDER BY line_start ASC`,
      [workspaceRoot, filePath]
    );
  }

  public async deleteForFile(workspaceRoot: string, filePath: string): Promise<void> {
    await this.driver.query(
      `DELETE FROM repository_symbol_graph WHERE workspace_root = $1 AND file_path = $2`,
      [workspaceRoot, filePath]
    );
  }

  public async clearWorkspace(workspaceRoot: string): Promise<void> {
    await this.driver.query(
      `DELETE FROM repository_symbol_graph WHERE workspace_root = $1`,
      [workspaceRoot]
    );
  }
}
