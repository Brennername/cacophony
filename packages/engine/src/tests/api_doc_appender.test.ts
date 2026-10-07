import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ApiDocAppender, type ApiEndpointSpec } from "../rules/ApiDocAppender.js";

test("ApiDocAppender Suite (T92.4.2)", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "apidoc-test-"));
  const specFile = path.join(tmpDir, "api_spec.md");

  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const endpoint: ApiEndpointSpec = {
    method: "POST",
    path: "/api/rules/synthesize",
    description: "Triggers deterministic rule synthesis for candidate diagnostic codes.",
    requestBody: { diagnosticCode: "TS2304" },
    responseStatusCode: 201,
    responseExample: { ruleId: "rule-ts2304-auto", status: "CREATED" },
  };

  await t.test("should generate structured markdown endpoint documentation", () => {
    const doc = ApiDocAppender.generateEndpointDoc(endpoint);
    assert.ok(doc.includes("### POST `/api/rules/synthesize`"));
    assert.ok(doc.includes("Triggers deterministic rule synthesis"));
    assert.ok(doc.includes('"diagnosticCode": "TS2304"'));
    assert.ok(doc.includes("`201 Created`"));
  });

  await t.test("should append documentation block to markdown spec file", async () => {
    await fs.writeFile(specFile, "# Cacophony API Specification\n\n## 1. REST Endpoints\n", "utf-8");

    const appended = await ApiDocAppender.appendEndpointToSpec(specFile, endpoint);
    assert.strictEqual(appended, true);

    const content = await fs.readFile(specFile, "utf-8");
    assert.ok(content.includes("### POST `/api/rules/synthesize`"));

    // Second append should return false (deduplication)
    const secondAppend = await ApiDocAppender.appendEndpointToSpec(specFile, endpoint);
    assert.strictEqual(secondAppend, false);
  });
});
