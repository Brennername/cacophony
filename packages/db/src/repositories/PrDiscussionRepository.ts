import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type {
  PrDiscussionComment,
  PrDiscussionThread,
  AdvisoryDomainTag,
} from "@cacophony/shared-types";

interface PrDiscussionRow {
  readonly id: number;
  readonly task_id: string;
  readonly pr_index: number;
  readonly thread_id: string;
  readonly author_name: string;
  readonly author_role: string;
  readonly domain_tag: string;
  readonly file_path: string | null;
  readonly line_number: number | null;
  readonly body_content: string;
  readonly is_resolved: boolean | number;
  readonly created_at: string;
  readonly updated_at: string | null;
}

/**
 * Repository managing persistence, retrieval, and resolution tracking
 * of Pull Request discussion threads and multi-model advisory reviews.
 */
export class PrDiscussionRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Persists an individual discussion comment or model advisory review note.
   */
  public async recordComment(
    comment: Omit<PrDiscussionComment, "id" | "createdAt"> & {
      readonly createdAt?: string | undefined;
    },
  ): Promise<PrDiscussionComment> {
    const createdAt = comment.createdAt || new Date().toISOString();
    const threadId =
      comment.threadId ||
      `th_${comment.taskId}_${comment.filePath || "general"}_${comment.lineNumber || 0}`;

    if (this.driver.getDialect() === "postgres") {
      const row = await this.driver.queryOne<{ id: number }>(
        `INSERT INTO pr_discussion_threads (
          task_id, pr_index, thread_id, author_name, author_role, domain_tag,
          file_path, line_number, body_content, is_resolved, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          comment.taskId,
          comment.prIndex,
          threadId,
          comment.authorName,
          comment.authorRole,
          comment.domainTag,
          comment.filePath || null,
          comment.lineNumber || null,
          comment.bodyContent,
          comment.isResolved ? true : false,
          createdAt,
        ],
      );

      return {
        id: Number(row?.id),
        taskId: comment.taskId,
        prIndex: comment.prIndex,
        threadId,
        authorName: comment.authorName,
        authorRole: comment.authorRole,
        domainTag: comment.domainTag as AdvisoryDomainTag,
        filePath: comment.filePath,
        lineNumber: comment.lineNumber,
        bodyContent: comment.bodyContent,
        isResolved: comment.isResolved,
        createdAt,
      };
    }

    await this.driver.execute(
      `INSERT INTO pr_discussion_threads (
        task_id, pr_index, thread_id, author_name, author_role, domain_tag,
        file_path, line_number, body_content, is_resolved, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        comment.taskId,
        comment.prIndex,
        threadId,
        comment.authorName,
        comment.authorRole,
        comment.domainTag,
        comment.filePath || null,
        comment.lineNumber || null,
        comment.bodyContent,
        comment.isResolved ? 1 : 0,
        createdAt,
      ],
    );

    const row = await this.driver.queryOne<{ id: number }>(
      "SELECT last_insert_rowid() AS id",
    );

    return {
      id: Number(row?.id),
      taskId: comment.taskId,
      prIndex: comment.prIndex,
      threadId,
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      domainTag: comment.domainTag as AdvisoryDomainTag,
      filePath: comment.filePath,
      lineNumber: comment.lineNumber,
      bodyContent: comment.bodyContent,
      isResolved: comment.isResolved,
      createdAt,
    };
  }

  /**
   * Retrieves all discussion comments associated with a task ID.
   */
  public async getCommentsByTaskId(
    taskId: string,
  ): Promise<PrDiscussionComment[]> {
    const rows = await this.driver.query<PrDiscussionRow>(
      "SELECT * FROM pr_discussion_threads WHERE task_id = $1 ORDER BY created_at ASC",
      [taskId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Retrieves all discussion comments associated with a Gitea PR index.
   */
  public async getCommentsByPrIndex(
    prIndex: number,
  ): Promise<PrDiscussionComment[]> {
    const rows = await this.driver.query<PrDiscussionRow>(
      "SELECT * FROM pr_discussion_threads WHERE pr_index = $1 ORDER BY created_at ASC",
      [prIndex],
    );
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Retrieves discussion threads grouped by threadId for a specific task.
   */
  public async getThreadsByTaskId(
    taskId: string,
  ): Promise<PrDiscussionThread[]> {
    const comments = await this.getCommentsByTaskId(taskId);
    return this.groupCommentsIntoThreads(comments);
  }

  /**
   * Retrieves discussion threads grouped by threadId for a specific PR index.
   */
  public async getThreadsByPrIndex(
    prIndex: number,
  ): Promise<PrDiscussionThread[]> {
    const comments = await this.getCommentsByPrIndex(prIndex);
    return this.groupCommentsIntoThreads(comments);
  }

  /**
   * Marks all comments in a discussion thread as resolved.
   */
  public async resolveThread(threadId: string): Promise<void> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const resolvedVal = isPostgres ? true : 1;
    const now = new Date().toISOString();

    await this.driver.execute(
      "UPDATE pr_discussion_threads SET is_resolved = $1, updated_at = $2 WHERE thread_id = $3",
      [resolvedVal, now, threadId],
    );
  }

  /**
   * Counts unresolved blocker comments for a task.
   */
  public async countUnresolvedBlockers(taskId: string): Promise<number> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const unres = isPostgres ? false : 0;
    const rows = await this.driver.query<{ count: number | string }>(
      "SELECT COUNT(*) AS count FROM pr_discussion_threads WHERE task_id = $1 AND is_resolved = $2",
      [taskId, unres],
    );
    return Number(rows[0]?.count ?? 0);
  }

  private mapRow(row: PrDiscussionRow): PrDiscussionComment {
    return {
      id: Number(row.id),
      taskId: row.task_id,
      prIndex: Number(row.pr_index),
      threadId: row.thread_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      domainTag: row.domain_tag as AdvisoryDomainTag,
      filePath: row.file_path,
      lineNumber: row.line_number != null ? Number(row.line_number) : undefined,
      bodyContent: row.body_content,
      isResolved: Boolean(row.is_resolved),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private groupCommentsIntoThreads(
    comments: PrDiscussionComment[],
  ): PrDiscussionThread[] {
    const threadMap = new Map<string, PrDiscussionComment[]>();

    for (const comment of comments) {
      const threadId = comment.threadId || `th_${comment.id}`;
      const existing = threadMap.get(threadId);
      if (existing) {
        existing.push(comment);
      } else {
        threadMap.set(threadId, [comment]);
      }
    }

    const threads: PrDiscussionThread[] = [];
    for (const [threadId, threadComments] of threadMap.entries()) {
      const first = threadComments[0]!;
      const isResolved = threadComments.every((c) => c.isResolved);
      threads.push({
        threadId,
        filePath: first.filePath,
        lineNumber: first.lineNumber,
        isResolved,
        comments: threadComments,
      });
    }

    return threads;
  }
}
