import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { StackDetector } from "../scheduler/stack/StackDetector.js";
import { DEFAULT_STACK_PROFILES, GENERIC_STACK_PROFILE } from "../scheduler/stack/defaultProfiles.js";
import { QueueGroomer } from "../scheduler/QueueGroomer.js";
import { PGliteDriver, MigrationRunner, StackProfileRepository } from "@cacophony/db";
import type { TaskRecord } from "@cacophony/shared-types";

describe("Stack & Skill Instruction Profile System", () => {
  describe("StackDetector Workspace Probing", () => {
    let tempDir: string;

    before(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-stack-test-"));
    });

    test("should detect typescript-nodenext profile when tsconfig has NodeNext", () => {
      const tsDir = path.join(tempDir, "ts-project");
      fs.mkdirSync(tsDir, { recursive: true });
      fs.writeFileSync(path.join(tsDir, "tsconfig.json"), JSON.stringify({
        compilerOptions: { moduleResolution: "NodeNext" }
      }));

      const detector = new StackDetector();
      const detected = detector.detect(tsDir);
      assert.equal(detected.id, "typescript-nodenext");
      assert.equal(detected.defaultTestRunner, "npm test");
    });

    test("should detect java-maven profile when pom.xml is present", () => {
      const mavenDir = path.join(tempDir, "maven-project");
      fs.mkdirSync(mavenDir, { recursive: true });
      fs.writeFileSync(path.join(mavenDir, "pom.xml"), "<project></project>");

      const detector = new StackDetector();
      const detected = detector.detect(mavenDir);
      assert.equal(detected.id, "java-maven");
      assert.equal(detected.defaultTestRunner, "mvn test");
      assert.ok(detected.directives.some((d) => d.includes("Java Clean Code")));
    });

    test("should detect go profile when go.mod is present", () => {
      const goDir = path.join(tempDir, "go-project");
      fs.mkdirSync(goDir, { recursive: true });
      fs.writeFileSync(path.join(goDir, "go.mod"), "module example.com/app\ngo 1.22");

      const detector = new StackDetector();
      const detected = detector.detect(goDir);
      assert.equal(detected.id, "go");
      assert.equal(detected.defaultTestRunner, "go test ./...");
    });

    test("should fall back to generic profile when no markers are detected", () => {
      const emptyDir = path.join(tempDir, "empty-project");
      fs.mkdirSync(emptyDir, { recursive: true });

      const detector = new StackDetector();
      const detected = detector.detect(emptyDir);
      assert.equal(detected.id, GENERIC_STACK_PROFILE.id);
    });
  });

  describe("QueueGroomer Stack-Aware Directives & Test Scoping", () => {
    test("should dynamically inject Java directives and test runner for Maven task", () => {
      const mavenProfile = DEFAULT_STACK_PROFILES.find((p) => p.id === "java-maven")!;
      const groomer = new QueueGroomer();

      const task: TaskRecord = {
        id: "task-java-1",
        title: "Build Order Service",
        prompt: "Create OrderService in order-service/src/main/java/OrderService.java",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: null,
        testCommand: null,
        focusFiles: "order-service/src/main/java/OrderService.java",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      const groomed = groomer.groom(task, { stackProfile: mavenProfile });
      assert.equal(groomed.stackProfile.id, "java-maven");
      assert.equal(groomed.scopedTestCommand, "mvn test");
      assert.ok(groomed.enrichedPrompt.includes("Java Clean Code"));
      assert.ok(groomed.groomNotes.some((n) => n.includes("Java (Maven)")));
    });

    test("should dynamically inject Rust directives and test runner for Cargo task", () => {
      const rustProfile = DEFAULT_STACK_PROFILES.find((p) => p.id === "rust")!;
      const groomer = new QueueGroomer();

      const task: TaskRecord = {
        id: "task-rust-1",
        title: "Implement Parser",
        prompt: "Write AST parser in parser/src/lib.rs",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: null,
        testCommand: null,
        focusFiles: "parser/src/lib.rs",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      const groomed = groomer.groom(task, { stackProfile: rustProfile });
      assert.equal(groomed.stackProfile.id, "rust");
      assert.equal(groomed.scopedTestCommand, "cargo test");
      assert.ok(groomed.enrichedPrompt.includes("Rust Idioms: Strict ownership"));
    });
  });

  describe("StackProfileRepository Relational Persistence", () => {
    let driver: PGliteDriver;
    let repo: StackProfileRepository;

    before(async () => {
      driver = new PGliteDriver();
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();
      repo = new StackProfileRepository(driver);
    });

    test("should persist and retrieve a custom stack instruction profile", async () => {
      const customProfile = {
        id: "python-fastapi-custom",
        name: "FastAPI / Poetry Custom",
        description: "Custom stack instruction profile for FastAPI apps",
        defaultTestRunner: "poetry run pytest",
        dataJson: JSON.stringify({
          directives: ["FastAPI async endpoints", "Pydantic v2 validation"],
          markers: [{ file: "pyproject.toml" }]
        })
      };

      await repo.save(customProfile);
      const retrieved = await repo.getById("python-fastapi-custom");
      assert.ok(retrieved);
      assert.equal(retrieved.id, "python-fastapi-custom");
      assert.equal(retrieved.name, "FastAPI / Poetry Custom");
      assert.equal(retrieved.defaultTestRunner, "poetry run pytest");
    });

    test("should list all saved stack profiles", async () => {
      const profiles = await repo.listAll();
      assert.ok(profiles.length >= 1);
      assert.equal(profiles[0]?.id, "python-fastapi-custom");
    });

    test("should delete a stack profile", async () => {
      const deleted = await repo.delete("python-fastapi-custom");
      assert.equal(deleted, true);
      const retrieved = await repo.getById("python-fastapi-custom");
      assert.equal(retrieved, null);
    });
  });
});
