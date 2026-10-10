import * as path from "node:path";
import * as fs from "node:fs/promises";
import ts from "typescript";

export interface ExtractedSymbol {
  readonly id: string;
  readonly name: string;
  readonly kind: "class" | "interface" | "function" | "method" | "type" | "const" | "enum";
  readonly filePath: string;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly signature: string;
  readonly references: readonly string[]; // symbol names this declaration imports or invokes
}

export interface SymbolExtractorOptions {
  readonly maxFileSizeBytes?: number | undefined;
  readonly excludedPatterns?: readonly string[] | undefined;
}

/**
 * SymbolExtractor
 *
 * Extracts AST symbols (classes, interfaces, methods, functions, types, enums)
 * across TypeScript, JavaScript, Java, Go, and Python files.
 * Uses the TypeScript Compiler API for TS/JS and fast regex/structural grammars for other languages.
 */
export class SymbolExtractor {
  private readonly maxFileSizeBytes: number;
  private readonly excludedPatterns: readonly string[];

  constructor(options: SymbolExtractorOptions = {}) {
    this.maxFileSizeBytes = options.maxFileSizeBytes ?? 1024 * 1024; // 1 MB default limit
    this.excludedPatterns = options.excludedPatterns ?? [
      "node_modules",
      ".git",
      "dist",
      "target",
      "build",
      ".next"
    ];
  }

  /**
   * Scans a file and extracts all declared architectural symbols.
   */
  public async extractFileSymbols(workspaceRoot: string, relativePath: string): Promise<readonly ExtractedSymbol[]> {
    if (this.excludedPatterns.some((pattern) => relativePath.includes(pattern))) {
      return [];
    }
    const fullPath = path.resolve(workspaceRoot, relativePath);
    try {
      const stats = await fs.stat(fullPath);
      if (stats.size > this.maxFileSizeBytes) {
        return [];
      }
      const content = await fs.readFile(fullPath, "utf-8");
      return this.extractFromContent(relativePath, content);
    } catch {
      return [];
    }
  }

  /**
   * Extracts symbols from in-memory content.
   */
  public extractFromContent(relativePath: string, content: string): readonly ExtractedSymbol[] {
    const ext = path.extname(relativePath).toLowerCase();

    if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx" || ext === ".mjs") {
      return this.extractTypeScriptSymbols(relativePath, content);
    } else if (ext === ".java") {
      return this.extractJavaSymbols(relativePath, content);
    } else if (ext === ".go") {
      return this.extractGoSymbols(relativePath, content);
    } else if (ext === ".py") {
      return this.extractPythonSymbols(relativePath, content);
    }

    return [];
  }

  private extractTypeScriptSymbols(relativePath: string, content: string): readonly ExtractedSymbol[] {
    const symbols: ExtractedSymbol[] = [];
    const sourceFile = ts.createSourceFile(
      relativePath,
      content,
      ts.ScriptTarget.ES2022,
      true,
      relativePath.endsWith(".tsx") || relativePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const importedSymbols = new Set<string>();

    const visit = (node: ts.Node) => {
      // Collect imported identifiers to track outgoing references
      if (ts.isImportDeclaration(node) && node.importClause) {
        if (node.importClause.name) {
          importedSymbols.add(node.importClause.name.text);
        }
        if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const spec of node.importClause.namedBindings.elements) {
            importedSymbols.add(spec.name.text);
          }
        }
      }

      if (ts.isClassDeclaration(node) && node.name) {
        symbols.push(this.createTsSymbol(sourceFile, node, node.name.text, "class", content, importedSymbols));
      } else if (ts.isInterfaceDeclaration(node)) {
        symbols.push(this.createTsSymbol(sourceFile, node, node.name.text, "interface", content, importedSymbols));
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        symbols.push(this.createTsSymbol(sourceFile, node, node.name.text, "function", content, importedSymbols));
      } else if (ts.isTypeAliasDeclaration(node)) {
        symbols.push(this.createTsSymbol(sourceFile, node, node.name.text, "type", content, importedSymbols));
      } else if (ts.isEnumDeclaration(node)) {
        symbols.push(this.createTsSymbol(sourceFile, node, node.name.text, "enum", content, importedSymbols));
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return symbols;
  }

  private createTsSymbol(
    sourceFile: ts.SourceFile,
    node: ts.Node,
    name: string,
    kind: ExtractedSymbol["kind"],
    content: string,
    importedSymbols: Set<string>
  ): ExtractedSymbol {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const lineStart = start.line + 1;
    const lineEnd = end.line + 1;

    // First line or signature
    const lines = content.slice(node.getStart(sourceFile), node.getEnd()).split("\n");
    const signature = (lines[0] || "").trim().slice(0, 160);

    // Identify references to imported symbols inside this node
    const nodeText = content.slice(node.getStart(sourceFile), node.getEnd());
    const refs: string[] = [];
    for (const sym of importedSymbols) {
      if (sym !== name && nodeText.includes(sym)) {
        refs.push(sym);
      }
    }

    return {
      id: `${path.basename(sourceFile.fileName)}#${name}#${lineStart}`,
      name,
      kind,
      filePath: sourceFile.fileName,
      lineStart,
      lineEnd,
      signature,
      references: refs
    };
  }

  private extractJavaSymbols(relativePath: string, content: string): readonly ExtractedSymbol[] {
    const symbols: ExtractedSymbol[] = [];
    const lines = content.split("\n");

    const classRegex = /(?:public\s+|protected\s+|private\s+)?(?:static\s+)?(?:class|interface|record|enum)\s+([A-Za-z0-9_]+)/;
    const methodRegex = /^\s*(?:(?:public|protected|private|static|final)\s+)*([A-Za-z0-9_]+(?:<[A-Za-z0-9_,\s]+>)?(?:\[\])?)\s+([A-Za-z0-9_]+)\s*\([^)]*\)(?:\s+throws\s+[A-Za-z0-9_,\s]+)?\s*\{?/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";
      const classMatch = line.match(classRegex);
      if (classMatch && classMatch[1]) {
        symbols.push({
          id: `${relativePath}#${classMatch[1]}#${i + 1}`,
          name: classMatch[1],
          kind: "class",
          filePath: relativePath,
          lineStart: i + 1,
          lineEnd: i + 1,
          signature: line.trim(),
          references: []
        });
      } else {
        const methodMatch = line.match(methodRegex);
        if (methodMatch && methodMatch[2]) {
          symbols.push({
            id: `${relativePath}#${methodMatch[2]}#${i + 1}`,
            name: methodMatch[2],
            kind: "method",
            filePath: relativePath,
            lineStart: i + 1,
            lineEnd: i + 1,
            signature: line.trim(),
            references: []
          });
        }
      }
    }

    return symbols;
  }

  private extractGoSymbols(relativePath: string, content: string): readonly ExtractedSymbol[] {
    const symbols: ExtractedSymbol[] = [];
    const lines = content.split("\n");

    const funcRegex = /^\s*func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)\s*\(/;
    const typeRegex = /^\s*type\s+([A-Za-z0-9_]+)\s+(?:struct|interface)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";
      const funcMatch = line.match(funcRegex);
      if (funcMatch && funcMatch[1]) {
        symbols.push({
          id: `${relativePath}#${funcMatch[1]}#${i + 1}`,
          name: funcMatch[1],
          kind: "function",
          filePath: relativePath,
          lineStart: i + 1,
          lineEnd: i + 1,
          signature: line.trim(),
          references: []
        });
      } else {
        const typeMatch = line.match(typeRegex);
        if (typeMatch && typeMatch[1]) {
          symbols.push({
            id: `${relativePath}#${typeMatch[1]}#${i + 1}`,
            name: typeMatch[1],
            kind: "interface",
            filePath: relativePath,
            lineStart: i + 1,
            lineEnd: i + 1,
            signature: line.trim(),
            references: []
          });
        }
      }
    }

    return symbols;
  }

  private extractPythonSymbols(relativePath: string, content: string): readonly ExtractedSymbol[] {
    const symbols: ExtractedSymbol[] = [];
    const lines = content.split("\n");

    const classRegex = /^\s*class\s+([A-Za-z0-9_]+)/;
    const defRegex = /^\s*(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";
      const classMatch = line.match(classRegex);
      if (classMatch && classMatch[1]) {
        symbols.push({
          id: `${relativePath}#${classMatch[1]}#${i + 1}`,
          name: classMatch[1],
          kind: "class",
          filePath: relativePath,
          lineStart: i + 1,
          lineEnd: i + 1,
          signature: line.trim(),
          references: []
        });
      } else {
        const defMatch = line.match(defRegex);
        if (defMatch && defMatch[1]) {
          symbols.push({
            id: `${relativePath}#${defMatch[1]}#${i + 1}`,
            name: defMatch[1],
            kind: "function",
            filePath: relativePath,
            lineStart: i + 1,
            lineEnd: i + 1,
            signature: line.trim(),
            references: []
          });
        }
      }
    }

    return symbols;
  }
}
