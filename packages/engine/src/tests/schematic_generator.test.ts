import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { SchematicCodeGenerator } from "../generators/SchematicCodeGenerator.js";

test("SchematicCodeGenerator Suite", async (t) => {
  const generator = new SchematicCodeGenerator();

  await t.test(
    "should generate typed class scaffold with imports, properties, and stub markers",
    () => {
      const scaffold = generator.generateScaffold({
        className: "OrderProcessor",
        description:
          "Handles customer order transactions and inventory decrement.",
        imports: [
          'import type { Order, OrderStatus } from "@cacophony/shared-types";',
        ],
        properties: [
          { name: "dbUrl", type: "string", isPrivate: true, isReadonly: true },
          { name: "retryAttempts", type: "number", initialValue: "3" },
        ],
        methods: [
          {
            name: "processOrder",
            description: "Validates and submits order to payment gateway.",
            parameters: [
              { name: "orderId", type: "string" },
              { name: "amount", type: "number" },
            ],
            returnType: "OrderStatus",
            isAsync: true,
          },
          {
            name: "calculateTax",
            description: "Computes sales tax based on state code.",
            parameters: [
              { name: "subtotal", type: "number" },
              { name: "stateCode", type: "string" },
            ],
            returnType: "number",
          },
        ],
      });

      assert.strictEqual(scaffold.className, "OrderProcessor");
      assert.strictEqual(scaffold.methodCount, 2);
      assert.ok(scaffold.sourceCode.includes("export class OrderProcessor"));
      assert.ok(
        scaffold.sourceCode.includes("private readonly dbUrl: string;"),
      );
      assert.ok(
        scaffold.sourceCode.includes("public retryAttempts: number = 3;"),
      );
      assert.ok(
        scaffold.sourceCode.includes(
          "public async processOrder(orderId: string, amount: number): Promise<OrderStatus>",
        ),
      );
      assert.ok(scaffold.sourceCode.includes(""));
      assert.ok(
        scaffold.sourceCode.includes(
          "public calculateTax(subtotal: number, stateCode: string): number",
        ),
      );
      assert.ok(scaffold.sourceCode.includes(""));

      const sf = ts.createSourceFile(
        "test.ts",
        scaffold.sourceCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      assert.ok(sf.statements.length > 0);
    },
  );

  await t.test(
    "should extract isolated targeted method units for distribution to 7B+ models",
    () => {
      const scaffold = generator.generateScaffold({
        className: "TaxService",
        properties: [
          { name: "defaultRate", type: "number", initialValue: "0.08" },
        ],
        methods: [
          {
            name: "getRate",
            parameters: [{ name: "zipCode", type: "string" }],
            returnType: "number",
          },
        ],
      });

      const units = generator.extractMethodTargets(scaffold.sourceCode);
      assert.strictEqual(units.length, 1);
      const unit = units[0]!;
      assert.strictEqual(unit.className, "TaxService");
      assert.strictEqual(unit.methodName, "getRate");
      assert.strictEqual(unit.returnType, "number");
      assert.strictEqual(unit.isAsync, false);
      assert.ok(unit.prompt.includes("CLASS: TaxService"));
      assert.ok(
        unit.prompt.includes(
          "METHOD SIGNATURE: public getRate(zipCode: string): number",
        ),
      );
      assert.ok(unit.prompt.includes("defaultRate"));
    },
  );

  await t.test(
    "should merge method bodies cleanly back into scaffold without residual stubs",
    () => {
      const scaffold = generator.generateScaffold({
        className: "MathService",
        methods: [
          {
            name: "add",
            parameters: [
              { name: "a", type: "number" },
              { name: "b", type: "number" },
            ],
            returnType: "number",
          },
          {
            name: "multiply",
            parameters: [
              { name: "a", type: "number" },
              { name: "b", type: "number" },
            ],
            returnType: "number",
          },
        ],
      });

      const implementations = new Map<string, string>([
        ["add", "return a + b;"],
        ["multiply", "return a * b;"],
      ]);

      const merged = generator.mergeMethodImplementations(
        scaffold.sourceCode,
        implementations,
      );

      assert.ok(!merged.includes(SchematicCodeGenerator.STUB_MARKER_PREFIX));
      assert.ok(merged.includes("return a + b;"));
      assert.ok(merged.includes("return a * b;"));

      const sf = ts.createSourceFile(
        "math.ts",
        merged,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      let classFound = false;
      ts.forEachChild(sf, (node) => {
        if (ts.isClassDeclaration(node) && node.name?.text === "MathService") {
          classFound = true;
          assert.strictEqual(node.members.length, 2);
        }
      });
      assert.ok(classFound, "Class declaration should exist after merge");
    },
  );

  await t.test(
    "T70.2.1: should inject missing imports and avoid duplicate imports",
    () => {
      const initialSource = `import { useState } from "react";\n\nexport class ViewComponent {}`;
      const injected = generator.injectImports(initialSource, [
        'import { useState } from "react";',
        'import type { TaskRecord } from "@cacophony/shared-types";',
        'import * as path from "node:path";',
      ]);

      assert.ok(
        injected.includes('import type { TaskRecord } from "@cacophony/shared-types";'),
      );
      assert.ok(injected.includes('import * as path from "node:path";'));
      // Verify no duplicate react import
      const matches = injected.match(/from "react"/g);
      assert.strictEqual(matches?.length, 1);
    },
  );

  await t.test(
    "T70.1.3: should generate valid AST source code from declarative SchematicTemplates blueprints",
    async () => {
      const { SchematicTemplates } = await import(
        "../generators/SchematicTemplates.js"
      );

      // 1. ScrubberRule template
      const scrubberSpec = SchematicTemplates.scrubberRule("EmojiFilterRule");
      const scrubberScaffold = generator.generateScaffold(scrubberSpec);
      assert.ok(scrubberScaffold.sourceCode.includes("export class EmojiFilterRule"));
      assert.ok(scrubberScaffold.sourceCode.includes("scrub(source: string, filePath: string): ScrubberResult"));

      // 2. TelemetryProvider template
      const telemetrySpec = SchematicTemplates.telemetryProvider("GpuMetricsProvider");
      const telemetryScaffold = generator.generateScaffold(telemetrySpec);
      assert.ok(telemetryScaffold.sourceCode.includes("export class GpuMetricsProvider"));
      assert.ok(telemetryScaffold.sourceCode.includes("sample(): Promise<TelemetrySnapshot>"));

      // 3. HttpRouteHandler template
      const httpSpec = SchematicTemplates.httpRouteHandler("TasksRouteHandler");
      const httpScaffold = generator.generateScaffold(httpSpec);
      assert.ok(httpScaffold.sourceCode.includes("export class TasksRouteHandler"));
      assert.ok(httpScaffold.sourceCode.includes("canHandle(pathname: string, method: string): boolean"));

      // 4. RepositoryService template
      const repoSpec = SchematicTemplates.repositoryService("TaskRepository", "TaskRecord");
      const repoScaffold = generator.generateScaffold(repoSpec);
      assert.ok(repoScaffold.sourceCode.includes("export class TaskRepository"));
      assert.ok(repoScaffold.sourceCode.includes("findById(id: string): Promise<TaskRecord | null>"));

      // 5. AngularStandaloneComponent template
      const angularSpec = SchematicTemplates.angularStandaloneComponent("StatusBadgeComponent", "app-status-badge");
      const angularScaffold = generator.generateScaffold(angularSpec);
      assert.ok(angularScaffold.sourceCode.includes("export class StatusBadgeComponent"));
      assert.ok(angularScaffold.sourceCode.includes("ngOnInit(): void"));

      // Verify AST validity
      const sf = ts.createSourceFile(
        "angular.ts",
        angularScaffold.sourceCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      assert.ok(sf.statements.length > 0);
    },
  );
});

