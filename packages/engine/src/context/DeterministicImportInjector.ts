import ts from "typescript";

export interface KnownSymbolMapping {
  readonly [symbolName: string]: string; // symbol -> module specifier
}

export const DEFAULT_KNOWN_SYMBOLS: KnownSymbolMapping = {
  // Angular
  Injectable: "@angular/core",
  Component: "@angular/core",
  Directive: "@angular/core",
  signal: "@angular/core",
  computed: "@angular/core",
  effect: "@angular/core",
  inject: "@angular/core",
  input: "@angular/core",
  output: "@angular/core",
  viewChild: "@angular/core",
  ElementRef: "@angular/core",
  CommonModule: "@angular/common",
  // Node builtins
  fs: "node:fs/promises",
  path: "node:path",
  crypto: "node:crypto",
  os: "node:os",
  events: "node:events",
  EventEmitter: "node:events",
  test: "node:test",
  assert: "node:assert/strict",
};

export interface ImportInjectionResult {
  readonly updatedCode: string;
  readonly injectedSymbols: readonly string[];
}

/**
 * DeterministicImportInjector
 *
 * Inspects AST identifiers in TypeScript source code, detects referenced
 * identifiers that lack import declarations, and cleanly inserts missing ESM
 * import statements at the top of the file without LLM intervention.
 */
export class DeterministicImportInjector {
  private readonly symbolCatalog: KnownSymbolMapping;

  constructor(customCatalog: KnownSymbolMapping = {}) {
    this.symbolCatalog = { ...DEFAULT_KNOWN_SYMBOLS, ...customCatalog };
  }

  /**
   * Analyzes source code and injects missing import declarations.
   */
  public injectMissingImports(sourceCode: string): ImportInjectionResult {
    const sourceFile = ts.createSourceFile(
      "temp.ts",
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const importedSymbols = new Set<string>();
    const existingModules = new Map<string, ts.ImportDeclaration>();
    const declaredSymbols = new Set<string>();
    const referencedSymbols = new Set<string>();

    function visit(node: ts.Node): void {
      if (ts.isImportDeclaration(node)) {
        const moduleSpec = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, "");
        existingModules.set(moduleSpec, node);

        if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const el of node.importClause.namedBindings.elements) {
            importedSymbols.add(el.name.getText(sourceFile));
          }
        } else if (node.importClause?.name) {
          importedSymbols.add(node.importClause.name.getText(sourceFile));
        }
      } else if (
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        if (node.name) {
          declaredSymbols.add(node.name.getText(sourceFile));
        }
      } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        declaredSymbols.add(node.name.getText(sourceFile));
      } else if (ts.isIdentifier(node)) {
        referencedSymbols.add(node.getText(sourceFile));
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Identify symbols in catalog that are referenced, not imported, and not declared
    const missingByModule = new Map<string, string[]>();
    const allInjected: string[] = [];

    for (const sym of referencedSymbols) {
      if (!importedSymbols.has(sym) && !declaredSymbols.has(sym) && this.symbolCatalog[sym]) {
        const moduleSpec = this.symbolCatalog[sym]!;
        const list = missingByModule.get(moduleSpec) ?? [];
        if (!list.includes(sym)) {
          list.push(sym);
          allInjected.push(sym);
        }
        missingByModule.set(moduleSpec, list);
      }
    }

    if (allInjected.length === 0) {
      return { updatedCode: sourceCode, injectedSymbols: [] };
    }

    // Build new import lines
    const importLines: string[] = [];
    for (const [moduleSpec, symbols] of missingByModule.entries()) {
      importLines.push(`import { ${symbols.sort().join(", ")} } from "${moduleSpec}";`);
    }

    const updatedCode = `${importLines.join("\n")}\n${sourceCode}`;

    return {
      updatedCode,
      injectedSymbols: allInjected,
    };
  }
}
