import { SymbolNode } from '../SymbolNode';
import { ImportStatement, ExportStatement } from '../ast/ASTNodes';

class SymbolGraphBuilder {
  private symbolGraph: Map<string, Set<string>> = new Map();

  public addImport(importStatement: ImportStatement): void {
    const sourceFile = importStatement.getSourceFile();
    const importedSymbols = importStatement.getImportedSymbols();

    if (!this.symbolGraph.has(sourceFile)) {
      this.symbolGraph.set(sourceFile, new Set());
    }

    for (const symbol of importedSymbols) {
      this.symbolGraph.get(sourceFile)?.add(symbol);
    }
  }

  public addExport(exportStatement: ExportStatement): void {
    const sourceFile = exportStatement.getSourceFile();
    const exportedSymbols = exportStatement.getExportedSymbols();

    if (!this.symbolGraph.has(sourceFile)) {
      this.symbolGraph.set(sourceFile, new Set());
    }

    for (const symbol of exportedSymbols) {
      this.symbolGraph.get(sourceFile)?.add(symbol);
    }
  }

  public getSymbolGraph(): Map<string, Set<string>> {
    return this.symbolGraph;
  }
}

export { SymbolGraphBuilder };