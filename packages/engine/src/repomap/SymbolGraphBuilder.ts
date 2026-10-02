import * as ts from "typescript";
import { SymbolGraph } from "./SymbolGraph.js";
import type { ExtractedSymbol } from "./SymbolExtractor.js";

/**
 * SymbolGraphBuilder
 *
 * Traverses TypeScript ASTs to extract import and export declarations,
 * constructing directed architectural dependency edges between modules and symbols.
 */
export class SymbolGraphBuilder {
  private readonly graph: SymbolGraph;

  constructor(graph?: SymbolGraph) {
    this.graph = graph ?? new SymbolGraph();
  }

  /**
   * Returns the underlying SymbolGraph instance.
   */
  public getGraph(): SymbolGraph {
    return this.graph;
  }

  /**
   * Analyzes import and export declarations in a TypeScript source file,
   * wiring directed dependency relationships in the graph.
   *
   * @param sourceFile - The parsed TypeScript SourceFile AST
   * @param fileSymbols - Optional list of symbols discovered in this file
   */
  public processSourceFile(sourceFile: ts.SourceFile, fileSymbols: readonly ExtractedSymbol[] = []): void {
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const modulePath = node.moduleSpecifier.text;
          for (const sym of fileSymbols) {
            this.graph.addEdge(sym.id, modulePath);
          }
        }
      } else if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const exportSource = node.moduleSpecifier.text;
          for (const sym of fileSymbols) {
            this.graph.addEdge(sym.id, exportSource);
          }
        }
      }
    });
  }
}