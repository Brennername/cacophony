import test from "node:test";
import assert from "node:assert/strict";
import { AcceptanceCriteriaEngine } from "../inference/AcceptanceCriteriaEngine.js";

test("AcceptanceCriteriaEngine Suite (T81.2)", async (t) => {
  const engine = new AcceptanceCriteriaEngine();

  await t.test("should derive Given/When/Then criteria for API endpoint requirements", () => {
    const criteria = engine.deriveCriteria({
      id: "req-1",
      title: "POST /api/sessions/login",
      description: "Authenticates operator credentials",
      type: "api_endpoint",
      category: "Auth",
      constraints: [],
      httpMethod: "POST",
      routePath: "/api/sessions/login"
    });

    assert.ok(criteria.length >= 2);
    const successCrit = criteria[0]!;
    assert.strictEqual(successCrit.expectedStatusCode, 200);
    assert.ok(successCrit.scenario.includes("POST /api/sessions/login"));
    assert.strictEqual(successCrit.targetLayer, "backend");

    const errCrit = criteria[1]!;
    assert.strictEqual(errCrit.expectedStatusCode, 400);
    assert.ok(errCrit.scenario.includes("Reject invalid payload"));
  });

  await t.test("should generate node:test template for backend requirement", () => {
    const criteria = engine.deriveCriteria({
      id: "req-2",
      title: "Execute Database Transaction",
      description: "Applies atomic changes",
      type: "functional",
      category: "Database",
      constraints: []
    });

    const template = engine.generateTestTemplate(criteria[0]!, { moduleName: "TransactionRunner" });
    assert.strictEqual(template.framework, "node:test");
    assert.strictEqual(template.fileName, "transactionrunner.test.ts");
    assert.ok(template.testCode.includes("import test from 'node:test';"));
    assert.ok(template.testCode.includes("import assert from 'node:assert/strict';"));
    assert.ok(template.testCode.includes("TransactionRunner Suite"));
  });

  await t.test("should generate Angular component spec template for frontend requirement", () => {
    const criteria = engine.deriveCriteria({
      id: "req-3",
      title: "Task Inspector Modal Component",
      description: "Renders task inspect tabs",
      type: "functional",
      category: "Frontend UI",
      constraints: []
    });

    const template = engine.generateTestTemplate(criteria[0]!, { moduleName: "TaskInspectorModal" });
    assert.strictEqual(template.framework, "angular_spec");
    assert.strictEqual(template.fileName, "taskinspectormodal.component.spec.ts");
    assert.ok(template.testCode.includes("@angular/core/testing"));
    assert.ok(template.testCode.includes("TaskInspectorModalComponent"));
  });
});
