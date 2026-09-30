import * as fs from "node:fs";
import * as path from "node:path";
import { AstContextSlicer } from "../context/AstContextSlicer.js";
import { PromptCompressor } from "./PromptCompressor.js";

export interface ContextBundle {
  readonly prompt: string;
  readonly fileContents: ReadonlyMap<string, string>;
  readonly dependencySkeletons?: ReadonlyMap<string, string> | undefined;
  readonly compactFileTree: string;
  readonly assembledPrompt: string;
  readonly tokenSavingsEstimate?: {
    readonly originalBytes: number;
    readonly minimizedBytes: number;
    readonly savingsPercent: number;
    readonly compressionRatio?: number | undefined;
  } | undefined;
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
  private readonly slicer: AstContextSlicer;
  private readonly compressor: PromptCompressor;

  constructor(projectDir: string = process.cwd(), maxFileSizeBytes = 65536) {
    this.projectDir = projectDir;
    this.maxFileSizeBytes = maxFileSizeBytes;
    this.slicer = new AstContextSlicer(projectDir);
    this.compressor = new PromptCompressor();
  }

  /**
   * Assembles a minimal, scoped context bundle for a task.
   * If enableAstSlicing is true, parses imports from primary focus files and injects
   * lightweight type skeletons for referenced secondary dependencies instead of full files.
   * If compressPrompt is true, strips non-essential comments and collapses whitespace.
   */
  public assembleContext(
    prompt: string,
    focusFiles: readonly string[],
    customDirectives: readonly string[] = [],
    enableAstSlicing = true,
    compressPrompt = true
  ): ContextBundle {
    const fileContents = new Map<string, string>();
    const dependencySkeletons = new Map<string, string>();
    let originalDepBytes = 0;
    let skeletonDepBytes = 0;

    // 1. Read immediate focus files
    for (const relPath of focusFiles) {
      const fullPath = path.resolve(this.projectDir, relPath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.size <= this.maxFileSizeBytes) {
            let content = fs.readFileSync(fullPath, "utf-8");
            if (compressPrompt && (relPath.endsWith(".ts") || relPath.endsWith(".js") || relPath.endsWith(".tsx"))) {
              content = this.compressor.compress(content, true).compressed;
            }
            fileContents.set(relPath, content);
          } else {
            fileContents.set(relPath, `[File exceeds size limit: ${stat.size} bytes]`);
          }
        } catch {
          // Ignore unreadable files
        }
      }
    }

    // 2. Perform AST dependency slicing on referenced internal modules
    if (enableAstSlicing) {
      const referencedSymbolsByModule = new Map<string, Set<string>>();

      for (const [focusPath, content] of fileContents.entries()) {
        if (focusPath.endsWith(".ts") || focusPath.endsWith(".tsx")) {
          const imported = this.slicer.extractImportedSymbols(content, focusPath);
          const focusDir = path.dirname(path.resolve(this.projectDir, focusPath));

          for (const imp of imported) {
            if (imp.moduleSpecifier.startsWith(".")) {
              // Relative local import
              const resolvedRelNoExt = imp.moduleSpecifier.replace(/\.js$/, "");
              let candidatePath = path.resolve(focusDir, `${resolvedRelNoExt}.ts`);
              if (!fs.existsSync(candidatePath)) {
                candidatePath = path.resolve(focusDir, `${resolvedRelNoExt}/index.ts`);
              }

              if (fs.existsSync(candidatePath)) {
                const relCandidate = path.relative(this.projectDir, candidatePath);
                // Only slice secondary dependencies not already in primary focus files
                if (!fileContents.has(relCandidate)) {
                  if (!referencedSymbolsByModule.has(candidatePath)) {
                    referencedSymbolsByModule.set(candidatePath, new Set());
                  }
                  referencedSymbolsByModule.get(candidatePath)!.add(imp.importedName);
                }
              }
            }
          }
        }
      }

      for (const [depPath, symbolSet] of referencedSymbolsByModule.entries()) {
        try {
          const depContent = fs.readFileSync(depPath, "utf-8");
          originalDepBytes += depContent.length;
          const relDep = path.relative(this.projectDir, depPath);
          const symbols = Array.from(symbolSet);
          const sliced = this.slicer.generateTypeSkeleton(depContent, symbols, relDep);
          skeletonDepBytes += sliced.skeletonContent.length;
          dependencySkeletons.set(relDep, sliced.skeletonContent);
        } catch {
          // Ignore unreadable dependency
        }
      }
    }

    // 3. Build compact directory tree map (top 2 levels only)
    const compactFileTree = this.buildCompactTree();

    // 4. Assemble complete prompt payload
    const sections: string[] = [
      "=== TASK OBJECTIVE ===",
      prompt,
      "",
      "=== WORKSPACE OVERVIEW ===",
      compactFileTree,
      "",
      "=== WORKSPACE MODULE RESOLUTION SCHEMA ===",
      "- Valid Monorepo Packages: @cacophony/shared-types, @cacophony/db, @cacophony/tools.",
      "- Internal Engine Files: Always use valid relative imports (e.g. '../gitea/GitWorktreeManager.js', '../scheduler/TaskScheduler.js', '../telemetry/ThermalGovernor.js').",
      "- NEVER invent non-existent package names like '@cacophony/git-worktrees', '@cacophony/scheduler', or '@cacophony/pipeline'."
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

    if (dependencySkeletons.size > 0) {
      sections.push("", "=== SLICED DEPENDENCY SKELETONS ===");
      for (const [depPath, skeleton] of dependencySkeletons.entries()) {
        sections.push(`--- Skeleton: ${depPath} ---`);
        sections.push(`\`\`\`typescript\n${skeleton}\n\`\`\``);
      }
    }

    let assembledPrompt = sections.join("\n");
    let compressionRatio = 1.0;

    if (compressPrompt) {
      const compression = this.compressor.compress(assembledPrompt, false);
      assembledPrompt = compression.compressed;
      compressionRatio = compression.compressionRatio;
    }

    const totalOriginalBytes = originalDepBytes + assembledPrompt.length;
    const savingsPercent = originalDepBytes > 0
      ? Number((((originalDepBytes - skeletonDepBytes) / originalDepBytes) * 100).toFixed(1))
      : Number(((1.0 - compressionRatio) * 100).toFixed(1));

    return {
      prompt,
      fileContents,
      dependencySkeletons,
      compactFileTree,
      assembledPrompt,
      tokenSavingsEstimate: {
        originalBytes: totalOriginalBytes,
        minimizedBytes: skeletonDepBytes + assembledPrompt.length,
        savingsPercent,
        compressionRatio
      }
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
