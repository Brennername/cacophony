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

  private static readonly OPEN_TAG = "<think>";
  private static readonly CLOSE_TAG = "</think>";

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
        // Look for <think> opening tag
        const openIdx = this.pendingBuffer.indexOf(ReasoningStreamDemuxer.OPEN_TAG);

        if (openIdx !== -1) {
          // Emit any code preceding the open tag
          if (openIdx > 0) {
            const codePart = this.pendingBuffer.slice(0, openIdx);
            this.accumulatedCode += codePart;
            chunks.push({ type: "code", content: codePart });
          }

          // Advance past <think>
          this.pendingBuffer = this.pendingBuffer.slice(openIdx + ReasoningStreamDemuxer.OPEN_TAG.length);
          this.inThinkBlock = true;
        } else {
          // Check if buffer ends with a prefix of <think>
          const prefixMatch = this.getPotentialTagPrefix(this.pendingBuffer, ReasoningStreamDemuxer.OPEN_TAG);
          if (prefixMatch.length > 0) {
            const emitLen = this.pendingBuffer.length - prefixMatch.length;
            if (emitLen > 0) {
              const codePart = this.pendingBuffer.slice(0, emitLen);
              this.accumulatedCode += codePart;
              chunks.push({ type: "code", content: codePart });
              this.pendingBuffer = prefixMatch;
            }
            break; // Wait for next token to disambiguate tag
          }

          // All pending content is regular code
          this.accumulatedCode += this.pendingBuffer;
          chunks.push({ type: "code", content: this.pendingBuffer });
          this.pendingBuffer = "";
        }
      } else {
        // Look for </think> closing tag
        const closeIdx = this.pendingBuffer.indexOf(ReasoningStreamDemuxer.CLOSE_TAG);

        if (closeIdx !== -1) {
          // Emit reasoning content up to </think>
          if (closeIdx > 0) {
            const thinkPart = this.pendingBuffer.slice(0, closeIdx);
            this.accumulatedReasoning += thinkPart;
            chunks.push({ type: "reasoning", content: thinkPart });
          }

          // Advance past </think>
          this.pendingBuffer = this.pendingBuffer.slice(closeIdx + ReasoningStreamDemuxer.CLOSE_TAG.length);
          this.inThinkBlock = false;
        } else {
          // Check if buffer ends with a prefix of </think>
          const prefixMatch = this.getPotentialTagPrefix(this.pendingBuffer, ReasoningStreamDemuxer.CLOSE_TAG);
          if (prefixMatch.length > 0) {
            const emitLen = this.pendingBuffer.length - prefixMatch.length;
            if (emitLen > 0) {
              const thinkPart = this.pendingBuffer.slice(0, emitLen);
              this.accumulatedReasoning += thinkPart;
              chunks.push({ type: "reasoning", content: thinkPart });
              this.pendingBuffer = prefixMatch;
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
   * Helper detecting if str ends with a non-empty prefix of targetTag.
   */
  private getPotentialTagPrefix(str: string, targetTag: string): string {
    const maxPrefixLen = Math.min(str.length, targetTag.length - 1);
    for (let len = maxPrefixLen; len > 0; len--) {
      const suffix = str.slice(-len);
      if (targetTag.startsWith(suffix)) {
        return suffix;
      }
    }
    return "";
  }
}
