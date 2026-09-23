import type { SessionRepository, SessionRecord, SessionMessageRecord, SessionTabRecord } from "@cacophony/db";
import type { ChatMessage } from "@cacophony/shared-types";
import { SessionCompactor } from "./SessionCompactor.js";

export interface ActiveSessionContext {
  readonly session: SessionRecord;
  readonly messages: readonly ChatMessage[];
  readonly tabs: readonly SessionTabRecord[];
}

export interface SessionManagerOptions {
  readonly maxContextTokens?: number | undefined;
  readonly defaultModel?: string | undefined;
  readonly defaultBranch?: string | undefined;
}

/**
 * SessionManager
 *
 * Coordinates multi-tab persistent sessions:
 * - Creates, resumes, forks, and searches sessions
 * - Auto-compacts conversation history when token limits approach threshold
 * - Binds sessions to git branches
 */
export class SessionManager {
  private readonly compactor: SessionCompactor;
  private readonly defaultModel: string;
  private readonly defaultBranch: string;

  constructor(
    private readonly repository: SessionRepository,
    options: SessionManagerOptions = {}
  ) {
    const maxTokens = options.maxContextTokens ?? 8192;
    this.defaultModel = options.defaultModel ?? "qwen2.5-coder:7b";
    this.defaultBranch = options.defaultBranch ?? "master";
    this.compactor = new SessionCompactor({ maxContextTokens: maxTokens });
  }

  public async createSession(
    title: string,
    options?: { branch?: string | undefined; activeModel?: string | undefined } | undefined
  ): Promise<SessionRecord> {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const branch = options?.branch ?? this.defaultBranch;
    const activeModel = options?.activeModel ?? this.defaultModel;

    const record: Omit<SessionRecord, "created_at" | "updated_at"> = {
      id,
      title,
      branch,
      active_model: activeModel,
      total_tokens: 0,
      status: "ACTIVE"
    };

    await this.repository.createSession(record);
    await this.repository.createTab({
      id: `tab-${id}-1`,
      session_id: id,
      tab_name: "Main",
      active_file: null,
      cursor_position: 0,
      order_index: 0
    });

    return (await this.repository.getSession(id))!;
  }

  public async getSessionContext(sessionId: string): Promise<ActiveSessionContext | undefined> {
    const session = await this.repository.getSession(sessionId);
    if (!session) return undefined;

    const messages = await this.repository.getMessages(sessionId);
    const tabs = await this.repository.listTabs(sessionId);

    const chatMessages: ChatMessage[] = messages.map((m) => ({
      role: m.role as ChatMessage["role"],
      content: m.content
    }));

    return {
      session,
      messages: chatMessages,
      tabs
    };
  }

  public async appendTurn(sessionId: string, userPrompt: string, assistantResponse: string): Promise<void> {
    const session = await this.repository.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found`);

    const userMsgId = `msg-${Date.now()}-u`;
    const userTokens = Math.ceil(userPrompt.length / 4);
    await this.repository.addMessage({
      id: userMsgId,
      session_id: sessionId,
      role: "user",
      content: userPrompt,
      tool_calls_json: "[]",
      tool_results_json: "[]",
      token_count: userTokens,
      importance_score: 1.0
    });

    const assistantMsgId = `msg-${Date.now()}-a`;
    const assistantTokens = Math.ceil(assistantResponse.length / 4);
    await this.repository.addMessage({
      id: assistantMsgId,
      session_id: sessionId,
      role: "assistant",
      content: assistantResponse,
      tool_calls_json: "[]",
      tool_results_json: "[]",
      token_count: assistantTokens,
      importance_score: 1.0
    });

    // Check compaction
    const allMessages = await this.repository.getMessages(sessionId);
    const chatMessages: ChatMessage[] = allMessages.map((m) => ({
      role: m.role as ChatMessage["role"],
      content: m.content
    }));

    const compaction = this.compactor.compact(chatMessages);
    if (compaction.compacted) {
      // Record compaction snapshot
      await this.repository.recordCompaction({
        id: `comp-${Date.now()}`,
        session_id: sessionId,
        pre_compaction_tokens: compaction.preTokens,
        post_compaction_tokens: compaction.postTokens,
        summary_text: compaction.summary,
        preserved_turns_count: 4
      });

      // Update persisted messages with compacted turns
      const newRecords: Omit<SessionMessageRecord, "created_at">[] = compaction.messages.map((m, idx) => ({
        id: `comp-msg-${sessionId}-${idx}`,
        session_id: sessionId,
        role: m.role,
        content: m.content,
        tool_calls_json: "[]",
        tool_results_json: "[]",
        token_count: Math.ceil(m.content.length / 4),
        importance_score: m.role === "system" ? 2.0 : 1.0
      }));

      await this.repository.replaceMessages(sessionId, newRecords);
      await this.repository.updateSessionTokens(sessionId, compaction.postTokens);
    } else {
      const updatedTotal = session.total_tokens + userTokens + assistantTokens;
      await this.repository.updateSessionTokens(sessionId, updatedTotal);
    }
  }

  public async listSessions(branch?: string): Promise<readonly SessionRecord[]> {
    return this.repository.listSessions(branch);
  }

  public async searchHistory(query: string): Promise<readonly SessionMessageRecord[]> {
    return this.repository.searchMessages(query);
  }
}
