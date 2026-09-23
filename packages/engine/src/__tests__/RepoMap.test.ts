import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SymbolExtractor } from "../repomap/SymbolExtractor.js";
import { SymbolGraph } from "../repomap/SymbolGraph.js";
import { RepoMapGenerator } from "../repomap/RepoMapGenerator.js";
import { ContextManager } from "../context/ContextManager.js";
import { ContextRecommender } from "../context/ContextRecommender.js";
import { MultiFileEditCoordinator } from "../context/MultiFileEditCoordinator.js";

describe("Phase 12: Repository Mapping & Granular Context Engine", () => {
  describe("SymbolExtractor AST Multi-Language Parsing", () => {
    const extractor = new SymbolExtractor();

    test("should extract classes, interfaces, and types from TypeScript", () => {
      const tsCode = `
        import { Logger } from "./logger.js";
        export interface UserServiceConfig {
          readonly maxRetries: number;
        }

        export class UserService {
          constructor(private readonly logger: Logger) {}
          public async getUser(id: string): Promise<string> {
            return id;
          }
        }

        export function calculateHash(value: string): string {
          return value;
        }
      `;

      const symbols = extractor.extractFromContent("src/services/UserService.ts", tsCode);
      assert.ok(symbols.length >= 3);

      const iface = symbols.find((s) => s.kind === "interface");
      assert.equal(iface?.name, "UserServiceConfig");

      const cls = symbols.find((s) => s.kind === "class");
      assert.equal(cls?.name, "UserService");
      assert.ok(cls?.references.includes("Logger"));

      const fn = symbols.find((s) => s.kind === "function");
      assert.equal(fn?.name, "calculateHash");
    });

    test("should extract classes and methods from Java source", () => {
      const javaCode = `
        package com.example.service;
        public class PaymentProcessor {
          public void processPayment(String orderId) {
            System.out.println(orderId);
          }
        }
      `;

      const symbols = extractor.extractFromContent("src/main/java/PaymentProcessor.java", javaCode);
      assert.ok(symbols.some((s) => s.name === "PaymentProcessor" && s.kind === "class"));
      assert.ok(symbols.some((s) => s.name === "processPayment" && s.kind === "method"));
    });

    test("should extract functions and structs from Go source", () => {
      const goCode = `
        package main
        type Config struct {
          Port int
        }
        func StartServer(cfg Config) error {
          return nil
        }
      `;

      const symbols = extractor.extractFromContent("main.go", goCode);
      assert.ok(symbols.some((s) => s.name === "Config" && s.kind === "interface"));
      assert.ok(symbols.some((s) => s.name === "StartServer" && s.kind === "function"));
    });
  });

  describe("SymbolGraph & PageRank Centrality Ranking", () => {
    test("should compute PageRank and rank high-centrality dependencies higher", () => {
      const graph = new SymbolGraph();

      // Node A depends on B and C; Node D depends on C. Node C is the central hub.
      graph.addSymbol({
        id: "A",
        name: "ServiceA",
        kind: "class",
        filePath: "ServiceA.ts",
        lineStart: 1,
        lineEnd: 10,
        signature: "class ServiceA",
        references: ["ServiceB", "ServiceC"]
      });

      graph.addSymbol({
        id: "B",
        name: "ServiceB",
        kind: "class",
        filePath: "ServiceB.ts",
        lineStart: 1,
        lineEnd: 10,
        signature: "class ServiceB",
        references: ["ServiceC"]
      });

      graph.addSymbol({
        id: "C",
        name: "ServiceC",
        kind: "class",
        filePath: "ServiceC.ts",
        lineStart: 1,
        lineEnd: 10,
        signature: "class ServiceC",
        references: []
      });

      graph.addSymbol({
        id: "D",
        name: "ServiceD",
        kind: "class",
        filePath: "ServiceD.ts",
        lineStart: 1,
        lineEnd: 10,
        signature: "class ServiceD",
        references: ["ServiceC"]
      });

      // Wire edges
      graph.addEdge("A", "B");
      graph.addEdge("A", "C");
      graph.addEdge("B", "C");
      graph.addEdge("D", "C");

      const ranks = graph.computePageRank();
      const rankC = ranks.get("C") ?? 0;
      const rankA = ranks.get("A") ?? 0;

      // Central hub C has multiple incoming edges from A, B, and D, so PageRank must be highest
      assert.ok(rankC > rankA);
    });
  });

  describe("RepoMapGenerator Token Budget & Query Biasing", () => {
    test("should format repo map and bias ranking toward user query", () => {
      const generator = new RepoMapGenerator();
      const symbols = [
        {
          id: "1",
          name: "PaymentGateway",
          kind: "class" as const,
          filePath: "src/billing/PaymentGateway.ts",
          lineStart: 10,
          lineEnd: 50,
          signature: "export class PaymentGateway",
          references: []
        },
        {
          id: "2",
          name: "InvoiceGenerator",
          kind: "class" as const,
          filePath: "src/billing/InvoiceGenerator.ts",
          lineStart: 5,
          lineEnd: 30,
          signature: "export class InvoiceGenerator",
          references: []
        },
        {
          id: "3",
          name: "UserAuthentication",
          kind: "class" as const,
          filePath: "src/auth/UserAuthentication.ts",
          lineStart: 1,
          lineEnd: 25,
          signature: "export class UserAuthentication",
          references: []
        }
      ];

      const biasedMap = generator.generateMap(symbols, {
        maxTokens: 500,
        queryBiasing: "PaymentGateway"
      });

      assert.ok(biasedMap.includes("src/billing/PaymentGateway.ts"));
      assert.ok(biasedMap.includes("PaymentGateway"));
      assert.ok(biasedMap.includes("=== Repository Map (Architectural Overview) ==="));
    });
  });

  describe("ContextManager & Recommender", () => {
    test("should manage EDITABLE vs REFERENCE files and token thresholds", async () => {
      const manager = new ContextManager({
        modelWindowTokens: 1000,
        maxTokensThreshold: 600
      });

      await manager.addFile("/workspace", "src/foo.ts", "EDITABLE");
      await manager.addFile("/workspace", "docs/spec.md", "REFERENCE");

      const editables = manager.getFiles("EDITABLE");
      const references = manager.getFiles("REFERENCE");

      assert.equal(editables.length, 1);
      assert.equal(references.length, 1);
      assert.equal(editables[0]?.path, "src/foo.ts");

      manager.setMode("docs/spec.md", "EDITABLE");
      assert.equal(manager.getFiles("EDITABLE").length, 2);

      manager.dropFile("src/foo.ts");
      assert.equal(manager.getFiles().length, 1);
    });

    test("should recommend corresponding test files and dependencies", () => {
      const recommender = new ContextRecommender();
      const symbols = [
        {
          id: "s1",
          name: "UserService",
          kind: "class" as const,
          filePath: "src/UserService.ts",
          lineStart: 1,
          lineEnd: 20,
          signature: "export class UserService",
          references: ["DatabaseClient"]
        },
        {
          id: "s2",
          name: "DatabaseClient",
          kind: "class" as const,
          filePath: "src/DatabaseClient.ts",
          lineStart: 1,
          lineEnd: 20,
          signature: "export class DatabaseClient",
          references: []
        }
      ];

      const recommendations = recommender.recommend(["src/UserService.ts"], symbols, "user database");
      assert.ok(recommendations.length >= 2);
      assert.ok(recommendations.some((r) => r.reason === "corresponding_test"));
      assert.ok(recommendations.some((r) => r.filePath === "src/DatabaseClient.ts"));
    });
  });

  describe("MultiFileEditCoordinator", () => {
    test("should validate syntax across staged edits before disk application", async () => {
      const coordinator = new MultiFileEditCoordinator();

      await coordinator.stage("/workspace", "src/valid.ts", "export const value: number = 42;");
      const validRes = coordinator.validateStaged();
      assert.equal(validRes.valid, true);

      await coordinator.stage("/workspace", "src/broken.ts", "export const broken = {;");
      const brokenRes = coordinator.validateStaged();
      assert.equal(brokenRes.valid, false);
      assert.ok(brokenRes.errors.length > 0);
    });
  });
});
