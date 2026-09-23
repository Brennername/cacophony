import type { ChatMessage } from "@cacophony/shared-types";

export interface CompactionConfig {
  readonly maxContextTokens: number;
  readonly warningThresholdRatio?: number; // default: 0.70 (70%)
  readonly compactionThresholdRatio?: number; // default: 0.85 (85%)
  readonly preserveRecentTurns?: number; // default: 4
}

export interface CompactionResult {
  readonly compacted: boolean;
  readonly preTokens: number;
  readonly postTokens: number;
  readonly tokenSavings: number;
  readonly summary: string;
  readonly messages: readonly ChatMessage[];
}

/**
 * SessionCompactor
 *
 * Implements auto-compacting conversation sessions:
 * - Tracks cumulative tokens against context boundaries
 * - Triggers background summarization near context limits (default 85%)
 * - Preserves system directives and recent active turns while condensing historical dialogue
 */
export class SessionCompactor {
  private readonly config: CompactionConfig;

  constructor(config: CompactionConfig) {
    this.config = {
      ...config,
      warningThresholdRatio: config.warningThresholdRatio ?? 0.70,
      compactionThresholdRatio: config.compactionThresholdRatio ?? 0.85,
      preserveRecentTurns: config.preserveRecentTurns ?? 4
    };
  }

  /**
   * Evaluates if session tokens exceed compaction threshold.
   */
  public shouldCompact(currentTokens: number): boolean {
    const threshold = this.config.maxContextTokens * (this.config.compactionThresholdRatio ?? 0.85);
    return currentTokens >= threshold;
  }

  /**
   * Compacts conversation turns when context budget is exceeded.
   */
  public compact(messages: readonly ChatMessage[]): CompactionResult {
    const initialTokens = this.estimateTokens(messages);
    if (!this.shouldCompact(initialTokens) || messages.length <= (this.config.preserveRecentTurns ?? 4) + 1) {
      return {
        compacted: false,
        preTokens: initialTokens,
        postTokens: initialTokens,
        tokenSavings: 0,
        summary: "",
        messages
      };
    }

    // Preserve system messages at the head
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const preserveCount = this.config.preserveRecentTurns ?? 4;
    const splitIndex = Math.max(0, nonSystemMessages.length - preserveCount);

    const messagesToSummarize = nonSystemMessages.slice(0, splitIndex);
    const recentMessages = nonSystemMessages.slice(splitIndex);

    // Generate hierarchical summary
    const summary = this.buildHierarchicalSummary(messagesToSummarize);

    const compactedMessages: ChatMessage[] = [
      ...systemMessages,
      {
        role: "user",
        content: `[SESSION COMPACTION SUMMARY - PAST TURNS CONDENSED]:\n${summary}`
      },
      {
        role: "assistant",
        content: "Understood. I have absorbed the conversation context and will proceed from the active state."
      },
      ...recentMessages
    ];

    const postTokens = this.estimateTokens(compactedMessages);
    const tokenSavings = Math.max(0, initialTokens - postTokens);

    return {
      compacted: true,
      preTokens: initialTokens,
      postTokens,
      tokenSavings,
      summary,
      messages: compactedMessages
    };
  }

  /**
   * Approximates token count (4 chars ~ 1 token heuristic).
   */
  public estimateTokens(messages: readonly ChatMessage[]): number {
    let charCount = 0;
    for (const msg of messages) {
      charCount += msg.content.length + (msg.name?.length || 0) + 10;
    }
    return Math.ceil(charCount / 4);
  }

  private buildHierarchicalSummary(turns: readonly ChatMessage[]): string {
    const summaryLines: string[] = [];
    const modifiedFiles = new Set<string>();

    const userGoals: string[] = [];
    for (const turn of turns) {
      const fileMatches = turn.content.matchAll(/(?:file|path|src|packages)\/[\w\-./]+\.\w+/g);
      for (const match of fileMatches) {
        modifiedFiles.add(match[0]);
      }
      if (turn.role === "user" && turn.content.length > 0) {
        const preview = turn.content.split("\n")[0]?.slice(0, 60) || "";
        userGoals.push(preview);
      }
    }

    if (userGoals.length > 0) {
      summaryLines.push(`- Goals covered: ${userGoals.slice(0, 3).join("; ")}`);
    }
    if (modifiedFiles.size > 0) {
      summaryLines.push(`- Targeted files: ${Array.from(modifiedFiles).slice(0, 3).join(", ")}`);
    }

    return summaryLines.join("\n") || "- Historical steps completed.";
  }
}
