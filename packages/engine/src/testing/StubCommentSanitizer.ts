import { HashStubGenerator } from "../context/HashStubGenerator.js";

export interface SanitizeResult {
  readonly sanitizedCode: string;
  readonly removedCount: number;
  readonly residualMarkers: readonly string[];
}

/**
 * StubCommentSanitizer
 *
 * Strips all temporary [CACOPHONY_HASH_STUB:*] comment anchors, cage comments,
 * and temporary method scaffolding before code changes are committed to the
 * task worktree or submitted as a Pull Request.
 *
 * This ensures clean, production-ready code devoid of internal generator artifacts.
 */
export class StubCommentSanitizer {
  /**
   * Matches any variation of hash stub comments or cage comments.
   */
  public static readonly STUB_COMMENT_PATTERN = new RegExp(
    `\\/\\*\\s*\\[(?:${HashStubGenerator.STUB_PREFIX}|CACOPHONY_CAGE):[^\\]]+\\]\\s*\\*\\/|\\/\\/\\s*\\[(?:${HashStubGenerator.STUB_PREFIX}|CACOPHONY_CAGE):[^\\]]+\\][^\\r\\n]*`,
    "g"
  );

  /**
   * Matches residual marker tags.
   */
  public static readonly RESIDUAL_MARKER_PATTERN = new RegExp(
    `\\[(?:${HashStubGenerator.STUB_PREFIX}|CACOPHONY_CAGE):[^\\]]+\\]`,
    "g"
  );

  /**
   * Scans source code and detects whether any residual stub markers exist.
   */
  public static hasResidualStubs(sourceCode: string): boolean {
    return this.RESIDUAL_MARKER_PATTERN.test(sourceCode);
  }

  /**
   * Extracts any residual marker tags found in the code.
   */
  public static findResidualMarkers(sourceCode: string): readonly string[] {
    const matches = sourceCode.match(this.RESIDUAL_MARKER_PATTERN);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Sanitizes source code by removing temporary comments, cleaning up whitespace,
   * and ensuring syntactic integrity.
   */
  public static sanitize(sourceCode: string): SanitizeResult {
    let removedCount = 0;
    const markersFound: string[] = [];

    const sanitized = sourceCode.replace(this.STUB_COMMENT_PATTERN, (match) => {
      removedCount++;
      markersFound.push(match.trim());
      return "";
    });

    // Remove any trailing empty lines left by comment stripping
    const lines = sanitized.split("\n");
    const cleanedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      // If line became pure whitespace and was preceded by a blank line, skip extra blank line
      if (line.trim() === "" && cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1]!.trim() === "") {
        continue;
      }
      cleanedLines.push(line);
    }

    const finalCode = cleanedLines.join("\n");
    const remainingResiduals = this.findResidualMarkers(finalCode);

    return {
      sanitizedCode: finalCode,
      removedCount,
      residualMarkers: remainingResiduals,
    };
  }
}
