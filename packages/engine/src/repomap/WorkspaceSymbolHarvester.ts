import { SymbolInfo } from '@cacophony/shared-types';
import { parse } from 'acorn';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts symbol identifiers, exported flags, file paths, line ranges,
 * and JSDoc documentation comments from a given TypeScript file.
 *
 * @param filePath - The path to the TypeScript file to be analyzed.
 * @returns An array of SymbolInfo objects containing extracted information.
 */
export function extractSymbols(filePath: string): SymbolInfo[] {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parse(code, { ecmaVersion: 2020 });

  const symbols: SymbolInfo[] = [];

  // Helper function to traverse the AST and extract symbol information
  function traverse(node: any) {
    if (node.type === 'ExportDefaultDeclaration') {
      const identifier = node.declaration.id;
      if (identifier) {
        symbols.push({
          identifier: identifier.name,
          exported: true,
          filePath,
          lineRange: { start: node.loc.start.line, end: node.loc.end.line },
          jsdoc: extractJSDoc(node),
        });
      }
    } else if (node.type === 'ExportNamedDeclaration') {
      for (const specifier of node.specifiers) {
        symbols.push({
          identifier: specifier.local.name,
          exported: true,
          filePath,
          lineRange: { start: node.loc.start.line, end: node.loc.end.line },
          jsdoc: extractJSDoc(node),
        });
      }
    } else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
      symbols.push({
        identifier: node.id.name,
        exported: false,
        filePath,
        lineRange: { start: node.loc.start.line, end: node.loc.end.line },
        jsdoc: extractJSDoc(node),
      });
    } else if (node.type === 'VariableDeclarator') {
      symbols.push({
        identifier: node.id.name,
        exported: false,
        filePath,
        lineRange: { start: node.loc.start.line, end: node.loc.end.line },
        jsdoc: extractJSDoc(node),
      });
    }

    for (const key in node) {
      if (node.hasOwnProperty(key)) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach((item) => traverse(item));
        } else if (typeof child === 'object') {
          traverse(child);
        }
      }
    }
  }

  traverse(ast);

  return symbols;
}

/**
 * Extracts JSDoc documentation comments from a given AST node.
 *
 * @param node - The AST node to extract JSDoc from.
 * @returns The extracted JSDoc comment, or an empty string if none found.
 */
function extractJSDoc(node: any): string {
  const leadingComments = node.leadingComments;
  if (leadingComments && leadingComments.length > 0) {
    const firstComment = leadingComments[0];
    if (firstComment.type === 'Line' || firstComment.type === 'Block') {
      return firstComment.value.trim();
    }
  }
  return '';
}

// Example usage:
const filePath = path.join(__dirname, '..', '..', 'src', 'repomap', 'WorkspaceSymbolHarvester.ts');
const symbols = extractSymbols(filePath);
console.log(symbols);