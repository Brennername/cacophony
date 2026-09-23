import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export interface LspDiagnosticRecord {
  readonly id: string;
  readonly task_id: string | null;
  readonly uri: string;
  readonly line: number;
  readonly character: number;
  readonly severity: string;
  readonly code: string | null;
  readonly source: string;
  readonly message: string;
  readonly created_at: string;
}

/**
 * Repository for managing persisted LSP diagnostic snapshots.
 */
export class LspDiagnosticRepository {
  constructor(private readonly driver: IDatabaseDriver) {}

  public async insert(record: Omit<LspDiagnosticRecord, "created_at">): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.query(
      `INSERT INTO lsp_diagnostic_snapshots (id, task_id, uri, line, character, severity, code, source, message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        record.id,
        record.task_id,
        record.uri,
        record.line,
        record.character,
        record.severity,
        record.code,
        record.source,
        record.message,
        now
      ]
    );
  }

  public async getByTaskId(taskId: string): Promise<readonly LspDiagnosticRecord[]> {
    return this.driver.query<LspDiagnosticRecord>(
      `SELECT * FROM lsp_diagnostic_snapshots WHERE task_id = $1 ORDER BY line ASC`,
      [taskId]
    );
  }

  public async getByUri(uri: string): Promise<readonly LspDiagnosticRecord[]> {
    return this.driver.query<LspDiagnosticRecord>(
      `SELECT * FROM lsp_diagnostic_snapshots WHERE uri = $1 ORDER BY line ASC`,
      [uri]
    );
  }
}
