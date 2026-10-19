import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ImportPruningEngine } from "../context/ImportPruningEngine.js";

describe("T102.14.4: ImportPruningEngine Unit Tests", () => {
  const engine = new ImportPruningEngine();

  describe("pruneUnusedImports", () => {
    it("should prune unused named imports from external packages", () => {
      const source = [
        'import { unusedA, unusedB } from "lodash";',
        'import { usedFunction } from "utility-lib";',
        "",
        "const result = usedFunction(123);",
        "console.log(result);",
      ].join("\n");

      const pruned = engine.pruneUnusedImports(source);

      assert.ok(!pruned.includes("lodash"), "Unused lodash import should be removed");
      assert.ok(pruned.includes('import { usedFunction } from "utility-lib";'), "Used function import must be retained");
      assert.ok(pruned.includes("usedFunction(123)"), "Body code must remain intact");
    });

    it("should preserve side-effect imports without import clauses", () => {
      const source = [
        'import "reflect-metadata";',
        'import "./polyfills.js";',
        'import { unused } from "heavy-dep";',
        "",
        "console.log('App running');",
      ].join("\n");

      const pruned = engine.pruneUnusedImports(source);

      assert.ok(pruned.includes('import "reflect-metadata";'), "Side-effect import must be preserved");
      assert.ok(pruned.includes('import "./polyfills.js";'), "Relative side-effect import must be preserved");
      assert.ok(!pruned.includes("heavy-dep"), "Unused external import must be pruned");
    });

    it("should preserve relative module imports even if symbols appear unused", () => {
      const source = [
        'import { localConfig } from "./config.js";',
        'import { relativeHelper } from "../helpers/tool.js";',
        "",
        "console.log('Relative test');",
      ].join("\n");

      const pruned = engine.pruneUnusedImports(source);

      assert.ok(pruned.includes("./config.js"), "Relative ./ import must be preserved");
      assert.ok(pruned.includes("../helpers/tool.js"), "Relative ../ import must be preserved");
    });

    it("should preserve explicitly allowed or required modules", () => {
      const source = [
        'import { inject } from "@angular/core";',
        'import { Observable } from "rxjs";',
        "",
        "console.log('Framework boilerplate');",
      ].join("\n");

      const pruned = engine.pruneUnusedImports(source, ["@angular/core"]);

      assert.ok(pruned.includes("@angular/core"), "Explicitly allowed module must be preserved");
      assert.ok(!pruned.includes("rxjs"), "Unallowed unused module must be pruned");
    });

    it("should preserve default and namespace imports when referenced in code", () => {
      const source = [
        'import React from "react";',
        'import * as path from "node:path";',
        'import * as fs from "node:fs";',
        "",
        "const p = path.join('a', 'b');",
        "export default React;",
      ].join("\n");

      const pruned = engine.pruneUnusedImports(source);

      assert.ok(pruned.includes('import React from "react";'), "Used default import must be preserved");
      assert.ok(pruned.includes('import * as path from "node:path";'), "Used namespace import must be preserved");
      assert.ok(!pruned.includes("node:fs"), "Unused namespace import must be pruned");
    });

    it("should handle empty strings and malformed source gracefully", () => {
      assert.equal(engine.pruneUnusedImports(""), "");
      assert.equal(engine.pruneUnusedImports("   "), "   ");
      const plainCode = "const a = 1;\nconsole.log(a);";
      assert.equal(engine.pruneUnusedImports(plainCode), plainCode);
    });
  });

  describe("consolidateImports", () => {
    it("should consolidate duplicate named imports from the same specifier", () => {
      const source = [
        'import { alpha } from "my-module";',
        'import { beta } from "my-module";',
        'import { gamma } from "other-module";',
        "",
        "console.log(alpha, beta, gamma);",
      ].join("\n");

      const consolidated = engine.consolidateImports(source);

      // Should contain consolidated import for my-module with both alpha and beta
      assert.ok(consolidated.includes('from "my-module";'));
      assert.ok(consolidated.includes("alpha"));
      assert.ok(consolidated.includes("beta"));
      // Only 1 import statement for my-module
      const myModuleOccurrences = (consolidated.match(/from "my-module"/g) || []).length;
      assert.equal(myModuleOccurrences, 1);
    });

    it("should retain default import when consolidating with named imports", () => {
      const source = [
        'import defaultItem from "shared-lib";',
        'import { namedItem } from "shared-lib";',
        "",
        "console.log(defaultItem, namedItem);",
      ].join("\n");

      const consolidated = engine.consolidateImports(source);

      assert.ok(consolidated.includes("defaultItem"));
      assert.ok(consolidated.includes("namedItem"));
      assert.ok(consolidated.includes('from "shared-lib";'));
      const occurrences = (consolidated.match(/from "shared-lib"/g) || []).length;
      assert.equal(occurrences, 1);
    });

    it("should return unchanged code when no duplicate imports exist", () => {
      const source = [
        'import { a } from "mod-a";',
        'import { b } from "mod-b";',
        "",
        "console.log(a, b);",
      ].join("\n");

      const result = engine.consolidateImports(source);
      assert.equal(result, source);
    });
  });
});
