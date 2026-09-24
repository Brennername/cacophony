import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { AstParameterCorrectionRules } from "../catalog/AstParameterCorrectionRules.js";
import { GoSignatureHarvester } from "../../signature/GoSignatureHarvester.js";
import { RustSignatureHarvester } from "../../signature/RustSignatureHarvester.js";
import { GoAstScrubberRule } from "../../scrubber/rules/GoAstScrubberRule.js";
import { RustSyntaxScrubberRule } from "../../scrubber/rules/RustSyntaxScrubberRule.js";
import { QueueGroomer } from "../../scheduler/QueueGroomer.js";
import type { CodeSignatureRecord } from "@cacophony/shared-types";

describe("Phase 37: Multi-Stack Profile Verifiers, AST Inversion Repair & Scrubber Catalog", () => {
  it("T37.1: AstParameterCorrectionRules should detect and fix transposed arguments", () => {
    const rule = new AstParameterCorrectionRules();
    const source = `
      function transferFunds(sourceAccount: string, destinationAccount: string): void {
        console.log(sourceAccount, destinationAccount);
      }

      function execute() {
        const sourceAccount = "acc-1";
        const destinationAccount = "acc-2";
        transferFunds(destinationAccount, sourceAccount);
      }
    `;

    const res = rule.correctTransposedArguments("services/TransferService.ts", source);
    assert.equal(res.modified, true);
    assert.equal(res.correctionsCount, 1);
    assert.ok(res.code.includes("transferFunds(sourceAccount, destinationAccount)"));
  });

  it("T37.2: GoSignatureHarvester should parse structs, interfaces, and methods", () => {
    const harvester = new GoSignatureHarvester();
    const goSource = `
      package service

      type UserRepository struct {
        DbConn string
        TimeoutSeconds int
      }

      type Authenticator interface {
        Authenticate(token string) bool
      }

      func (r *UserRepository) FindUser(userId string) string {
        return "user-" + userId
      }
    `;

    const records = harvester.harvest("pkg/user/repo.go", goSource);
    assert.ok(records.length >= 3);

    const structRec = records.find((r: CodeSignatureRecord) => r.identifier === "UserRepository");
    assert.ok(structRec);
    assert.equal(structRec.kind, "type");
    assert.equal(structRec.properties.length, 2);

    const ifaceRec = records.find((r: CodeSignatureRecord) => r.identifier === "Authenticator");
    assert.ok(ifaceRec);
    assert.equal(ifaceRec.kind, "interface");
    assert.equal(ifaceRec.callables[0]?.name, "Authenticate");
  });

  it("T37.2: GoAstScrubberRule should strip emojis and format tabs", () => {
    const scrubber = new GoAstScrubberRule();
    const sourceWithEmojis = `
      package main
      // Hello world 😀
      func main() {
          fmt.Println("Rocket 🚀")
      }
    `;

    const res = scrubber.scrub(sourceWithEmojis, "main.go");
    assert.equal(res.modified, true);
    assert.ok(!res.content.includes("😀"));
    assert.ok(!res.content.includes("🚀"));
    assert.ok(res.content.includes("\tfmt.Println"));
  });

  it("T37.3: RustSignatureHarvester should parse pub struct, trait, and fn signatures", () => {
    const harvester = new RustSignatureHarvester();
    const rustSource = `
      pub struct TaskScheduler {
        pub capacity: usize,
        pub active_model: Option<String>,
      }

      pub trait WorkerEngine {
        async fn process_task(&self, task_id: String) -> bool;
      }

      pub fn create_scheduler(capacity: usize) -> TaskScheduler {
        TaskScheduler { capacity, active_model: None }
      }
    `;

    const records = harvester.harvest("crates/engine/src/lib.rs", rustSource);
    assert.ok(records.length >= 3);

    const structRec = records.find((r) => r.identifier === "TaskScheduler");
    assert.ok(structRec);
    assert.equal(structRec.properties.length, 2);

    const traitRec = records.find((r) => r.identifier === "WorkerEngine");
    assert.ok(traitRec);
    assert.equal(traitRec.callables[0]?.name, "process_task");

    const fnRec = records.find((r) => r.identifier === "create_scheduler");
    assert.ok(fnRec);
    assert.equal(fnRec.callables[0]?.returnType, "TaskScheduler");
  });

  it("T37.3: RustSyntaxScrubberRule should strip code fences and emojis", () => {
    const scrubber = new RustSyntaxScrubberRule();
    const rawOutput = "```rust\npub fn hello() {\n  // Great job 🎉\n}\n```";

    const res = scrubber.scrub(rawOutput, "src/lib.rs");
    assert.equal(res.modified, true);
    assert.ok(!res.content.includes("```"));
    assert.ok(!res.content.includes("🎉"));
    assert.ok(res.content.includes("pub fn hello()"));
  });

  it("T37.2 & T37.3: QueueGroomer should scope test command for Go and Rust workspaces", () => {
    const groomer = new QueueGroomer("/tmp");
    const goTask: any = {
      id: "task-go",
      title: "Fix user model",
      prompt: "Update model in internal/user/model.go",
      role: "implementer",
      status: "PENDING",
      priority: "P1",
      focusFiles: "internal/user/model.go",
      testCommand: null
    };

    const groomed = groomer.groom(goTask, {
      stackProfile: {
        id: "go",
        name: "Go Module",
        directives: [],
        defaultTestRunner: "go test ./..."
      } as any
    });

    assert.equal(groomed.scopedTestCommand, "go test ./internal/user/...");
  });
});
