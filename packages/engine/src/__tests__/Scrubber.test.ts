import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EmojiScrubberRule } from "../scrubber/rules/EmojiScrubberRule.js";
import { EsmRelativeImportScrubberRule } from "../scrubber/rules/EsmRelativeImportScrubberRule.js";
import { ExtensionHeuristicScrubberRule } from "../scrubber/rules/ExtensionHeuristicScrubberRule.js";
import { BannedImportsScrubberRule } from "../scrubber/rules/BannedImportsScrubberRule.js";
import { JavaPackageScrubberRule } from "../scrubber/rules/JavaPackageScrubberRule.js";
import { PrettierFormattingScrubberRule } from "../scrubber/rules/PrettierFormattingScrubberRule.js";
import { CodeScrubber } from "../scrubber/CodeScrubber.js";
import { AstValidator } from "../scrubber/AstValidator.js";

describe("Deterministic Code Scrubber & AST Validation", () => {
  describe("EmojiScrubberRule & Feature Exemption", () => {
    const rule = new EmojiScrubberRule();

    test("should strip decorative emojis from code", () => {
      const code = 'const msg = "Task complete! \u{1F389}\u{1F680}"; // done \u{2705}';
      const result = rule.scrub(code, "test.ts");
      assert.equal(result.modified, true);
      assert.equal(result.content, 'const msg = "Task complete! "; // done ');
      assert.ok(result.issuesFixed.length > 0);
    });

    test("should bypass emoji scrubbing when allowEmojis option is true", () => {
      const code = 'const emojiPicker = "\u{1F600}\u{1F603}";';
      const result = rule.scrub(code, "EmojiPicker.ts", { allowEmojis: true });
      assert.equal(result.modified, false);
      assert.equal(result.content, code);
      assert.ok(result.issuesDetected[0]?.includes("bypassed via feature exemption"));
    });

    test("should bypass emoji scrubbing when file contains @cacophony-allow-emojis annotation", () => {
      const code = '// @cacophony-allow-emojis\nconst emojiIcon = "\u{1F600}";';
      const result = rule.scrub(code, "icons.ts");
      assert.equal(result.modified, false);
      assert.equal(result.content, code);
    });
  });

  describe("EsmRelativeImportScrubberRule (Stack-Gated)", () => {
    const rule = new EsmRelativeImportScrubberRule();

    test("should append .js when stack is typescript-nodenext", () => {
      const code = 'import { Foo } from "./Foo";\nimport { Bar } from "../utils/Bar";';
      assert.equal(rule.isApplicable("typescript-nodenext", "file.ts"), true);

      const result = rule.scrub(code, "file.ts");
      assert.equal(result.modified, true);
      assert.ok(result.content.includes('from "./Foo.js"'));
      assert.ok(result.content.includes('from "../utils/Bar.js"'));
    });

    test("should NOT be applicable when stack is typescript-bundler or angular", () => {
      assert.equal(rule.isApplicable("typescript-bundler", "file.ts"), false);
      assert.equal(rule.isApplicable("angular", "file.ts"), false);
      assert.equal(rule.isApplicable("java", "file.java"), false);
    });
  });

  describe("ExtensionHeuristicScrubberRule", () => {
    const rule = new ExtensionHeuristicScrubberRule();

    test("should rewrite literal .ts import to .js in NodeNext stack", () => {
      const code = 'import { config } from "./config.ts";';
      const result = rule.scrub(code, "index.ts", { stack: "typescript-nodenext" });
      assert.equal(result.modified, true);
      assert.equal(result.content, 'import { config } from "./config.js";');
    });

    test("should rewrite literal .ts import to bare in bundler stack", () => {
      const code = 'import { config } from "./config.ts";';
      const result = rule.scrub(code, "index.ts", { stack: "typescript-standard" });
      assert.equal(result.modified, true);
      assert.equal(result.content, 'import { config } from "./config";');
    });
  });

  describe("BannedImportsScrubberRule & Feature Exemptions", () => {
    const rule = new BannedImportsScrubberRule();

    test("should flag prohibited libraries by default", () => {
      const code = 'import express from "express";\nimport redis from "redis";';
      const result = rule.scrub(code, "server.ts", { bannedLibraries: ["express", "redis"] });
      assert.equal(result.issuesDetected.length, 2);
      assert.ok(result.issuesDetected[0]?.includes("express"));
      assert.ok(result.issuesDetected[1]?.includes("redis"));
    });

    test("should permit redis when allowedImports option is provided for feature", () => {
      const code = 'import express from "express";\nimport redis from "redis";';
      const result = rule.scrub(code, "cacheService.ts", {
        bannedLibraries: ["express", "redis"],
        allowedImports: ["redis"]
      });
      // redis is approved, only express should be flagged as forbidden
      assert.equal(result.issuesDetected.some((i) => i.includes("forbidden") && i.includes("express")), true);
      assert.equal(result.issuesDetected.some((i) => i.includes("forbidden") && i.includes("redis")), false);
      assert.equal(result.issuesDetected.some((i) => i.includes("approved") && i.includes("redis")), true);
    });

    test("should permit imports declared via inline // @cacophony-allow-import annotation", () => {
      const code = '// @cacophony-allow-import: redis\nimport redis from "redis";\nimport koa from "koa";';
      const result = rule.scrub(code, "session.ts", { bannedLibraries: ["redis", "koa"] });
      assert.equal(result.issuesDetected.some((i) => i.includes("forbidden") && i.includes("redis")), false);
      assert.equal(result.issuesDetected.some((i) => i.includes("forbidden") && i.includes("koa")), true);
    });

    test("should permit all imports when @cacophony-allow-all-imports is declared", () => {
      const code = '// @cacophony-allow-all-imports\nimport express from "express";\nimport redis from "redis";';
      const result = rule.scrub(code, "gateway.ts");
      assert.equal(result.issuesDetected.some((i) => i.includes("forbidden")), false);
      assert.ok(result.issuesDetected[0]?.includes("bypassed via universal import allowance"));
    });

    test("should skip rule entirely when disabledRules contains BannedImportsScrubberRule", () => {
      const code = 'import express from "express";';
      const result = rule.scrub(code, "server.ts", { disabledRules: ["BannedImportsScrubberRule"] });
      assert.equal(result.issuesDetected.some((i) => i.includes("forbidden")), false);
      assert.ok(result.issuesDetected[0]?.includes("skipped via rule disable flag"));
    });
  });

  describe("JavaPackageScrubberRule", () => {
    const rule = new JavaPackageScrubberRule();

    test("should inject package declaration when missing in Java source", () => {
      const code = "public class UserService {}\n";
      const result = rule.scrub(code, "src/main/java/com/example/service/UserService.java");
      assert.equal(result.modified, true);
      assert.ok(result.content.startsWith("package com.example.service;"));
    });

    test("should correct mismatched package declaration in Java source", () => {
      const code = "package com.wrong.pkg;\n\npublic class OrderService {}\n";
      const result = rule.scrub(code, "src/main/java/com/acme/orders/OrderService.java");
      assert.equal(result.modified, true);
      assert.ok(result.content.startsWith("package com.acme.orders;"));
    });

    test("should bypass package correction when allowPackageMismatch is true", () => {
      const code = "package com.custom;\npublic class CustomService {}\n";
      const result = rule.scrub(code, "src/main/java/com/acme/CustomService.java", {
        allowPackageMismatch: true
      });
      assert.equal(result.modified, false);
      assert.ok(result.issuesDetected[0]?.includes("skipped via exemption flag"));
    });
  });

  describe("PrettierFormattingScrubberRule", () => {
    const rule = new PrettierFormattingScrubberRule();

    test("should normalize CRLF line endings to LF", () => {
      const code = "const a = 1;\r\nconst b = 2;\r\n";
      const result = rule.scrub(code, "test.ts");
      assert.equal(result.modified, true);
      assert.equal(result.content, "const a = 1;\nconst b = 2;\n");
      assert.ok(result.issuesFixed.some((i) => i.includes("Normalized CRLF")));
    });

    test("should strip trailing whitespace from line ends", () => {
      const code = "const a = 1;   \nconst b = 2;\t\n";
      const result = rule.scrub(code, "test.ts");
      assert.equal(result.modified, true);
      assert.equal(result.content, "const a = 1;\nconst b = 2;\n");
      assert.ok(result.issuesFixed.some((i) => i.includes("trailing whitespace")));
    });

    test("should ensure single EOF newline", () => {
      const code = "const a = 1;\n\n\n";
      const result = rule.scrub(code, "test.ts");
      assert.equal(result.modified, true);
      assert.equal(result.content, "const a = 1;\n");
      assert.ok(result.issuesFixed.some((i) => i.includes("single EOF newline")));
    });

    test("should skip when disabled in options", () => {
      const code = "const a = 1;   \r\n";
      const result = rule.scrub(code, "test.ts", { disabledRules: ["PrettierFormattingScrubberRule"] });
      assert.equal(result.modified, false);
      assert.equal(result.content, code);
      assert.ok(result.issuesDetected[0]?.includes("skipped via rule disable flag"));
    });
  });

  describe("CodeScrubber Engine Pipeline & Universal Exemptions", () => {
    const scrubber = new CodeScrubber();

    test("should execute rules across content pipeline", () => {
      const code = 'import { a } from "./a";\nconst title = "Hello \u{1F600}";';
      const result = scrubber.scrubContent(code, "src/app.ts", { stack: "typescript-nodenext" });
      assert.equal(result.modified, true);
      assert.ok(result.content.includes('from "./a.js"'));
      assert.ok(!result.content.includes("\u{1F600}"));
    });

    test("should allow redis and bypass emoji scrubbing when feature flags are provided", () => {
      const code = 'import redis from "redis";\nconst icon = "\u{1F600}";\n';
      const result = scrubber.scrubContent(code, "src/cache.ts", {
        stack: "typescript-nodenext",
        allowedImports: ["redis"],
        allowEmojis: true
      });
      assert.equal(result.modified, false);
      assert.ok(result.content.includes("\u{1F600}"));
      assert.equal(result.issuesDetected.some((i) => i.includes("forbidden") && i.includes("redis")), false);
    });

    test("should bypass specific rule when listed in disabledRules", () => {
      const code = 'import { config } from "./config";\n';
      const result = scrubber.scrubContent(code, "src/main.ts", {
        stack: "typescript-nodenext",
        disabledRules: ["EsmRelativeImportScrubberRule"]
      });
      assert.equal(result.modified, false);
      assert.ok(result.content.includes('from "./config"'));
      assert.ok(result.issuesDetected.some((i) => i.includes("skipped via exemption flag")));
    });

    test("should bypass all scrubbing when @cacophony-disable-all-scrubbers annotation is present", () => {
      const code = '// @cacophony-disable-all-scrubbers\nimport express from "express";\nconst x = "\u{1F680}";';
      const result = scrubber.scrubContent(code, "src/raw.ts", { stack: "typescript-nodenext" });
      assert.equal(result.modified, false);
      assert.ok(result.content.includes("express"));
      assert.ok(result.content.includes("\u{1F680}"));
      assert.ok(result.issuesDetected[0]?.includes("bypassed via file-level exemption"));
    });
  });


  describe("AstValidator", () => {
    const validator = new AstValidator();

    test("should validate compliant TypeScript", () => {
      const code = "export const x: number = 42;\nexport function add(a: number, b: number): number { return a + b; }";
      const result = validator.validateTypeScript(code, "math.ts");
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
      assert.equal(result.exportsCount, 2);
    });

    test("should detect syntax errors in TypeScript", () => {
      const brokenCode = "export const x: = 42; function ( {";
      const result = validator.validateTypeScript(brokenCode, "bad.ts");
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    test("should validate Java bracket balancing", () => {
      const goodJava = "package com.example;\npublic class App { public void run() { System.out.println(1); } }";
      const goodRes = validator.validateJava(goodJava);
      assert.equal(goodRes.valid, true);

      const badJava = "public class App { public void run() {";
      const badRes = validator.validateJava(badJava);
      assert.equal(badRes.valid, false);
      assert.ok(badRes.errors[0]?.includes("Unclosed opening braces"));
    });
  });
});
