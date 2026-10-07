import crypto from "node:crypto";

export interface HashStubAnchor {
  readonly hash: string;
  readonly methodName: string;
  readonly commentTag: string;
  readonly lineNumber?: number | undefined;
}

/**
 * HashStubGenerator
 *
 * Produces deterministic, collision-free hash-stub comments and scaffolding
 * for the two-pass code generation architecture:
 * Pass 1: Architect outputs file structure with hash-anchored method stubs.
 * Pass 2: Implementer receives method context and generates only method bodies.
 */
export class HashStubGenerator {
  public static readonly STUB_PREFIX = "CACOPHONY_HASH_STUB";
  public static readonly STUB_REGEX = /\/\*\s*\[CACOPHONY_HASH_STUB:([a-f0-9]{8}):([a-zA-Z0-9_$]+)\]\s*\*\//g;

  /**
   * Generates an 8-character deterministic hex hash for a file and method.
   */
  public static generateHash(filePath: string, methodName: string): string {
    return crypto
      .createHash("sha256")
      .update(`${filePath}:${methodName}`)
      .digest("hex")
      .slice(0, 8);
  }

  /**
   * Creates the standard comment anchor string.
   */
  public static createStubComment(filePath: string, methodName: string): string {
    const hash = this.generateHash(filePath, methodName);
    return `/* [${this.STUB_PREFIX}:${hash}:${methodName}] */`;
  }

  /**
   * Creates a complete stubbed method skeleton with hash anchor.
   */
  public static createStubbedMethod(
    methodName: string,
    signature: string,
    filePath: string,
    fallbackReturn = "throw new Error('Method not implemented.');"
  ): string {
    const comment = this.createStubComment(filePath, methodName);
    return `  public ${signature} {\n    ${comment}\n    ${fallbackReturn}\n  }`;
  }

  /**
   * Extracts all hash-stub anchors present in a source code string.
   */
  public static extractStubs(sourceCode: string): readonly HashStubAnchor[] {
    const stubs: HashStubAnchor[] = [];
    const lines = sourceCode.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";
      const matches = line.matchAll(
        new RegExp(this.STUB_REGEX.source, "g")
      );
      for (const match of matches) {
        const hash = match[1] || "";
        const methodName = match[2] || "";
        stubs.push({
          hash,
          methodName,
          commentTag: match[0],
          lineNumber: i + 1,
        });
      }
    }

    return stubs;
  }
}
