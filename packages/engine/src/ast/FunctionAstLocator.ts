import ts from "typescript";
import type { FunctionBoundary, FunctionParameterInfo } from "@cacophony/shared-types";

/**
 * Service that parses TypeScript and JavaScript source files using the TypeScript Compiler API
 * to identify function, method, constructor, and arrow function AST boundaries, extracting
 * their parameter signatures, return types, and leading trivia.
 */
export class FunctionAstLocator {
  /**
   * Locates all function and method boundaries within the provided source code.
   *
   * @param sourceContent Raw source text of the file
   * @param filePath Virtual or physical file path used for script kind resolution
   * @returns List of detected function boundaries with exact line positions and parameters
   */
  public locateFunctions(sourceContent: string, filePath = "source.ts"): FunctionBoundary[] {
    const isJsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");
    const scriptKind = filePath.endsWith(".ts") || filePath.endsWith(".tsx")
      ? (isJsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      : (isJsx ? ts.ScriptKind.JSX : ts.ScriptKind.JS);

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceContent,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );

    const boundaries: FunctionBoundary[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        boundaries.push(this.extractFunctionBoundary(sourceFile, node, node.name.text, 'function'));
      } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        boundaries.push(this.extractFunctionBoundary(sourceFile, node, node.name.text, 'method'));
      } else if (ts.isConstructorDeclaration(node)) {
        boundaries.push(this.extractFunctionBoundary(sourceFile, node, 'constructor', 'constructor'));
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (
            ts.isIdentifier(decl.name) &&
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
          ) {
            boundaries.push(this.extractFunctionBoundary(sourceFile, node, decl.name.text, 'arrow', decl.initializer));
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return boundaries;
  }

  /**
   * Finds a specific function boundary by identifier name.
   */
  public findFunctionByName(
    sourceContent: string,
    functionName: string,
    filePath = "source.ts",
  ): FunctionBoundary | null {
    const functions = this.locateFunctions(sourceContent, filePath);
    return functions.find((f) => f.name === functionName) || null;
  }

  private extractFunctionBoundary(
    sourceFile: ts.SourceFile,
    boundaryNode: ts.Node,
    name: string,
    scopeKind: 'function' | 'method' | 'arrow' | 'constructor',
    signatureSourceNode?: ts.SignatureDeclaration,
  ): FunctionBoundary {
    const sigNode = signatureSourceNode || (boundaryNode as ts.SignatureDeclarationBase);
    const startPos = boundaryNode.getStart(sourceFile);
    const endPos = boundaryNode.getEnd();

    const startLineChar = sourceFile.getLineAndCharacterOfPosition(startPos);
    const endLineChar = sourceFile.getLineAndCharacterOfPosition(endPos);

    // Extract leading indentation
    const lineStartPos = sourceFile.getPositionOfLineAndCharacter(startLineChar.line, 0);
    const prefix = sourceFile.text.slice(lineStartPos, startPos);
    const leadingIndent = prefix.match(/^\s*/)?.[0] || "";

    // Extract parameters
    const parameters: FunctionParameterInfo[] = (sigNode.parameters || []).map((param) => {
      const paramName = param.name.getText(sourceFile);
      const paramType = param.type ? param.type.getText(sourceFile) : undefined;
      const defaultValue = param.initializer ? param.initializer.getText(sourceFile) : undefined;
      return {
        name: paramName,
        type: paramType,
        defaultValue,
      };
    });

    // Extract return type if specified
    const returnType = sigNode.type ? sigNode.type.getText(sourceFile) : undefined;

    // Check async modifier
    const modifiers = ts.canHaveModifiers(boundaryNode) ? ts.getModifiers(boundaryNode) : undefined;
    const isAsync = Boolean(modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword));
    const isExported = Boolean(modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));

    // Extract full leading trivia (existing comments directly above)
    const fullStart = boundaryNode.getFullStart();
    const leadingTrivia = sourceFile.text.slice(fullStart, startPos).trim();
    const existingComment = leadingTrivia.includes("/*") ? leadingTrivia : undefined;

    // Extract signature text
    const fullText = boundaryNode.getText(sourceFile);
    const firstBraceIdx = fullText.indexOf("{");
    const signature = (firstBraceIdx !== -1 ? fullText.slice(0, firstBraceIdx) : (fullText.split("\n")[0] ?? "")).trim();

    return {
      name,
      signature,
      startLine: startLineChar.line + 1,
      endLine: endLineChar.line + 1,
      startPos,
      endPos,
      parameters,
      returnType,
      existingComment,
      leadingIndent,
      isAsync,
      isExported,
      scopeKind,
    };
  }
}
