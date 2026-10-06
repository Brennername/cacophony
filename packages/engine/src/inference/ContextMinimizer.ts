import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";
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

  constructor(projectDir: string = process.cwd(), maxFileSizeBytes = 32768) {
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
          const rawContent = fs.readFileSync(fullPath, "utf-8");
          if (stat.size <= this.maxFileSizeBytes) {
            let content = rawContent;
            if (compressPrompt && (relPath.endsWith(".ts") || relPath.endsWith(".js") || relPath.endsWith(".tsx"))) {
              content = this.compressor.compress(content, true).compressed;
            }
            fileContents.set(relPath, content);
          } else if (relPath.endsWith(".ts") || relPath.endsWith(".js") || relPath.endsWith(".tsx")) {
            // Large file: extract concise AST outline with imports and method signatures
            const outline = this.extractFileOutline(rawContent, relPath);
            fileContents.set(relPath, outline);
          } else {
            fileContents.set(relPath, `[File exceeds size limit: ${stat.size} bytes]`);
          }
        } catch {
          // Ignore unreadable files
        }
      }
    }

    const totalFocusChars = Array.from(fileContents.values()).reduce((sum, c) => sum + c.length, 0);

    // 2. Perform AST dependency slicing on referenced internal modules (only if focus size is under budget)
    if (enableAstSlicing && totalFocusChars < 12000) {
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

      let currentSkeletonBytes = 0;
      const MAX_SKELETON_BYTES = 4096;
      const MAX_SKELETONS = 2;
      for (const [depPath, symbolSet] of referencedSymbolsByModule.entries()) {
        if (dependencySkeletons.size >= MAX_SKELETONS || currentSkeletonBytes >= MAX_SKELETON_BYTES) {
          break;
        }
        try {
          const depContent = fs.readFileSync(depPath, "utf-8");
          originalDepBytes += depContent.length;
          const relDep = path.relative(this.projectDir, depPath);
          const symbols = Array.from(symbolSet);
          const sliced = this.slicer.generateTypeSkeleton(depContent, symbols, relDep);
          currentSkeletonBytes += sliced.skeletonContent.length;
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
      "- Monorepo Packages: @cacophony/shared-types, @cacophony/db, @cacophony/tools, @cacophony/engine, @cacophony/frontend.",
      "- Language Requirement: Strictly TypeScript. Never emit Python, Java, or C++ code.",
      "- Testing Standards: For tests, use Node.js native test runner: import test, { describe, it } from 'node:test'; import assert from 'node:assert/strict';. NEVER import or reference @jest/globals, jest, chai, mocha, or sinon.",
      "- Frontend Standards: Angular standalone components, signals, inject(). Valid services in packages/frontend/src/app/services: arena-state.store, auth.service, history-metrics.service, model-fleet.service, task-api.service, theme.service. Never invent non-existent service files like 'telemetry.service'.",
      "- Internal Engine Files: Always use valid relative imports ending in .js (e.g. '../gitea/GitWorktreeManager.js', '../scheduler/TaskScheduler.js', '../telemetry/ThermalGovernor.js').",
      "- NEVER invent non-existent package names like '@cacophony/git-worktrees', 'vscode', or '@types/vscode'."
    ];

    const moduleCatalog = this.buildModuleCatalog(focusFiles);
    if (moduleCatalog.length > 0) {
      sections.push(
        "",
        "=== VERIFIED PACKAGE EXPORTS ===",
        "Use only the listed existing files and exports for new imports. A symbol absent from this catalog must be verified in source before use.",
        ...moduleCatalog
      );
    }

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
    return lines.slice(0, 20).join("\n") || "(empty workspace)";
  }

  private buildModuleCatalog(focusFiles: readonly string[]): string[] {
    const packageNames = new Set(
      focusFiles
        .map((file) => file.match(/^packages\/([^/]+)\//)?.[1])
        .filter((name): name is string => Boolean(name))
    );
    const catalog: string[] = [];

    for (const packageName of packageNames) {
      const packageRoot = path.resolve(this.projectDir, "packages", packageName);
      const sourceRoot = path.join(packageRoot, "src");
      if (!fs.existsSync(sourceRoot)) continue;
      const visit = (directory: string): void => {
        let entries: fs.Dirent[];
        try {
          entries = fs.readdirSync(directory, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          if (catalog.length >= 80) return;
          const absolute = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.startsWith(".") && entry.name !== "tests" && entry.name !== "__tests__") {
              visit(absolute);
            }
            continue;
          }
          if (!entry.isFile() || !entry.name.endsWith(".ts") || entry.name.endsWith(".d.ts")) continue;
          try {
            const sourceText = fs.readFileSync(absolute, "utf8");
            const sourceFile = ts.createSourceFile(absolute, sourceText, ts.ScriptTarget.Latest, true);
            const exports: string[] = [];
            for (const statement of sourceFile.statements) {
              if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
                exports.push(...statement.exportClause.elements.map((element) => element.name.text));
                continue;
              }
              const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
              if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
              if (ts.isVariableStatement(statement)) {
                for (const declaration of statement.declarationList.declarations) {
                  if (ts.isIdentifier(declaration.name)) exports.push(declaration.name.text);
                }
              } else if ("name" in statement && statement.name && ts.isIdentifier(statement.name as ts.Node)) {
                exports.push((statement.name as ts.Identifier).text);
              }
            }
            if (exports.length > 0) {
              catalog.push(`- ${path.relative(packageRoot, absolute)}: ${[...new Set(exports)].slice(0, 12).join(", ")}`);
            }
          } catch {
            // A catalog is advisory context; unreadable source is omitted.
          }
        }
      };
      visit(sourceRoot);
    }

    return catalog;
  }

  /**
   * Generates a concise AST outline of a large TypeScript source file,
   * retaining all imports, type definitions, and class method signatures
   * while collapsing method bodies to preserve context window tokens.
   */
  private extractFileOutline(code: string, filePath: string): string {
    try {
      const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.ES2022, true);
      let outline = "";
      for (const stmt of sf.statements) {
        if (ts.isImportDeclaration(stmt) || ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
          outline += stmt.getText(sf) + "\n";
        } else if (ts.isClassDeclaration(stmt)) {
          const exportKeyword = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ? "export " : "";
          outline += `\n${exportKeyword}class ${stmt.name?.text || ""} {\n`;
          for (const member of stmt.members) {
            if (ts.isConstructorDeclaration(member)) {
              outline += `  constructor(${member.parameters.map((p) => p.getText(sf)).join(", ")}) { /* ... */ }\n`;
            } else if (ts.isMethodDeclaration(member)) {
              const name = member.name.getText(sf);
              const params = member.parameters.map((p) => p.getText(sf)).join(", ");
              const ret = member.type ? `: ${member.type.getText(sf)}` : "";
              const isAsync = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : "";
              const access = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword)
                ? "private "
                : member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ProtectedKeyword)
                ? "protected "
                : "public ";
              outline += `  ${access}${isAsync}${name}(${params})${ret} { /* existing implementation */ }\n`;
            } else if (ts.isPropertyDeclaration(member)) {
              outline += `  ${member.getText(sf)};\n`;
            }
          }
          outline += "}\n";
        }
      }
      return outline.trim() || code.slice(0, 10000);
    } catch {
      return code.slice(0, 10000);
    }
  }
}
