import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import {
  RepositorySymbolRepository,
  type RepoSymbolRecord,
} from "../repositories/RepositorySymbolRepository.js";

describe("RepositorySymbolRepository", () => {
  let driver: PGliteDriver;
  let repo: RepositorySymbolRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new RepositorySymbolRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should upsert symbols and query by file path", async () => {
    const symbol1: Omit<RepoSymbolRecord, "updated_at"> = {
      id: "sym_hash_1",
      workspace_root: "/workspace",
      file_path: "src/auth/jwt.ts",
      symbol_name: "JwtValidator",
      symbol_kind: "class",
      line_start: 10,
      line_end: 80,
      signature: "export class JwtValidator",
      pagerank_score: 0.85,
      incoming_refs_count: 12,
      file_mtime: 1700000000,
    };

    const symbol2: Omit<RepoSymbolRecord, "updated_at"> = {
      id: "sym_hash_2",
      workspace_root: "/workspace",
      file_path: "src/auth/jwt.ts",
      symbol_name: "validateToken",
      symbol_kind: "method",
      line_start: 25,
      line_end: 45,
      signature: "public validateToken(token: string): boolean",
      pagerank_score: 0.65,
      incoming_refs_count: 8,
      file_mtime: 1700000000,
    };

    await repo.upsertSymbols([symbol1, symbol2]);

    const fileSymbols = await repo.getSymbolsByFile("/workspace", "src/auth/jwt.ts");
    assert.equal(fileSymbols.length, 2);
    assert.equal(fileSymbols[0]!.symbol_name, "JwtValidator");
    assert.equal(fileSymbols[1]!.symbol_name, "validateToken");
  });

  test("should retrieve top ranked symbols ordered by PageRank score", async () => {
    await repo.upsertSymbols([
      {
        id: "low_rank",
        workspace_root: "/app",
        file_path: "src/helper.ts",
        symbol_name: "helper",
        symbol_kind: "function",
        line_start: 1,
        line_end: 5,
        signature: "function helper()",
        pagerank_score: 0.1,
        incoming_refs_count: 1,
        file_mtime: 1700000000,
      },
      {
        id: "high_rank",
        workspace_root: "/app",
        file_path: "src/core.ts",
        symbol_name: "CoreEngine",
        symbol_kind: "class",
        line_start: 1,
        line_end: 100,
        signature: "class CoreEngine",
        pagerank_score: 0.95,
        incoming_refs_count: 50,
        file_mtime: 1700000000,
      },
    ]);

    const top = await repo.getTopRankedSymbols("/app", 10);
    assert.equal(top.length, 2);
    assert.equal(top[0]!.symbol_name, "CoreEngine");
    assert.equal(top[1]!.symbol_name, "helper");
  });

  test("should delete symbols for specific file on file edit or removal", async () => {
    await repo.upsertSymbols([
      {
        id: "file_a_sym",
        workspace_root: "/ws",
        file_path: "src/a.ts",
        symbol_name: "SymA",
        symbol_kind: "class",
        line_start: 1,
        line_end: 10,
        signature: "class SymA",
        pagerank_score: 0.5,
        incoming_refs_count: 2,
        file_mtime: 1700000000,
      },
      {
        id: "file_b_sym",
        workspace_root: "/ws",
        file_path: "src/b.ts",
        symbol_name: "SymB",
        symbol_kind: "class",
        line_start: 1,
        line_end: 10,
        signature: "class SymB",
        pagerank_score: 0.5,
        incoming_refs_count: 2,
        file_mtime: 1700000000,
      },
    ]);

    await repo.deleteForFile("/ws", "src/a.ts");

    const fileASymbols = await repo.getSymbolsByFile("/ws", "src/a.ts");
    assert.equal(fileASymbols.length, 0);

    const fileBSymbols = await repo.getSymbolsByFile("/ws", "src/b.ts");
    assert.equal(fileBSymbols.length, 1);
  });

  test("should clear all symbols for a workspace", async () => {
    await repo.upsertSymbols([
      {
        id: "ws1_sym",
        workspace_root: "/ws1",
        file_path: "src/test.ts",
        symbol_name: "Test",
        symbol_kind: "class",
        line_start: 1,
        line_end: 5,
        signature: "class Test",
        pagerank_score: 0.5,
        incoming_refs_count: 1,
        file_mtime: 1700000000,
      },
    ]);

    await repo.clearWorkspace("/ws1");
    const symbols = await repo.getTopRankedSymbols("/ws1");
    assert.equal(symbols.length, 0);
  });
});
