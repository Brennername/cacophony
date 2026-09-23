import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export interface SessionRecord {
  readonly id: string;
  readonly title: string;
  readonly branch: string;
  readonly active_model: string;
  readonly total_tokens: number;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface SessionMessageRecord {
  readonly id: string;
  readonly session_id: string;
  readonly role: string;
  readonly content: string;
  readonly tool_calls_json: string;
  readonly tool_results_json: string;
  readonly token_count: number;
  readonly importance_score: number;
  readonly created_at: string;
}

export interface SessionTabRecord {
  readonly id: string;
  readonly session_id: string;
  readonly tab_name: string;
  readonly active_file: string | null;
  readonly cursor_position: number;
  readonly order_index: number;
  readonly created_at: string;
}

export interface SessionCompactionRecord {
  readonly id: string;
  readonly session_id: string;
  readonly pre_compaction_tokens: number;
  readonly post_compaction_tokens: number;
  readonly summary_text: string;
  readonly preserved_turns_count: number;
  readonly created_at: string;
}

export class SessionRepository {
  constructor(private readonly driver: IDatabaseDriver) {}

  public async createSession(record: Omit<SessionRecord, "created_at" | "updated_at">): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.query(
      `INSERT INTO sessions (id, title, branch, active_model, total_tokens, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [record.id, record.title, record.branch, record.active_model, record.total_tokens, record.status, now, now]
    );
  }

  public async getSession(id: string): Promise<SessionRecord | undefined> {
    const rows = await this.driver.query<SessionRecord>(
      `SELECT * FROM sessions WHERE id = $1`,
      [id]
    );
    return rows[0];
  }

  public async listSessions(branch?: string): Promise<readonly SessionRecord[]> {
    if (branch) {
      return this.driver.query<SessionRecord>(
        `SELECT * FROM sessions WHERE branch = $1 ORDER BY updated_at DESC`,
        [branch]
      );
    }
    return this.driver.query<SessionRecord>(
      `SELECT * FROM sessions ORDER BY updated_at DESC`
    );
  }

  public async updateSessionTokens(id: string, totalTokens: number): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.execute(
      `UPDATE sessions SET total_tokens = $1, updated_at = $2 WHERE id = $3`,
      [totalTokens, now, id]
    );
  }

  public async addMessage(message: Omit<SessionMessageRecord, "created_at">): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.query(
      `INSERT INTO session_messages (
        id, session_id, role, content, tool_calls_json, tool_results_json,
        token_count, importance_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        message.id,
        message.session_id,
        message.role,
        message.content,
        message.tool_calls_json,
        message.tool_results_json,
        message.token_count,
        message.importance_score,
        now
      ]
    );
  }

  public async getMessages(sessionId: string): Promise<readonly SessionMessageRecord[]> {
    return this.driver.query<SessionMessageRecord>(
      `SELECT * FROM session_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );
  }

  public async replaceMessages(sessionId: string, newMessages: readonly Omit<SessionMessageRecord, "created_at">[]): Promise<void> {
    await this.driver.transaction(async (tx) => {
      await tx.execute(`DELETE FROM session_messages WHERE session_id = $1`, [sessionId]);
      for (const m of newMessages) {
        const now = new Date().toISOString();
        await tx.execute(
          `INSERT INTO session_messages (
            id, session_id, role, content, tool_calls_json, tool_results_json,
            token_count, importance_score, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            m.id,
            m.session_id,
            m.role,
            m.content,
            m.tool_calls_json,
            m.tool_results_json,
            m.token_count,
            m.importance_score,
            now
          ]
        );
      }
    });
  }

  public async createTab(tab: Omit<SessionTabRecord, "created_at">): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.query(
      `INSERT INTO session_tabs (id, session_id, tab_name, active_file, cursor_position, order_index, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tab.id, tab.session_id, tab.tab_name, tab.active_file, tab.cursor_position, tab.order_index, now]
    );
  }

  public async listTabs(sessionId: string): Promise<readonly SessionTabRecord[]> {
    return this.driver.query<SessionTabRecord>(
      `SELECT * FROM session_tabs WHERE session_id = $1 ORDER BY order_index ASC`,
      [sessionId]
    );
  }

  public async recordCompaction(record: Omit<SessionCompactionRecord, "created_at">): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.query(
      `INSERT INTO session_compaction_history (
        id, session_id, pre_compaction_tokens, post_compaction_tokens, summary_text,
        preserved_turns_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        record.id,
        record.session_id,
        record.pre_compaction_tokens,
        record.post_compaction_tokens,
        record.summary_text,
        record.preserved_turns_count,
        now
      ]
    );
  }

  public async searchMessages(query: string): Promise<readonly SessionMessageRecord[]> {
    const searchPattern = `%${query}%`;
    return this.driver.query<SessionMessageRecord>(
      `SELECT * FROM session_messages WHERE content LIKE $1 ORDER BY created_at DESC LIMIT 50`,
      [searchPattern]
    );
  }
}
