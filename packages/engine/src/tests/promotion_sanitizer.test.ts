import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PromotionSanitizer } from "../gitea/PromotionSanitizer.js";

describe("PromotionSanitizer Suite (T80.2)", () => {
  test("scanSecrets detects AWS keys, GitHub tokens, Slack tokens, and private keys", () => {
    const sanitizer = new PromotionSanitizer();

    const sampleAws = ["AKIA", "IOSFODNN7EXAMPLE"].join("");
    const sampleGh = ["ghp", "_1234567890abcdefghijklmnopqrstuvwxyz"].join("");
    const sampleSlack = ["xoxb", "123456789012", "1234567890123", "abcdefghijklmnopqrstuvwx"].join("-");
    const sampleOpenAi = ["sk-", "abcdefghijklmnopqrstuvwxyz123456"].join("");
    const sampleKeyHeader = ["-----BEGIN ", "RSA PRIVATE KEY-----"].join("");

    const diffWithSecrets = `
--- a/config.ts
+++ b/config.ts
@@ -1,3 +1,5 @@
+const awsKey = "${sampleAws}";
+const ghToken = "${sampleGh}";
+const slack = "${sampleSlack}";
+const openAi = "${sampleOpenAi}";
+const keyHeader = "${sampleKeyHeader}";
`;

    const violations = sanitizer.scanSecrets(diffWithSecrets, "config.ts");
    assert.equal(violations.length, 5);
    assert.equal(violations[0]!.type, "secret_leak");
    assert.match(violations[0]!.message, /AWS Access Key/);
    assert.match(violations[1]!.message, /GitHub Personal Access Token/);
    assert.match(violations[2]!.message, /Slack Token/);
    assert.match(violations[3]!.message, /OpenAI \/ Anthropic API Key/);
    assert.match(violations[4]!.message, /Private Key Header/);
  });

  test("scanEmojis detects prohibited unicode emojis", () => {
    const sanitizer = new PromotionSanitizer();

    const rocketEmoji = "\u{1F680}";
    const diffWithEmoji = `
--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,3 @@
+// Launch feature ${rocketEmoji}
+export const enabled = true;
`;

    const violations = sanitizer.scanEmojis(diffWithEmoji, "file.ts");
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.type, "prohibited_emoji");
    assert.equal(violations[0]!.match, rocketEmoji);
  });

  test("scanHygiene detects banned imports (acorn, eventsource)", () => {
    const sanitizer = new PromotionSanitizer();

    const diffWithBanned = `
--- a/parser.ts
+++ b/parser.ts
@@ -1,1 +1,3 @@
+import * as acorn from "acorn";
+import { EventSource } from "eventsource";
`;

    const violations = sanitizer.scanHygiene(diffWithBanned, undefined, "parser.ts");
    assert.equal(violations.length, 2);
    assert.equal(violations[0]!.type, "banned_import");
    assert.equal(violations[0]!.match, "acorn");
    assert.equal(violations[1]!.type, "banned_import");
    assert.equal(violations[1]!.match, "eventsource");
  });

  test("scanHygiene flags unpermitted loose root files", () => {
    const sanitizer = new PromotionSanitizer();

    const fileList = [
      "package.json",
      "README.md",
      "packages/engine/src/index.ts",
      "temp_script.js",
      "scratch_test.ts"
    ];

    const violations = sanitizer.scanHygiene(undefined, fileList);
    assert.equal(violations.length, 2);
    assert.equal(violations[0]!.type, "loose_root_file");
    assert.equal(violations[0]!.file, "temp_script.js");
    assert.equal(violations[1]!.type, "loose_root_file");
    assert.equal(violations[1]!.file, "scratch_test.ts");
  });

  test("sanitize gauntlet returns passed: true for clean diff and files", () => {
    const sanitizer = new PromotionSanitizer();

    const cleanDiff = `
--- a/clean.ts
+++ b/clean.ts
@@ -1,2 +1,3 @@
+export function computeSum(a: number, b: number): number {
+  return a + b;
+}
`;

    const cleanFiles = ["package.json", "packages/engine/src/clean.ts"];
    const report = sanitizer.sanitize({ diff: cleanDiff, filePaths: cleanFiles });

    assert.equal(report.passed, true);
    assert.equal(report.totalErrors, 0);
    assert.match(report.summary, /passed with 0 violations/);
  });
});
