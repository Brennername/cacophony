import ts from "typescript";

/**
 * Parsed import statement metadata.
 */
export interface ParsedImport {
  readonly moduleSpecifier: string;
  readonly defaultImport?: string;
  readonly namedImports: readonly string[];
  readonly namespaceImport?: string;
  readonly rawText: string;
}

/**
 * ImportPruningEngine
 *
 * Implements context minimization by stripping unused external module imports
 * and consolidating duplicate import declarations under SOLID principles.
 */
export class ImportPruningEngine {
  /**
   * Identifies and strips external library imports that are not referenced in the file content.
   *
   * @param sourceCode Source code containing imports and code body.
   * @param allowedOrRequiredModules Optional list of modules to preserve regardless of references.
   * @returns Cleaned code with unused external imports removed.
   */
  public pruneUnusedImports(
    sourceCode: string,
    allowedOrRequiredModules: readonly string[] = []
  ): string {
    const trimmed = sourceCode.trim();
    if (!trimmed) return sourceCode;

    let sourceFile: ts.SourceFile;
    try {
      sourceFile = ts.createSourceFile("temp.ts", sourceCode, ts.ScriptTarget.ES2022, true);
    } catch {
      return sourceCode;
    }

    const importsToRemove: ts.ImportDeclaration[] = [];
    const requiredSet = new Set(allowedOrRequiredModules);

    // Collect all identifiers referenced outside import declarations
    const nonImportIdentifiers = new Set<string>();

    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        return; // Do not traverse into imports when collecting used symbols
      }
      if (ts.isIdentifier(node)) {
        nonImportIdentifiers.add(node.text);
      }
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);

    for (const stmt of sourceFile.statements) {
      if (!ts.isImportDeclaration(stmt)) {
        continue;
      }

      const moduleSpecifier = (stmt.moduleSpecifier as ts.StringLiteral).text;
      // If module is explicitly required or is a relative import (starts with .), preserve it
      if (requiredSet.has(moduleSpecifier) || moduleSpecifier.startsWith(".")) {
        continue;
      }

      // Check imported symbols
      const importClause = stmt.importClause;
      if (!importClause) {
        continue;
      }

      let isAnySymbolUsed = false;

      // Check default import
      if (importClause.name && nonImportIdentifiers.has(importClause.name.text)) {
        isAnySymbolUsed = true;
      }

      // Check named / namespace imports
      if (importClause.namedBindings) {
        if (ts.isNamespaceImport(importClause.namedBindings)) {
          if (nonImportIdentifiers.has(importClause.namedBindings.name.text)) {
            isAnySymbolUsed = true;
          }
        } else if (ts.isNamedImports(importClause.namedBindings)) {
          for (const spec of importClause.namedBindings.elements) {
            const symbolName = spec.name.text;
            if (nonImportIdentifiers.has(symbolName)) {
              isAnySymbolUsed = true;
              break;
            }
          }
        }
      }

      if (!isAnySymbolUsed) {
        importsToRemove.push(stmt);
      }
    }

    if (importsToRemove.length === 0) {
      return sourceCode;
    }

    // Remove unused imports by range
    let updatedCode = sourceCode;
    // Sort descending by start position to safely slice
    importsToRemove.sort((a, b) => b.getStart(sourceFile) - a.getStart(sourceFile));

    for (const imp of importsToRemove) {
      const start = imp.getStart(sourceFile);
      let end = imp.getEnd();
      // Also consume following newline if present
      if (updatedCode[end] === "\n") {
        end++;
      } else if (updatedCode.slice(end, end + 2) === "\r\n") {
        end += 2;
      }
      updatedCode = updatedCode.slice(0, start) + updatedCode.slice(end);
    }

    return updatedCode;
  }

  /**
   * Consolidates duplicate import declarations from the same module specifier into single statements.
   *
   * @param sourceCode Source code with potentially redundant imports.
   * @returns Normalized source code with consolidated imports.
   */
  public consolidateImports(sourceCode: string): string {
    const trimmed = sourceCode.trim();
    if (!trimmed) return sourceCode;

    let sourceFile: ts.SourceFile;
    try {
      sourceFile = ts.createSourceFile("temp.ts", sourceCode, ts.ScriptTarget.ES2022, true);
    } catch {
      return sourceCode;
    }

    const importsByModule = new Map<string, ts.ImportDeclaration[]>();
    for (const stmt of sourceFile.statements) {
      if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
        const mod = stmt.moduleSpecifier.text;
        const list = importsByModule.get(mod) ?? [];
        list.push(stmt);
        importsByModule.set(mod, list);
      }
    }

    let hasDuplicates = false;
    for (const list of importsByModule.values()) {
      if (list.length > 1) {
        hasDuplicates = true;
        break;
      }
    }

    if (!hasDuplicates) {
      return sourceCode;
    }

    // Reconstruct imports for modules with duplicates
    let updatedCode = sourceCode;
    for (const [mod, list] of importsByModule.entries()) {
      if (list.length <= 1) continue;

      let defaultImport: string | undefined;
      const namedSymbols = new Set<string>();

      for (const imp of list) {
        if (imp.importClause?.name) {
          defaultImport = imp.importClause.name.text;
        }
        if (imp.importClause?.namedBindings && ts.isNamedImports(imp.importClause.namedBindings)) {
          for (const el of imp.importClause.namedBindings.elements) {
            namedSymbols.add(el.getText(sourceFile));
          }
        }
      }

      // Format consolidated statement
      const parts: string[] = [];
      if (defaultImport) parts.push(defaultImport);
      if (namedSymbols.size > 0) {
        parts.push(`{ ${Array.from(namedSymbols).join(", ")} }`);
      }
      const consolidatedStmt = `import ${parts.join(", ")} from "${mod}";`;

      // Replace first occurrence with consolidated, delete subsequent
      // Sort list in reverse order of source position
      const sortedList = [...list].sort((a, b) => b.getStart(sourceFile) - a.getStart(sourceFile));
      for (let i = 0; i < sortedList.length - 1; i++) {
        const item = sortedList[i]!;
        const start = item.getStart(sourceFile);
        let end = item.getEnd();
        if (updatedCode[end] === "\n") end++;
        else if (updatedCode.slice(end, end + 2) === "\r\n") end += 2;
        updatedCode = updatedCode.slice(0, start) + updatedCode.slice(end);
      }

      const firstItem = sortedList[sortedList.length - 1]!;
      const start = firstItem.getStart(sourceFile);
      const end = firstItem.getEnd();
      updatedCode = updatedCode.slice(0, start) + consolidatedStmt + updatedCode.slice(end);

      // Re-parse for next iteration if multiple modules have duplicates
      sourceFile = ts.createSourceFile("temp.ts", updatedCode, ts.ScriptTarget.ES2022, true);
    }

    return updatedCode;
  }
}
