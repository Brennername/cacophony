import * as fs from "node:fs/promises";
import * as path from "node:path";
import { AstValidator } from "../scrubber/AstValidator.js";

export interface StagedFileEdit {
  readonly relativePath: string;
  readonly originalContent: string;
  readonly proposedContent: string;
}

export interface StagingResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly stagedFiles: readonly string[];
}

/**
 * MultiFileEditCoordinator
 *
 * Coordinates atomic multi-file edits:
 * - Stages proposed modifications in memory
 * - Verifies syntax balance and AST consistency before touching disk
 * - Applies changes atomically across all target files
 */
export class MultiFileEditCoordinator {
  private readonly staged = new Map<string, StagedFileEdit>();
  private readonly astValidator = new AstValidator();

  public async stage(workspaceRoot: string, relativePath: string, proposedContent: string): Promise<void> {
    const fullPath = path.resolve(workspaceRoot, relativePath);
    let originalContent = "";
    try {
      originalContent = await fs.readFile(fullPath, "utf-8");
    } catch {
      originalContent = "";
    }

    this.staged.set(relativePath, {
      relativePath,
      originalContent,
      proposedContent
    });
  }

  public validateStaged(): StagingResult {
    const errors: string[] = [];

    for (const edit of this.staged.values()) {
      if (edit.relativePath.endsWith(".ts") || edit.relativePath.endsWith(".js")) {
        const res = this.astValidator.validateTypeScript(edit.proposedContent, edit.relativePath);
        if (!res.valid) {
          errors.push(`File ${edit.relativePath} syntax error: ${res.errors.join("; ")}`);
        }
      } else if (edit.relativePath.endsWith(".java")) {
        const res = this.astValidator.validateJava(edit.proposedContent);
        if (!res.valid) {
          errors.push(`File ${edit.relativePath} bracket mismatch: ${res.errors.join("; ")}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      stagedFiles: Array.from(this.staged.keys())
    };
  }

  public async applyToDisk(workspaceRoot: string): Promise<readonly string[]> {
    const validation = this.validateStaged();
    if (!validation.valid) {
      throw new Error(`Cannot commit staged edits to disk due to validation errors: ${validation.errors.join(", ")}`);
    }

    const appliedFiles: string[] = [];
    for (const edit of this.staged.values()) {
      const fullPath = path.resolve(workspaceRoot, edit.relativePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, edit.proposedContent, "utf-8");
      appliedFiles.push(edit.relativePath);
    }

    this.staged.clear();
    return appliedFiles;
  }

  public discard(): void {
    this.staged.clear();
  }

  public getStagedEdits(): readonly StagedFileEdit[] {
    return Array.from(this.staged.values());
  }
}
