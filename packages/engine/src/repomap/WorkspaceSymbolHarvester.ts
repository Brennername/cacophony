import { SyntaxKind } from 'typescript';
import * as ts from 'typescript';

/**
 * Harvests symbols from TypeScript AST nodes.
 */
export class WorkspaceSymbolHarvester {
  /**
   * Traverses the AST and extracts ClassDeclaration, InterfaceDeclaration, and FunctionDeclaration nodes.
   * @param sourceFile - The TypeScript source file to traverse.
   * @returns An array of extracted declarations.
   */
  public static extractSymbols(sourceFile: ts.SourceFile): (ts.ClassDeclaration | ts.InterfaceDeclaration | ts.FunctionDeclaration)[] {
    const symbols: (ts.ClassDeclaration | ts.InterfaceDeclaration | ts.FunctionDeclaration)[] = [];

    function visit(node: ts.Node) {
      if (
        node.kind === SyntaxKind.ClassDeclaration ||
        node.kind === SyntaxKind.InterfaceDeclaration ||
        node.kind === SyntaxKind.FunctionDeclaration
      ) {
        symbols.push(node as ts.ClassDeclaration | ts.InterfaceDeclaration | ts.FunctionDeclaration);
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return symbols;
  }
}