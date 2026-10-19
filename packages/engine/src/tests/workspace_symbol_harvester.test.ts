import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as ts from "typescript";
import { WorkspaceSymbolHarvester, IWorkspaceSymbolHarvesterOptions } from "../repomap/WorkspaceSymbolHarvester.js";

describe('WorkspaceSymbolHarvester', () => {
  describe('extractSymbols', () => {
    it('should extract symbols from a source file', () => {
      const code = `
        class MyClass {}
        interface MyInterface {}
        function myFunction() {}
      `;
      const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest);
      const symbols = WorkspaceSymbolHarvester.extractSymbols(sourceFile);

      assert.strictEqual(symbols.length, 3);
      assert.ok(symbols.some(symbol => symbol.kind === ts.SyntaxKind.ClassDeclaration));
      assert.ok(symbols.some(symbol => symbol.kind === ts.SyntaxKind.InterfaceDeclaration));
      assert.ok(symbols.some(symbol => symbol.kind === ts.SyntaxKind.FunctionDeclaration));
    });

    it('should ignore symbols based on ignore patterns', () => {
      const code = `
        class MyClass {}
        interface MyInterface {}
        function myFunction() {}
      `;
      const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest);
      const options: IWorkspaceSymbolHarvesterOptions = { ignorePatterns: ["test.ts"] };
      const symbols = WorkspaceSymbolHarvester.extractSymbols(sourceFile, options);

      assert.strictEqual(symbols.length, 0);
    });

    it('should not ignore symbols if no patterns are provided', () => {
      const code = `
        class MyClass {}
        interface MyInterface {}
        function myFunction() {}
      `;
      const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest);
      const options: IWorkspaceSymbolHarvesterOptions = {};
      const symbols = WorkspaceSymbolHarvester.extractSymbols(sourceFile, options);

      assert.strictEqual(symbols.length, 3);
    });

    it('should handle nested files correctly', () => {
      const code = `
        import { NestedClass } from "./nested.js";
        
        class MyClass {}
        interface MyInterface {}
        function myFunction() {}
      `;
      const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest);
      const symbols = WorkspaceSymbolHarvester.extractSymbols(sourceFile);

      assert.strictEqual(symbols.length, 3);
    });

    it('should ignore nested files based on patterns', () => {
      const code = `
        import { NestedClass } from "./nested.js";
        
        class MyClass {}
        interface MyInterface {}
        function myFunction() {}
      `;
      const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest);
      const options: IWorkspaceSymbolHarvesterOptions = { ignorePatterns: ["./nested"] };
      const symbols = WorkspaceSymbolHarvester.extractSymbols(sourceFile, options);

      assert.strictEqual(symbols.length, 3);
    });
  });
});