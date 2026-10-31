import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as ts from "typescript";
import { SymbolGraphBuilder } from "../repomap/SymbolGraphBuilder.js";
import { SymbolGraph } from "../repomap/SymbolGraph.js";
import type { ExtractedSymbol } from "../repomap/SymbolExtractor.js";

describe("SymbolGraphBuilder", () => {
  it("should initialize with default or provided SymbolGraph", () => {
    const builderDefault = new SymbolGraphBuilder();
    assert.ok(builderDefault.getGraph() instanceof SymbolGraph);

    const customGraph = new SymbolGraph();
    const builderCustom = new SymbolGraphBuilder(customGraph);
    assert.equal(builderCustom.getGraph(), customGraph);
  });

  it("should process import declarations and wire edges to module specifiers", () => {
    const graph = new SymbolGraph();
    const builder = new SymbolGraphBuilder(graph);

    const sym: ExtractedSymbol = {
      id: "src/Controller.ts#AppController",
      name: "AppController",
      kind: "class",
      filePath: "src/Controller.ts",
      lineStart: 5,
      lineEnd: 25,
      signature: "class AppController",
      references: [],
    };
    graph.addSymbol(sym);

    const dummyModuleTarget: ExtractedSymbol = {
      id: "./services/AuthService.js",
      name: "AuthServiceModule",
      kind: "class",
      filePath: "src/services/AuthService.ts",
      lineStart: 1,
      lineEnd: 20,
      signature: "class AuthService",
      references: [],
    };
    graph.addSymbol(dummyModuleTarget);

    const sourceCode = `
      import { AuthService } from "./services/AuthService.js";
      import { Logger } from "@cacophony/logger";

      export class AppController {}
    `;
    const sourceFile = ts.createSourceFile("src/Controller.ts", sourceCode, ts.ScriptTarget.Latest, true);

    builder.processSourceFile(sourceFile, [sym]);

    const node = graph.getNode("src/Controller.ts#AppController");
    assert.ok(node);
    assert.ok(node.outgoingEdges.has("./services/AuthService.js"));
  });

  it("should process export declarations with module specifiers", () => {
    const graph = new SymbolGraph();
    const builder = new SymbolGraphBuilder(graph);

    const sym: ExtractedSymbol = {
      id: "src/index.ts#IndexExport",
      name: "IndexExport",
      kind: "const",
      filePath: "src/index.ts",
      lineStart: 1,
      lineEnd: 5,
      signature: "export *",
      references: [],
    };
    graph.addSymbol(sym);

    const targetModule: ExtractedSymbol = {
      id: "./models/User.js",
      name: "UserModel",
      kind: "interface",
      filePath: "src/models/User.ts",
      lineStart: 1,
      lineEnd: 10,
      signature: "interface User",
      references: [],
    };
    graph.addSymbol(targetModule);

    const sourceCode = `
      export { User } from "./models/User.js";
    `;
    const sourceFile = ts.createSourceFile("src/index.ts", sourceCode, ts.ScriptTarget.Latest, true);

    builder.processSourceFile(sourceFile, [sym]);

    const node = graph.getNode("src/index.ts#IndexExport");
    assert.ok(node);
    assert.ok(node.outgoingEdges.has("./models/User.js"));
  });

  it("should handle files with no import or export declarations", () => {
    const graph = new SymbolGraph();
    const builder = new SymbolGraphBuilder(graph);

    const sym: ExtractedSymbol = {
      id: "src/pure.ts#add",
      name: "add",
      kind: "function",
      filePath: "src/pure.ts",
      lineStart: 1,
      lineEnd: 3,
      signature: "function add(a: number, b: number): number",
      references: [],
    };
    graph.addSymbol(sym);

    const sourceCode = `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;
    const sourceFile = ts.createSourceFile("src/pure.ts", sourceCode, ts.ScriptTarget.Latest, true);

    builder.processSourceFile(sourceFile, [sym]);

    const node = graph.getNode("src/pure.ts#add");
    assert.ok(node);
    assert.equal(node.outgoingEdges.size, 0);
  });
});
