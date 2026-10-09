import test from "node:test";
import assert from "node:assert/strict";
import { ProjectSpecIngestionService } from "../inference/ProjectSpecIngestionService.js";

test("ProjectSpecIngestionService Suite (T81.1)", async (t) => {
  const service = new ProjectSpecIngestionService();

  await t.test("should parse markdown headings, requirements, and API routes", () => {
    const markdown = [
      "# Real-Time Notification System",
      "An asynchronous event broadcasting service.",
      "",
      "## Technical Rules and Constraints",
      "- Zero emojis in any code or comments.",
      "- Strict SOLID principles and TypeScript typing.",
      "- Mobile-first responsive UI with dark mode.",
      "",
      "## REST API Endpoints",
      "POST /api/notifications/send - Dispatches priority notification to client",
      "GET /api/notifications/unread - Retrieves unread notifications for active user",
      "",
      "## Functional Requirements",
      "- Persist notifications to database table with timestamps",
      "- Broadcast real-time SSE event to connected browser sessions",
      "- Enforce rate limit of 100 requests per minute per IP"
    ].join("\n");

    const parsed = service.parseMarkdown(markdown, "Notifications");
    assert.strictEqual(parsed.title, "Real-Time Notification System");
    assert.ok(parsed.requirements.length >= 5);
    assert.strictEqual(parsed.apiEndpoints.length, 2);
    assert.strictEqual(parsed.apiEndpoints[0]?.method, "POST");
    assert.strictEqual(parsed.apiEndpoints[0]?.path, "/api/notifications/send");
    assert.strictEqual(parsed.apiEndpoints[1]?.method, "GET");

    assert.ok(parsed.technicalConstraints.includes("Zero emojis in code, comments, and commit messages"));
    assert.ok(parsed.technicalConstraints.includes("Strict SOLID principles enforcement"));
    assert.ok(parsed.technicalConstraints.includes("Mobile-first responsive layout (WCAG AAA touch targets 44x44px)"));
  });

  await t.test("should parse JSON / OpenAPI specification documents", () => {
    const openApiJson = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "Payment Gateway API", version: "1.0.0" },
      paths: {
        "/api/payments/charge": {
          post: {
            summary: "Create transaction charge",
            tags: ["Billing"]
          }
        },
        "/api/payments/refund": {
          post: {
            summary: "Issue full or partial refund",
            tags: ["Billing"]
          }
        }
      }
    });

    const parsed = service.parseJsonOrOpenApi(openApiJson, "openapi.json");
    assert.strictEqual(parsed.title, "Payment Gateway API");
    assert.strictEqual(parsed.apiEndpoints.length, 2);
    assert.strictEqual(parsed.apiEndpoints[0]?.method, "POST");
    assert.strictEqual(parsed.apiEndpoints[0]?.path, "/api/payments/charge");
    assert.strictEqual(parsed.requirements[0]?.category, "Billing");
  });
});
