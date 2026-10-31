import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SymbolGraph } from "../repomap/SymbolGraph.js";
import type { ExtractedSymbol } from "../repomap/SymbolExtractor.js";

describe("SymbolGraph", () => {
  it("should add a single symbol and query node", () => {
    const graph = new SymbolGraph();
    const symbol: ExtractedSymbol = {
      id: "file1.ts#UserAuthService",
      name: "UserAuthService",
      kind: "class",
      filePath: "src/auth/UserAuthService.ts",
      lineStart: 10,
      lineEnd: 50,
      signature: "class UserAuthService",
      references: [],
    };

    graph.addSymbol(symbol);
    const node = graph.getNode("file1.ts#UserAuthService");
    assert.ok(node);
    assert.equal(node.symbol.name, "UserAuthService");
    assert.equal(node.rank, 1.0);
    assert.equal(node.incomingEdges.size, 0);
    assert.equal(node.outgoingEdges.size, 0);
  });

  it("should add multiple symbols and automatically wire reference edges", () => {
    const graph = new SymbolGraph();
    const tokenService: ExtractedSymbol = {
      id: "src/TokenService.ts#TokenService",
      name: "TokenService",
      kind: "class",
      filePath: "src/TokenService.ts",
      lineStart: 5,
      lineEnd: 30,
      signature: "class TokenService",
      references: [],
    };

    const authService: ExtractedSymbol = {
      id: "src/AuthService.ts#AuthService",
      name: "AuthService",
      kind: "class",
      filePath: "src/AuthService.ts",
      lineStart: 10,
      lineEnd: 60,
      signature: "class AuthService",
      references: ["TokenService"],
    };

    graph.addSymbols([tokenService, authService]);

    const authNode = graph.getNode("src/AuthService.ts#AuthService");
    const tokenNode = graph.getNode("src/TokenService.ts#TokenService");
    assert.ok(authNode);
    assert.ok(tokenNode);

    assert.ok(authNode.outgoingEdges.has("src/TokenService.ts#TokenService"));
    assert.ok(tokenNode.incomingEdges.has("src/AuthService.ts#AuthService"));
  });

  it("should ignore self-referential edges", () => {
    const graph = new SymbolGraph();
    const symbol: ExtractedSymbol = {
      id: "src/Recursive.ts#RecursiveWorker",
      name: "RecursiveWorker",
      kind: "class",
      filePath: "src/Recursive.ts",
      lineStart: 1,
      lineEnd: 20,
      signature: "class RecursiveWorker",
      references: ["RecursiveWorker"],
    };

    graph.addSymbols([symbol]);
    const node = graph.getNode("src/Recursive.ts#RecursiveWorker");
    assert.ok(node);
    assert.equal(node.outgoingEdges.size, 0);
    assert.equal(node.incomingEdges.size, 0);
  });

  it("should return empty map for empty graph PageRank calculation", () => {
    const graph = new SymbolGraph();
    const ranks = graph.computePageRank();
    assert.equal(ranks.size, 0);
  });

  it("should compute PageRank giving highest centrality to heavily referenced hubs", () => {
    const graph = new SymbolGraph();

    const dbClient: ExtractedSymbol = {
      id: "db#DatabaseClient",
      name: "DatabaseClient",
      kind: "class",
      filePath: "src/db/DatabaseClient.ts",
      lineStart: 1,
      lineEnd: 40,
      signature: "class DatabaseClient",
      references: [],
    };

    const userRepo: ExtractedSymbol = {
      id: "repo#UserRepository",
      name: "UserRepository",
      kind: "class",
      filePath: "src/repo/UserRepository.ts",
      lineStart: 1,
      lineEnd: 30,
      signature: "class UserRepository",
      references: ["DatabaseClient"],
    };

    const orderRepo: ExtractedSymbol = {
      id: "repo#OrderRepository",
      name: "OrderRepository",
      kind: "class",
      filePath: "src/repo/OrderRepository.ts",
      lineStart: 1,
      lineEnd: 30,
      signature: "class OrderRepository",
      references: ["DatabaseClient"],
    };

    const metricsRepo: ExtractedSymbol = {
      id: "repo#MetricsRepository",
      name: "MetricsRepository",
      kind: "class",
      filePath: "src/repo/MetricsRepository.ts",
      lineStart: 1,
      lineEnd: 30,
      signature: "class MetricsRepository",
      references: ["DatabaseClient"],
    };

    graph.addSymbols([dbClient, userRepo, orderRepo, metricsRepo]);
    const ranks = graph.computePageRank({ dampingFactor: 0.85, maxIterations: 30 });

    const dbRank = ranks.get("db#DatabaseClient") ?? 0;
    const userRank = ranks.get("repo#UserRepository") ?? 0;
    const orderRank = ranks.get("repo#OrderRepository") ?? 0;

    assert.ok(dbRank > userRank, `Expected DB rank (${dbRank}) to be higher than user repo (${userRank})`);
    assert.ok(dbRank > orderRank, `Expected DB rank (${dbRank}) to be higher than order repo (${orderRank})`);
  });

  it("should return all nodes in graph", () => {
    const graph = new SymbolGraph();
    const s1: ExtractedSymbol = {
      id: "s1",
      name: "SymbolOne",
      kind: "interface",
      filePath: "s1.ts",
      lineStart: 1,
      lineEnd: 5,
      signature: "interface SymbolOne",
      references: [],
    };
    const s2: ExtractedSymbol = {
      id: "s2",
      name: "SymbolTwo",
      kind: "function",
      filePath: "s2.ts",
      lineStart: 1,
      lineEnd: 5,
      signature: "function SymbolTwo(): void",
      references: [],
    };

    graph.addSymbols([s1, s2]);
    const all = graph.getAllNodes();
    assert.equal(all.length, 2);
  });
});
