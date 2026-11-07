import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";
import { CacophonyHttpServer } from "../daemon/CacophonyHttpServer.js";

describe("T-S13.4: Task Advisory Guidance and Doc Comment HTTP Endpoints", () => {
  let daemon: CacophonyDaemon;
  let server: CacophonyHttpServer;
  let tempDir: string;
  const testPort = 24198;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-advisory-"));
    const dbPath = path.join(tempDir, "advisory_test.sqlite");

    daemon = new CacophonyDaemon({
      dbPath,
      startScheduler: false,
    });
    await daemon.start();

    server = new CacophonyHttpServer(daemon, {
      httpPort: testPort,
      httpHost: "127.0.0.1",
    });
    await server.start();
  });

  after(async () => {
    await server.stop();
    await daemon.stop();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("should record, retrieve, and delete task advisory guidance via REST API", async () => {
    const taskId = "task-advisory-test-01";

    // 1. POST /api/tasks/:id/comments
    const postRes = await fetch(`${baseUrl}/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: "LeadArchitect",
        commentText: "Ensure strict adherence to interface contracts and no emojis in comments.",
        advisoryType: "CONSTRAINT",
        requiresComplianceAudit: true,
      }),
    });
    assert.equal(postRes.status, 201);
    const postData = (await postRes.json()) as { success: boolean; guidance: any };
    assert.equal(postData.success, true);
    assert.equal(postData.guidance.taskId, taskId);
    assert.equal(postData.guidance.advisoryType, "CONSTRAINT");

    const guidanceId = postData.guidance.id;

    // 2. GET /api/tasks/:id/comments
    const getRes = await fetch(`${baseUrl}/api/tasks/${taskId}/comments`);
    assert.equal(getRes.status, 200);
    const list = (await getRes.json()) as any[];
    assert.equal(list.length, 1);
    assert.equal(list[0].id, guidanceId);
    assert.equal(list[0].commentText, "Ensure strict adherence to interface contracts and no emojis in comments.");

    // 3. DELETE /api/tasks/:id/comments/:commentId
    const delRes = await fetch(`${baseUrl}/api/tasks/${taskId}/comments/${guidanceId}`, {
      method: "DELETE",
    });
    assert.equal(delRes.status, 200);
    const delData = (await delRes.json()) as { success: boolean };
    assert.equal(delData.success, true);

    // 4. Verify emptied list
    const getAfterDel = await fetch(`${baseUrl}/api/tasks/${taskId}/comments`);
    const listAfterDel = (await getAfterDel.json()) as any[];
    assert.equal(listAfterDel.length, 0);
  });

  it("should query doc comment candidates, accept candidate, and inject non-destructively", async () => {
    const candidateRepo = daemon.getDocCommentCandidateRepository();
    const filePath = path.join(tempDir, "sampleService.ts");

    // Write source file
    const sampleCode = `export class SampleService {\n  public performAction(input: string): boolean {\n    return input.length > 0;\n  }\n}\n`;
    await fs.writeFile(filePath, sampleCode, "utf-8");

    // Seed candidate
    const candidate = await candidateRepo.createCandidate({
      functionIdentifier: "performAction",
      filePath,
      candidateText: "/**\n * Validates that input is non-empty.\n * @param input Target string\n */",
      userGuidance: "keep it concise",
      modelId: "qwen2.5-coder:7b",
    });

    // 1. GET /api/doc-comments/candidates
    const candidatesRes = await fetch(
      `${baseUrl}/api/doc-comments/candidates?filePath=${encodeURIComponent(filePath)}&functionIdentifier=performAction`,
    );
    assert.equal(candidatesRes.status, 200);
    const candidateList = (await candidatesRes.json()) as any[];
    assert.equal(candidateList.length, 1);
    assert.equal(candidateList[0].id, candidate.id);

    // 2. POST /api/doc-comments/candidates/:id/accept
    const acceptRes = await fetch(`${baseUrl}/api/doc-comments/candidates/${candidate.id}/accept`, {
      method: "POST",
    });
    assert.equal(acceptRes.status, 200);
    const acceptData = (await acceptRes.json()) as any;
    assert.equal(acceptData.success, true);
    assert.equal(acceptData.candidate.status, "ACCEPTED");

    // 3. POST /api/doc-comments/inject
    const injectRes = await fetch(`${baseUrl}/api/doc-comments/inject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath,
        functionIdentifier: "performAction",
        commentText: candidate.candidateText,
        candidateId: candidate.id,
      }),
    });
    assert.equal(injectRes.status, 200);
    const injectData = (await injectRes.json()) as any;
    assert.equal(injectData.success, true);

    // 4. Verify modified file on disk
    const updatedContent = await fs.readFile(filePath, "utf-8");
    assert.ok(updatedContent.includes("Validates that input is non-empty."));
    assert.ok(updatedContent.includes("return input.length > 0;"));
  });
});
