import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RepoMapGenerator } from "../repomap/RepoMapGenerator.js";
import type { ExtractedSymbol } from "../repomap/SymbolExtractor.js";

describe("RepoMapGenerator", () => {
  it("should return fallback message when no symbols are indexed", () => {
    const generator = new RepoMapGenerator();
    const map = generator.generateMap([]);
    assert.equal(map, "No repository symbols indexed.");
  });

  it("should generate formatted tree map with class and interface declarations", () => {
    const generator = new RepoMapGenerator();

    const symbols: ExtractedSymbol[] = [
      {
        id: "src/auth/AuthService.ts#AuthService",
        name: "AuthService",
        kind: "class",
        filePath: "src/auth/AuthService.ts",
        lineStart: 12,
        lineEnd: 55,
        signature: "class AuthService",
        references: ["TokenService"],
      },
      {
        id: "src/auth/TokenService.ts#TokenService",
        name: "TokenService",
        kind: "class",
        filePath: "src/auth/TokenService.ts",
        lineStart: 5,
        lineEnd: 30,
        signature: "class TokenService",
        references: [],
      },
    ];

    const map = generator.generateMap(symbols);
    assert.ok(map.includes("=== Repository Map (Architectural Overview) ==="));
    assert.ok(map.includes("src/auth/AuthService.ts:"));
    assert.ok(map.includes("  │ [class] class AuthService (L12)"));
    assert.ok(map.includes("src/auth/TokenService.ts:"));
    assert.ok(map.includes("  │ [class] class TokenService (L5)"));
  });

  it("should boost relevance scores when query biasing matches symbol or file path", () => {
    const generator = new RepoMapGenerator();

    const symbols: ExtractedSymbol[] = [
      {
        id: "src/net/HttpServer.ts#HttpServer",
        name: "HttpServer",
        kind: "class",
        filePath: "src/net/HttpServer.ts",
        lineStart: 1,
        lineEnd: 40,
        signature: "class HttpServer",
        references: [],
      },
      {
        id: "src/db/DatabasePool.ts#DatabasePool",
        name: "DatabasePool",
        kind: "class",
        filePath: "src/db/DatabasePool.ts",
        lineStart: 1,
        lineEnd: 30,
        signature: "class DatabasePool",
        references: [],
      },
    ];

    const biasedMap = generator.generateMap(symbols, {
      maxTokens: 50,
      queryBiasing: "database",
    });

    assert.ok(biasedMap.includes("DatabasePool"));
  });

  it("should truncate symbols when token budget is tightly constrained", () => {
    const generator = new RepoMapGenerator();

    const manySymbols: ExtractedSymbol[] = [];
    for (let i = 0; i < 50; i++) {
      manySymbols.push({
        id: `src/mod${i}/Service${i}.ts#Service${i}`,
        name: `Service${i}`,
        kind: "class",
        filePath: `src/mod${i}/Service${i}.ts`,
        lineStart: 1,
        lineEnd: 20,
        signature: `class Service${i}VeryLongSignatureAndContractDetails`,
        references: [],
      });
    }

    const constrainedMap = generator.generateMap(manySymbols, {
      maxTokens: 50, // 200 characters max
    });

    const lines = constrainedMap.split("\n").filter((l) => l.includes("[class]"));
    assert.ok(lines.length < 5, `Expected fewer than 5 symbols in tight budget, got ${lines.length}`);
  });
});
