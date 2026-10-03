import type { DiffHunk, UnifiedDiff } from "@cacophony/shared-types";

/**
 * Targeted chunk representing line modifications within a specific range.
 */
export interface TargetedChunk {
  readonly oldStartLine: number;
  readonly oldLineCount: number;
  readonly newStartLine: number;
  readonly newLineCount: number;
  readonly oldLines: readonly string[];
  readonly newLines: readonly string[];
}

/**
 * FocusedDiffBuilder
 *
 * Implements targeted diff computation and unified diff generation under SOLID principles.
 * Identifies exact changed lines between original and updated file contents and produces
 * surgical replacement chunks and standard unified diff syntax.
 */
export class FocusedDiffBuilder {
  /**
   * Computes targeted replacement chunks by comparing original and modified code.
   *
   * @param originalContent Content of the original file.
   * @param modifiedContent Content of the modified file.
   * @param contextLines Number of surrounding context lines to include in hunks.
   * @returns Array of targeted change chunks.
   */
  public computeTargetedChunks(
    originalContent: string,
    modifiedContent: string,
    _contextLines = 3
  ): readonly TargetedChunk[] {
    const origLines = originalContent ? originalContent.split("\n") : [];
    const modLines = modifiedContent ? modifiedContent.split("\n") : [];

    if (origLines.length === 0 && modLines.length === 0) {
      return [];
    }

    const chunks: TargetedChunk[] = [];
    let origIdx = 0;
    let modIdx = 0;

    while (origIdx < origLines.length || modIdx < modLines.length) {
      // Advance while lines match
      if (
        origIdx < origLines.length &&
        modIdx < modLines.length &&
        origLines[origIdx] === modLines[modIdx]
      ) {
        origIdx++;
        modIdx++;
        continue;
      }

      // Found difference: locate start of change with context
      const changeOrigStart = origIdx;
      const changeModStart = modIdx;

      // Scan forward to find where lines resynchronize
      let diffOrigEnd = changeOrigStart;
      let diffModEnd = changeModStart;

      let foundSync = false;
      const maxLookahead = 20;

      for (let dist = 1; dist <= maxLookahead && !foundSync; dist++) {
        for (let dO = 0; dO <= dist; dO++) {
          const dM = dist - dO;
          const checkO = changeOrigStart + dO;
          const checkM = changeModStart + dM;
          if (
            checkO < origLines.length &&
            checkM < modLines.length &&
            origLines[checkO] === modLines[checkM]
          ) {
            diffOrigEnd = checkO;
            diffModEnd = checkM;
            foundSync = true;
            break;
          }
        }
      }

      if (!foundSync) {
        diffOrigEnd = origLines.length;
        diffModEnd = modLines.length;
      }

      const chunkOldLines = origLines.slice(changeOrigStart, diffOrigEnd);
      const chunkNewLines = modLines.slice(changeModStart, diffModEnd);

      chunks.push({
        oldStartLine: changeOrigStart + 1,
        oldLineCount: chunkOldLines.length,
        newStartLine: changeModStart + 1,
        newLineCount: chunkNewLines.length,
        oldLines: chunkOldLines,
        newLines: chunkNewLines
      });

      origIdx = diffOrigEnd;
      modIdx = diffModEnd;
    }

    return chunks;
  }

  /**
   * Formats a standard unified diff string for display and git patch application.
   *
   * @param filePath Relative path of the target file.
   * @param originalContent Content before modification.
   * @param modifiedContent Content after modification.
   * @returns Formatted unified diff string.
   */
  public formatUnifiedDiff(
    filePath: string,
    originalContent: string,
    modifiedContent: string
  ): string {
    const origLines = originalContent ? originalContent.split("\n") : [];
    const modLines = modifiedContent ? modifiedContent.split("\n") : [];

    const header = `--- a/${filePath}\n+++ b/${filePath}\n`;

    if (!originalContent) {
      const hunkHeader = `@@ -0,0 +1,${modLines.length} @@\n`;
      return header + hunkHeader + modLines.map((l) => `+${l}`).join("\n") + "\n";
    }

    if (!modifiedContent) {
      const hunkHeader = `@@ -1,${origLines.length} +0,0 @@\n`;
      return header + hunkHeader + origLines.map((l) => `-${l}`).join("\n") + "\n";
    }

    const chunks = this.computeTargetedChunks(originalContent, modifiedContent);
    if (chunks.length === 0) {
      return "";
    }

    const hunksText: string[] = [];
    for (const chunk of chunks) {
      const hunkHeader = `@@ -${chunk.oldStartLine},${chunk.oldLineCount} +${chunk.newStartLine},${chunk.newLineCount} @@`;
      const lines: string[] = [];
      for (const line of chunk.oldLines) {
        lines.push(`-${line}`);
      }
      for (const line of chunk.newLines) {
        lines.push(`+${line}`);
      }
      hunksText.push(`${hunkHeader}\n${lines.join("\n")}`);
    }

    return header + hunksText.join("\n") + "\n";
  }

  /**
   * Constructs a structured UnifiedDiff object with hunks and additions/deletions counts.
   */
  public buildStructuredDiff(
    filePath: string,
    originalContent: string,
    modifiedContent: string
  ): UnifiedDiff {
    const rawDiff = this.formatUnifiedDiff(filePath, originalContent, modifiedContent);
    const chunks = this.computeTargetedChunks(originalContent, modifiedContent);

    let additions = 0;
    let deletions = 0;

    const hunks: DiffHunk[] = chunks.map((c) => {
      deletions += c.oldLineCount;
      additions += c.newLineCount;
      const lines: string[] = [];
      for (const l of c.oldLines) lines.push(`-${l}`);
      for (const l of c.newLines) lines.push(`+${l}`);
      return {
        oldStart: c.oldStartLine,
        oldLines: c.oldLineCount,
        newStart: c.newStartLine,
        newLines: c.newLineCount,
        lines
      };
    });

    return {
      filePath,
      hunks,
      rawDiff,
      additions,
      deletions
    };
  }

  /**
   * Generates line-level diff comparing arrays of lines (convenience method for testing).
   */
  public buildDiff(originalLines: readonly string[], modifiedLines: readonly string[]): readonly string[] {
    const result: string[] = [];
    const max = Math.max(originalLines.length, modifiedLines.length);

    for (let i = 0; i < max; i++) {
      const o = originalLines[i];
      const m = modifiedLines[i];

      if (o === undefined) {
        result.push(`+ ${m}`);
      } else if (m === undefined) {
        result.push(`- ${o}`);
      } else if (o !== m) {
        result.push(`- ${o}`);
        result.push(`+ ${m}`);
      } else {
        result.push(`  ${o}`);
      }
    }

    return result;
  }
}
