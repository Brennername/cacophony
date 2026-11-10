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
  private inCodeFence = false;
  private currentFenceDelimiter: "```" | "'''" | null = null;
  private hasSeenCodeFence = false;
  private isDirectCodeStream: boolean | null = null;
  private pendingBuffer = "";
  private accumulatedReasoning = "";
  private accumulatedCode = "";

  private static readonly OPEN_TAGS = ["<think>", "<thought>"] as const;
  private static readonly CLOSE_TAGS = ["</think>", "</thought>"] as const;
  private static readonly FENCE_DELIMITERS = ["```", "'''"] as const;

  /**
   * Deterministically determines if a string begins with leading comments followed by a code declaration token.
   * Uses linear scanning to bypass nested regex quantifiers, completely eliminating ReDoS risk.
   */
  private static startsWithCodeDeclaration(str: string): boolean {
    let idx = 0;
    const len = str.length;
    while (idx < len) {
      while (idx < len && /\s/.test(str[idx]!)) {
        idx++;
      }
      if (idx >= len) return false;

      if (str[idx] === "/" && str[idx + 1] === "/") {
        const nextNewline = str.indexOf("\n", idx + 2);
        if (nextNewline === -1) return false;
        idx = nextNewline + 1;
        continue;
      }

      if (str[idx] === "/" && str[idx + 1] === "*") {
        const closeComment = str.indexOf("*/", idx + 2);
        if (closeComment === -1) return false;
        idx = closeComment + 2;
        continue;
      }

      break;
    }

    const remainder = str.slice(idx);
    return /^(?:import\s|export\s|class\s|interface\s|type\s|const\s|let\s|var\s|function\s|public\s|private\s|protected\s|async\s|console\b|describe\(|it\(|test\(|beforeEach\(|afterEach\(|beforeAll\(|afterAll\(|#!|def\s|package\s)/.test(
      remainder,
    );
  }

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
      if (this.inThinkBlock) {
        // Look for explicit closing think tag (</think>, </thought>)
        const closeMatch = this.findEarliestTag(
          this.pendingBuffer,
          ReasoningStreamDemuxer.CLOSE_TAGS,
        );

        if (closeMatch !== null) {
          if (closeMatch.index > 0) {
            const thinkPart = this.pendingBuffer.slice(0, closeMatch.index);
            this.emitChunk(thinkPart, "reasoning", chunks);
          }
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
              this.emitChunk(thinkPart, "reasoning", chunks);
              this.pendingBuffer = closePrefix;
            }
            break; // Wait for next token
          }

          this.emitChunk(this.pendingBuffer, "reasoning", chunks);
          this.pendingBuffer = "";
        }
      } else if (this.inCodeFence) {
        // Look for the matching closing fence delimiter (``` or ''')
        const closeIdx = this.pendingBuffer.indexOf(
          this.currentFenceDelimiter!,
        );

        if (closeIdx !== -1) {
          if (closeIdx > 0) {
            const codePart = this.pendingBuffer.slice(0, closeIdx);
            this.emitChunk(codePart, "code", chunks);
          }
          let advanceLen = closeIdx + this.currentFenceDelimiter!.length;
          if (this.pendingBuffer[advanceLen] === "\n") {
            advanceLen++;
          } else if (
            this.pendingBuffer[advanceLen] === "\r" &&
            this.pendingBuffer[advanceLen + 1] === "\n"
          ) {
            advanceLen += 2;
          }
          this.pendingBuffer = this.pendingBuffer.slice(advanceLen);
          this.inCodeFence = false;
          this.currentFenceDelimiter = null;
        } else {
          // Check if buffer ends with a prefix of currentFenceDelimiter
          const delimPrefix = this.getDelimiterPrefix(
            this.pendingBuffer,
            this.currentFenceDelimiter!,
          );
          if (delimPrefix.length > 0) {
            const emitLen = this.pendingBuffer.length - delimPrefix.length;
            if (emitLen > 0) {
              const codePart = this.pendingBuffer.slice(0, emitLen);
              this.emitChunk(codePart, "code", chunks);
              this.pendingBuffer = delimPrefix;
            }
            break; // Wait for next token
          }

          this.emitChunk(this.pendingBuffer, "code", chunks);
          this.pendingBuffer = "";
        }
      } else {
        // Outside both explicit think blocks and code fences
        const openMatch = this.findEarliestTag(
          this.pendingBuffer,
          ReasoningStreamDemuxer.OPEN_TAGS,
        );
        const orphanCloseMatch = this.findEarliestTag(
          this.pendingBuffer,
          ReasoningStreamDemuxer.CLOSE_TAGS,
        );
        const fenceMatch = this.findEarliestFence(this.pendingBuffer);

        // Handle orphan close tag occurring before any open tag or fence
        if (
          orphanCloseMatch !== null &&
          (openMatch === null || orphanCloseMatch.index < openMatch.index) &&
          (fenceMatch === null || orphanCloseMatch.index < fenceMatch.index)
        ) {
          const prePart = this.pendingBuffer.slice(0, orphanCloseMatch.index);
          if (prePart.length > 0) {
            const emitType = this.resolvePendingType(prePart);
            this.emitChunk(prePart, emitType, chunks);
          }
          this.pendingBuffer = this.pendingBuffer.slice(
            orphanCloseMatch.index + orphanCloseMatch.tag.length,
          );
          continue;
        }

        // Handle opening think tag (<think>, <thought>) taking priority over fence if earlier
        if (
          openMatch !== null &&
          (fenceMatch === null || openMatch.index <= fenceMatch.index)
        ) {
          if (openMatch.index > 0) {
            const prePart = this.pendingBuffer.slice(0, openMatch.index);
            const emitType = this.resolvePendingType(prePart);
            this.emitChunk(prePart, emitType, chunks);
          }
          this.pendingBuffer = this.pendingBuffer.slice(
            openMatch.index + openMatch.tag.length,
          );
          this.inThinkBlock = true;
          continue;
        }

        // Handle opening code fence (``` or ''')
        if (fenceMatch !== null) {
          const lineEnd = this.findFenceLineEnd(
            this.pendingBuffer,
            fenceMatch.index + fenceMatch.delimiter.length,
          );

          if (lineEnd === -1) {
            // Newline following fence opening has not arrived yet.
            // Emit any reasoning text preceding fenceMatch, then hold back the fence line.
            if (fenceMatch.index > 0) {
              const prePart = this.pendingBuffer.slice(0, fenceMatch.index);
              const emitType = this.resolvePendingType(prePart);
              this.emitChunk(prePart, emitType, chunks);
              this.pendingBuffer = this.pendingBuffer.slice(fenceMatch.index);
            }
            break; // Wait for next token to complete the fence header line
          }

          if (fenceMatch.index > 0) {
            const prePart = this.pendingBuffer.slice(0, fenceMatch.index);
            const emitType = this.resolvePendingType(prePart);
            this.emitChunk(prePart, emitType, chunks);
          }

          this.pendingBuffer = this.pendingBuffer.slice(lineEnd);
          this.inCodeFence = true;
          this.currentFenceDelimiter = fenceMatch.delimiter;
          this.hasSeenCodeFence = true;
          continue;
        }

        // Check if buffer ends with a prefix of an opening tag, closing tag, or code fence
        const openPrefix = this.getPotentialTagPrefix(
          this.pendingBuffer,
          ReasoningStreamDemuxer.OPEN_TAGS,
        );
        const closePrefix = this.getPotentialTagPrefix(
          this.pendingBuffer,
          ReasoningStreamDemuxer.CLOSE_TAGS,
        );
        const fencePrefix = this.getPotentialFencePrefix(this.pendingBuffer);

        let longestPrefix = "";
        if (openPrefix.length > longestPrefix.length) longestPrefix = openPrefix;
        if (closePrefix.length > longestPrefix.length) longestPrefix = closePrefix;
        if (fencePrefix.length > longestPrefix.length) longestPrefix = fencePrefix;

        if (longestPrefix.length > 0) {
          const emitLen = this.pendingBuffer.length - longestPrefix.length;
          if (emitLen > 0) {
            const prePart = this.pendingBuffer.slice(0, emitLen);
            const emitType = this.resolvePendingType(prePart);
            this.emitChunk(prePart, emitType, chunks);
            this.pendingBuffer = longestPrefix;
          }
          break; // Wait for next token
        }

        // If direct code determination is still pending, buffer short candidate prefixes until space or delimiter
        if (
          this.isDirectCodeStream === null &&
          !this.hasSeenCodeFence &&
          this.pendingBuffer.length < 15 &&
          !/[\s<`']/.test(this.pendingBuffer)
        ) {
          break; // Wait for first word boundary to classify direct code vs conversational prose
        }

        const emitType = this.resolvePendingType(this.pendingBuffer);
        this.emitChunk(this.pendingBuffer, emitType, chunks);
        this.pendingBuffer = "";
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
      let type: DemuxChunkType;
      if (this.inThinkBlock) {
        type = "reasoning";
      } else if (this.inCodeFence) {
        type = "code";
      } else if (this.hasSeenCodeFence) {
        type = "reasoning";
      } else if (this.isDirectCodeStream === true) {
        type = "code";
      } else if (this.isDirectCodeStream === false) {
        type = "reasoning";
      } else {
        type = ReasoningStreamDemuxer.startsWithCodeDeclaration(
          this.pendingBuffer,
        )
          ? "code"
          : "reasoning";
      }

      this.emitChunk(this.pendingBuffer, type, chunks);
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
   * Whether currently parsing inside a code fence block.
   */
  public isInsideCodeFence(): boolean {
    return this.inCodeFence;
  }

  /**
   * Resets parser state.
   */
  public reset(): void {
    this.inThinkBlock = false;
    this.inCodeFence = false;
    this.currentFenceDelimiter = null;
    this.hasSeenCodeFence = false;
    this.isDirectCodeStream = null;
    this.pendingBuffer = "";
    this.accumulatedReasoning = "";
    this.accumulatedCode = "";
  }

  /**
   * Helper emitting content to accumulated records and chunk array.
   */
  private emitChunk(
    content: string,
    type: DemuxChunkType,
    chunks: DemuxChunk[],
  ): void {
    if (!content) return;
    if (type === "reasoning") {
      this.accumulatedReasoning += content;
    } else {
      this.accumulatedCode += content;
    }
    chunks.push({ type, content });
  }

  /**
   * Resolves whether content outside explicit think tags and code fences represents
   * cognitive prose (preamble / postamble) or direct code.
   */
  private resolvePendingType(contentSample?: string): DemuxChunkType {
    if (this.hasSeenCodeFence) {
      return "reasoning";
    }

    if (this.isDirectCodeStream !== null) {
      return this.isDirectCodeStream ? "code" : "reasoning";
    }

    const sample = contentSample || this.pendingBuffer;
    if (ReasoningStreamDemuxer.startsWithCodeDeclaration(sample)) {
      this.isDirectCodeStream = true;
      return "code";
    }

    this.isDirectCodeStream = false;
    return "reasoning";
  }

  /**
   * Finds earliest occurring code fence delimiter (``` or ''') in the string.
   */
  private findEarliestFence(
    str: string,
  ): { index: number; delimiter: "```" | "'''" } | null {
    const idxBacktick = str.indexOf("```");
    const idxQuote = str.indexOf("'''");

    if (idxBacktick === -1 && idxQuote === -1) return null;
    if (idxBacktick !== -1 && (idxQuote === -1 || idxBacktick < idxQuote)) {
      return { index: idxBacktick, delimiter: "```" };
    }
    return { index: idxQuote, delimiter: "'''" };
  }

  /**
   * Finds the index immediately following the newline terminating a fence header line.
   */
  private findFenceLineEnd(str: string, fromIndex: number): number {
    const nlIdx = str.indexOf("\n", fromIndex);
    if (nlIdx === -1) return -1;
    return nlIdx + 1;
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

  /**
   * Returns non-empty prefix of delimiter appearing at the end of str.
   */
  private getDelimiterPrefix(str: string, delimiter: string): string {
    for (let len = delimiter.length - 1; len > 0; len--) {
      const prefix = delimiter.slice(0, len);
      if (str.endsWith(prefix)) {
        return prefix;
      }
    }
    return "";
  }

  /**
   * Helper detecting if str ends with a non-empty prefix of any fence delimiter.
   */
  private getPotentialFencePrefix(str: string): string {
    let longest = "";
    for (const fence of ReasoningStreamDemuxer.FENCE_DELIMITERS) {
      const prefix = this.getDelimiterPrefix(str, fence);
      if (prefix.length > longest.length) {
        longest = prefix;
      }
    }
    return longest;
  }
}
