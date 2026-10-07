import test from "node:test";
import assert from "node:assert/strict";
import { StubCommentSanitizer } from "../testing/StubCommentSanitizer.js";

test("StubCommentSanitizer Suite (T93.3.1)", async (t) => {
  const codeWithStubs = `import { Service } from "./service.js";

export class OrderProcessor {
  public execute(): void {
    /* [CACOPHONY_HASH_STUB:1a2b3c4d:execute] */
    // [CACOPHONY_CAGE:scope-lock]
    console.log("running order");
  }
}
`;

  await t.test("detects residual stubs and cage comments", () => {
    assert.equal(StubCommentSanitizer.hasResidualStubs(codeWithStubs), true);
    const markers = StubCommentSanitizer.findResidualMarkers(codeWithStubs);
    assert.equal(markers.length, 2);
    assert.ok(markers.some((m) => m.includes("CACOPHONY_HASH_STUB:1a2b3c4d:execute")));
    assert.ok(markers.some((m) => m.includes("CACOPHONY_CAGE:scope-lock")));
  });

  await t.test("sanitizes code and strips all comments without corrupting structure", () => {
    const result = StubCommentSanitizer.sanitize(codeWithStubs);
    assert.equal(result.removedCount, 2);
    assert.equal(result.residualMarkers.length, 0);
    assert.ok(!result.sanitizedCode.includes("CACOPHONY_HASH_STUB"));
    assert.ok(!result.sanitizedCode.includes("CACOPHONY_CAGE"));
    assert.ok(result.sanitizedCode.includes('console.log("running order");'));
    assert.equal(StubCommentSanitizer.hasResidualStubs(result.sanitizedCode), false);
  });

  await t.test("returns untouched code when no stubs exist", () => {
    const cleanCode = 'export const PI = 3.14159;\n';
    const result = StubCommentSanitizer.sanitize(cleanCode);
    assert.equal(result.removedCount, 0);
    assert.equal(result.residualMarkers.length, 0);
    assert.equal(result.sanitizedCode.trim(), cleanCode.trim());
  });
});
