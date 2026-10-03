import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { IncrementalClassMerger } from "../context/IncrementalClassMerger.js";

describe("IncrementalClassMerger Test Suite", () => {
  test("should preserve existing methods when newly generated code only contains new method", () => {
    const original = `import { A } from "./A.js";

export class WorkerPipeline {
  constructor(private readonly config: any) {}

  public executeTask(): boolean {
    return true;
  }

  public existingMethod(): string {
    return "original";
  }
}
`;

    const generated = `import { B } from "./B.js";

export class WorkerPipeline {
  public newFeature(): number {
    return 42;
  }
}
`;

    const merged = IncrementalClassMerger.merge(original, generated);
    assert.ok(merged.includes("public executeTask(): boolean"));
    assert.ok(merged.includes("public existingMethod(): string"));
    assert.ok(merged.includes("public newFeature(): number"));
    assert.ok(merged.includes('import { B } from "./B.js"'));
    assert.ok(merged.includes('import { A } from "./A.js"'));
  });

  test("should ignore placeholder stubs and preserve existing implementation", () => {
    const original = `export class Service {
  public computeValue(): number {
    const a = 10;
    const b = 20;
    return a + b;
  }
}
`;

    const generated = `export class Service {
  public computeValue(): number {
    /* existing implementation */
  }

  public helper(): boolean {
    return true;
  }
}
`;

    const merged = IncrementalClassMerger.merge(original, generated);
    assert.ok(merged.includes("const a = 10;"));
    assert.ok(merged.includes("public helper(): boolean"));
  });

  test("should replace existing method in-place when new implementation is fully provided", () => {
    const original = `export class Pipeline {
  public run(): string {
    return "old implementation";
  }

  public other(): number {
    return 100;
  }
}
`;

    const generated = `export class Pipeline {
  public run(): string {
    return "new hardened implementation";
  }
}
`;

    const merged = IncrementalClassMerger.merge(original, generated);
    assert.ok(merged.includes("new hardened implementation"));
    assert.ok(!merged.includes("old implementation"));
    assert.ok(merged.includes("public other(): number"));
  });

  test("should inject route handler into CacophonyHttpServer before static asset fallback", () => {
    const original = `import http from "node:http";

export class CacophonyHttpServer {
  public handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname === "/api/health") {
      res.end("ok");
      return;
    }
    // Static asset fallback or 404
    this.serveStatic(req, res);
  }
}
`;

    const generated = `if (url.pathname === "/api/fleet/metrics" && req.method === "GET") {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "healthy" }));
  return;
}
`;

    const merged = IncrementalClassMerger.merge(original, generated);
    assert.ok(merged.includes('url.pathname === "/api/fleet/metrics"'));
    assert.ok(merged.includes('url.pathname === "/api/health"'));
    assert.ok(merged.includes("this.serveStatic(req, res);"));
  });

  test("should guard against destructive overwrites when generated snippet is short and not valid class", () => {
    const original = "export class LargeSystem {\n" + "  public method() { return 1; }\n".repeat(80) + "}\n";
    const generated = "// fragment with no class declaration\nconst x = 123;\n";

    const merged = IncrementalClassMerger.merge(original, generated);
    assert.strictEqual(merged, original);
  });
});
