import test from "node:test";
import assert from "node:assert/strict";
import { DependencyGraphSequencer, type DecomposedTaskNode } from "../inference/DependencyGraphSequencer.js";

test("DependencyGraphSequencer Suite (T81.4)", async (t) => {
  const sequencer = new DependencyGraphSequencer();

  await t.test("should sequence tasks in architectural dependency order", () => {
    const tasks: DecomposedTaskNode[] = [
      {
        id: "task-ui",
        title: "Build Login Component",
        role: "implementer",
        category: "component",
        dependencies: ["task-service"],
        focusFiles: [],
        testCommand: "npm test"
      },
      {
        id: "task-types",
        title: "Define User Types",
        role: "architect",
        category: "types",
        dependencies: [],
        focusFiles: [],
        testCommand: "npm test"
      },
      {
        id: "task-service",
        title: "Implement AuthService",
        role: "implementer",
        category: "service",
        dependencies: ["task-repo"],
        focusFiles: [],
        testCommand: "npm test"
      },
      {
        id: "task-repo",
        title: "Implement UserRepository",
        role: "implementer",
        category: "repository",
        dependencies: ["task-types", "task-migration"],
        focusFiles: [],
        testCommand: "npm test"
      },
      {
        id: "task-migration",
        title: "Create users table migration",
        role: "implementer",
        category: "migration",
        dependencies: ["task-types"],
        focusFiles: [],
        testCommand: "npm test"
      }
    ];

    const sequenced = sequencer.sequenceTasks(tasks);
    const order = sequenced.map((t) => t.id);

    // Types must be before repo, repo before service, service before UI
    assert.ok(order.indexOf("task-types") < order.indexOf("task-repo"));
    assert.ok(order.indexOf("task-migration") < order.indexOf("task-repo"));
    assert.ok(order.indexOf("task-repo") < order.indexOf("task-service"));
    assert.ok(order.indexOf("task-service") < order.indexOf("task-ui"));
  });

  await t.test("should detect and break circular dependencies gracefully", () => {
    const cyclicalTasks: DecomposedTaskNode[] = [
      {
        id: "task-a",
        title: "Service A",
        role: "implementer",
        category: "service",
        dependencies: ["task-b"],
        focusFiles: [],
        testCommand: "npm test"
      },
      {
        id: "task-b",
        title: "Service B",
        role: "implementer",
        category: "service",
        dependencies: ["task-a"],
        focusFiles: [],
        testCommand: "npm test"
      }
    ];

    const sequenced = sequencer.sequenceTasks(cyclicalTasks);
    assert.strictEqual(sequenced.length, 2);
  });
});
