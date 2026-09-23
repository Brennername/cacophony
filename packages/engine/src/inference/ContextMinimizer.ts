import * as fs from "node:fs";
import * as path from "node:path";

export interface ContextBundle {
  readonly prompt: string;
  readonly fileContents: ReadonlyMap<string, string>;
  readonly compactFileTree: string;
  readonly assembledPrompt: string;
}

/**
 * ContextMinimizer
 *
 * Implements Context Minimization and Scoping from the Technical Design Document:
 * 1. Targeted File Injection: Restricts prompt payload strictly to task instructions,
 *    immediate target file dependencies, and a compact directory tree map.
 * 2. Isolation: Assembles scoped context strictly within designated task boundaries
 *    without leaking unrelated workspace context.
 */
export class ContextMinimizer {
  private readonly projectDir: string;
  private readonly maxFileSizeBytes: number;

  constructor(projectDir: string = process.cwd(), maxFileSizeBytes = 65536) {
    this.projectDir = projectDir;
    this.maxFileSizeBytes = maxFileSizeBytes;
  }

  /**
   * Assembles a minimal, scoped context bundle for a task.
   */
  public assembleContext(
    prompt: string,
    focusFiles: readonly string[],
    customDirectives: readonly string[] = []
  ): ContextBundle {
    const fileContents = new Map<string, string>();

    // 1. Read immediate focus files
    for (const relPath of focusFiles) {
      const fullPath = path.resolve(this.projectDir, relPath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.size <= this.maxFileSizeBytes) {
            const content = fs.readFileSync(fullPath, "utf-8");
            fileContents.set(relPath, content);
          } else {
            fileContents.set(relPath, `[File exceeds size limit: ${stat.size} bytes]`);
          }
        } catch {
          // Ignore unreadable files
        }
      }
    }

    // 2. Build compact directory tree map (top 2 levels only)
    const compactFileTree = this.buildCompactTree();

    // 3. Assemble complete prompt payload
    const sections: string[] = [
      "=== TASK OBJECTIVE ===",
      prompt,
      "",
      "=== WORKSPACE OVERVIEW ===",
      compactFileTree
    ];

    if (customDirectives.length > 0) {
      sections.push("", "=== DIRECTIVES ===");
      for (const d of customDirectives) {
        sections.push(`- ${d}`);
      }
    }

    if (fileContents.size > 0) {
      sections.push("", "=== TARGET FILE CONTEXT ===");
      for (const [filePath, content] of fileContents.entries()) {
        const ext = path.extname(filePath).replace(/^\./, "") || "text";
        sections.push(`--- File: ${filePath} ---`);
        sections.push(`\`\`\`${ext}\n${content}\n\`\`\``);
      }
    }

    const assembledPrompt = sections.join("\n");

    return {
      prompt,
      fileContents,
      compactFileTree,
      assembledPrompt
    };
  }

  /**
   * Generates a concise directory map up to 2 directory levels.
   */
  private buildCompactTree(depth = 2): string {
    const lines: string[] = [];

    const walk = (currentDir: string, currentDepth: number, prefix: string) => {
      if (currentDepth > depth) return;
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        const visible = entries.filter((e) => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "dist");

        for (const entry of visible) {
          if (entry.isDirectory()) {
            lines.push(`${prefix}${entry.name}/`);
            walk(path.join(currentDir, entry.name), currentDepth + 1, `${prefix}  `);
          } else {
            lines.push(`${prefix}${entry.name}`);
          }
        }
      } catch {
        // Ignore unreadable dirs
      }
    };

    walk(this.projectDir, 1, "");
    return lines.slice(0, 50).join("\n") || "(empty workspace)";
  }
}
