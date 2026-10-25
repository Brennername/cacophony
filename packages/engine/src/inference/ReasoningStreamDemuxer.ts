export type DemuxChunkType = "reasoning" | "code";

export interface DemuxChunk {
  readonly type: DemuxChunkType;
  readonly content: string;
}

/**
 * ReasoningStreamDemuxer
 *
 * Statefully parses a streaming token stream emitted by reasoning models (such as
 * DeepSeek R1, Qwen Thinking) to separate <think>...</think> cognitive traces from
 * generated executable source code and markdown artifacts.
 *
 * Accurately handles split tags across arbitrary chunk boundaries and ensures code fences
 * appearing inside thinking blocks are not misinterpreted as executable code.
 */
export class ReasoningStreamDemuxer {
  private inThinkBlock = false;
  private pendingBuffer = "";
  private accumulatedReasoning = "";
  private accumulatedCode = "";

  private static readonly OPEN_TAGS = ["<think>", "<thought>"] as const;
  private static readonly CLOSE_TAGS = ["</think>", "</thought>"] as const;

  /**
   * Feeds the next token/delta from the LLM stream and yields parsed chunks.
   *
   * @param token Next token string emitted by LLM stream
   * @returns Array of demuxed chunks with explicit type ('reasoning' or 'code')
   */
  public feed(token: string): DemuxChunk[] {
    if (!token) return [];
    this.pendingBuffer += token;
    const chunks: DemuxChunk[] = [];

    while (this.pendingBuffer.length > 0) {
      if (!this.inThinkBlock) {
        // Look for opening tag (<think>, <thought>) or orphan closing tag (</think>, </thought>)
        const openMatch = this.findEarliestTag(
          this.pendingBuffer,
          ReasoningStreamDemuxer.OPEN_TAGS,
        );
        const orphanCloseMatch = this.findEarliestTag(
          this.pendingBuffer,
          ReasoningStreamDemuxer.CLOSE_TAGS,
        );

        if (openMatch !== null) {
          // If an orphan closing tag appears before the opening tag, discard the orphan tag
          if (orphanCloseMatch !== null && orphanCloseMatch.index < openMatch.index) {
            const codePart = this.pendingBuffer.slice(0, orphanCloseMatch.index);
            if (codePart.length > 0) {
              this.accumulatedCode += codePart;
              chunks.push({ type: "code", content: codePart });
            }
            this.pendingBuffer = this.pendingBuffer.slice(
              orphanCloseMatch.index + orphanCloseMatch.tag.length,
            );
            continue;
          }

          // Emit any code preceding the open tag
          if (openMatch.index > 0) {
            const codePart = this.pendingBuffer.slice(0, openMatch.index);
            this.accumulatedCode += codePart;
            chunks.push({ type: "code", content: codePart });
          }

          // Advance past opening tag
          this.pendingBuffer = this.pendingBuffer.slice(
            openMatch.index + openMatch.tag.length,
          );
          this.inThinkBlock = true;
        } else if (orphanCloseMatch !== null) {
          // Orphan closing tag without an opening tag: emit code before it and discard orphan tag
          const codePart = this.pendingBuffer.slice(0, orphanCloseMatch.index);
          if (codePart.length > 0) {
            this.accumulatedCode += codePart;
            chunks.push({ type: "code", content: codePart });
          }
          this.pendingBuffer = this.pendingBuffer.slice(
            orphanCloseMatch.index + orphanCloseMatch.tag.length,
          );
        } else {
          // Check if buffer ends with a prefix of opening or closing tags
          const openPrefix = this.getPotentialTagPrefix(
            this.pendingBuffer,
            ReasoningStreamDemuxer.OPEN_TAGS,
          );
          const closePrefix = this.getPotentialTagPrefix(
            this.pendingBuffer,
            ReasoningStreamDemuxer.CLOSE_TAGS,
          );
          const longerPrefix =
            openPrefix.length >= closePrefix.length ? openPrefix : closePrefix;

          if (longerPrefix.length > 0) {
            const emitLen = this.pendingBuffer.length - longerPrefix.length;
            if (emitLen > 0) {
              const codePart = this.pendingBuffer.slice(0, emitLen);
              this.accumulatedCode += codePart;
              chunks.push({ type: "code", content: codePart });
              this.pendingBuffer = longerPrefix;
            }
            break; // Wait for next token to disambiguate tag
          }

          // All pending content is regular code
          this.accumulatedCode += this.pendingBuffer;
          chunks.push({ type: "code", content: this.pendingBuffer });
          this.pendingBuffer = "";
        }
      } else {
        // Look for closing tag
        const closeMatch = this.findEarliestTag(
          this.pendingBuffer,
          ReasoningStreamDemuxer.CLOSE_TAGS,
        );

        if (closeMatch !== null) {
          // Emit reasoning content up to closing tag
          if (closeMatch.index > 0) {
            const thinkPart = this.pendingBuffer.slice(0, closeMatch.index);
            this.accumulatedReasoning += thinkPart;
            chunks.push({ type: "reasoning", content: thinkPart });
          }

          // Advance past closing tag
          this.pendingBuffer = this.pendingBuffer.slice(
            closeMatch.index + closeMatch.tag.length,
          );
          this.inThinkBlock = false;
        } else {
          // Check if buffer ends with a prefix of closing tag
          const closePrefix = this.getPotentialTagPrefix(
            this.pendingBuffer,
            ReasoningStreamDemuxer.CLOSE_TAGS,
          );
          if (closePrefix.length > 0) {
            const emitLen = this.pendingBuffer.length - closePrefix.length;
            if (emitLen > 0) {
              const thinkPart = this.pendingBuffer.slice(0, emitLen);
              this.accumulatedReasoning += thinkPart;
              chunks.push({ type: "reasoning", content: thinkPart });
              this.pendingBuffer = closePrefix;
            }
            break; // Wait for next token
          }

          // All pending content is reasoning
          this.accumulatedReasoning += this.pendingBuffer;
          chunks.push({ type: "reasoning", content: this.pendingBuffer });
          this.pendingBuffer = "";
        }
      }
    }

    return chunks;
  }

  /**
   * Flushes any remaining buffered text when stream closes.
   */
  public flush(): DemuxChunk[] {
    const chunks: DemuxChunk[] = [];
    if (this.pendingBuffer.length > 0) {
      const type: DemuxChunkType = this.inThinkBlock ? "reasoning" : "code";
      if (this.inThinkBlock) {
        this.accumulatedReasoning += this.pendingBuffer;
      } else {
        this.accumulatedCode += this.pendingBuffer;
      }
      chunks.push({ type, content: this.pendingBuffer });
      this.pendingBuffer = "";
    }
    return chunks;
  }

  /**
   * Returns complete accumulated reasoning transcript.
   */
  public getAccumulatedReasoning(): string {
    return this.accumulatedReasoning;
  }

  /**
   * Returns complete accumulated executable/artifact code.
   */
  public getAccumulatedCode(): string {
    return this.accumulatedCode;
  }

  /**
   * Whether currently parsing inside a <think> block.
   */
  public isInsideThinkBlock(): boolean {
    return this.inThinkBlock;
  }

  /**
   * Resets parser state.
   */
  public reset(): void {
    this.inThinkBlock = false;
    this.pendingBuffer = "";
    this.accumulatedReasoning = "";
    this.accumulatedCode = "";
  }

  /**
   * Finds the earliest occurring tag case-insensitively from a list of candidate tags.
   */
  private findEarliestTag(
    str: string,
    tags: readonly string[],
  ): { index: number; tag: string } | null {
    const lower = str.toLowerCase();
    let bestIndex = -1;
    let bestTag = "";
    for (const tag of tags) {
      const idx = lower.indexOf(tag);
      if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
        bestIndex = idx;
        bestTag = tag;
      }
    }
    return bestIndex !== -1 ? { index: bestIndex, tag: bestTag } : null;
  }

  /**
   * Helper detecting if str ends with a non-empty prefix of any candidate tags.
   */
  private getPotentialTagPrefix(
    str: string,
    targetTags: readonly string[],
  ): string {
    const lower = str.toLowerCase();
    let longest = "";
    for (const targetTag of targetTags) {
      const maxPrefixLen = Math.min(str.length, targetTag.length - 1);
      for (let len = maxPrefixLen; len > longest.length; len--) {
        const suffix = lower.slice(-len);
        if (targetTag.startsWith(suffix)) {
          longest = str.slice(-len);
          break;
        }
      }
    }
    return longest;
  }
}
