import fs from "node:fs/promises";
import path from "node:path";

export type RequirementType =
  | "functional"
  | "non-functional"
  | "constraint"
  | "api_endpoint"
  | "data_model";

export interface RequirementNode {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly type: RequirementType;
  readonly category: string;
  readonly constraints: readonly string[];
  readonly httpMethod?: string | undefined;
  readonly routePath?: string | undefined;
  readonly children?: readonly RequirementNode[] | undefined;
}

export interface ApiEndpointSpec {
  readonly method: string;
  readonly path: string;
  readonly summary: string;
  readonly requestBodySchema?: string | undefined;
  readonly responseStatusCode?: number | undefined;
}

export interface ParsedSpecDocument {
  readonly title: string;
  readonly description: string;
  readonly requirements: readonly RequirementNode[];
  readonly technicalConstraints: readonly string[];
  readonly apiEndpoints: readonly ApiEndpointSpec[];
}

/**
 * ProjectSpecIngestionService
 *
 * Implements autonomous project file and specification ingestion (Phase 81 T81.1).
 * Ingests markdown specs, README files, or OpenAPI definitions and parses them into
 * typed requirement trees with extracted technical constraints and API endpoints.
 */
export class ProjectSpecIngestionService {
  /**
   * Reads a specification file from disk and parses into a structured specification document.
   */
  public async ingestFile(filePath: string): Promise<ParsedSpecDocument> {
    const content = await fs.readFile(filePath, "utf-8");
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".json") {
      return this.parseJsonOrOpenApi(content, filePath);
    }
    return this.parseMarkdown(content, path.basename(filePath, ext));
  }

  /**
   * Parses markdown documents extracting headings, requirement bullet points, and API route markers.
   */
  public parseMarkdown(content: string, defaultTitle = "Specification"): ParsedSpecDocument {
    const lines = content.split("\n");
    let title = defaultTitle;
    let description = "";
    const requirements: RequirementNode[] = [];
    const endpoints: ApiEndpointSpec[] = [];

    let currentSection = "General";
    let sectionType: RequirementType = "functional";
    let nodeIndex = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;

      // Extract document title from # H1
      if (line.startsWith("# ") && title === defaultTitle) {
        title = line.slice(2).trim();
        continue;
      }

      // Extract section title from ## H2 or ### H3
      if (line.startsWith("## ") || line.startsWith("### ")) {
        currentSection = line.replace(/^#+\s*/, "").trim();
        const lowerSection = currentSection.toLowerCase();
        if (lowerSection.includes("constraint") || lowerSection.includes("rule")) {
          sectionType = "constraint";
        } else if (lowerSection.includes("non-functional") || lowerSection.includes("performance") || lowerSection.includes("security")) {
          sectionType = "non-functional";
        } else if (lowerSection.includes("api") || lowerSection.includes("endpoint") || lowerSection.includes("route")) {
          sectionType = "api_endpoint";
        } else if (lowerSection.includes("model") || lowerSection.includes("schema") || lowerSection.includes("database")) {
          sectionType = "data_model";
        } else {
          sectionType = "functional";
        }
        continue;
      }

      // Check for API route definition: GET/POST/PUT/PATCH/DELETE /api/...
      const apiMatch = line.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+([/a-zA-Z0-9_\-:]+)(?:\s*[-:]\s*(.*))?/i);
      if (apiMatch) {
        const method = apiMatch[1]!.toUpperCase();
        const routePath = apiMatch[2]!;
        const summary = apiMatch[3]?.trim() || `Handle ${method} ${routePath}`;
        endpoints.push({ method, path: routePath, summary });
        requirements.push({
          id: `req-api-${endpoints.length}`,
          title: `${method} ${routePath}`,
          description: summary,
          type: "api_endpoint",
          category: currentSection,
          constraints: [],
          httpMethod: method,
          routePath
        });
        continue;
      }

      // Bulleted requirement: - or *
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const reqText = line.replace(/^[-*]\s*/, "").trim();
        if (reqText.length > 5) {
          requirements.push({
            id: `req-${nodeIndex++}`,
            title: reqText.length > 60 ? `${reqText.slice(0, 57)}...` : reqText,
            description: reqText,
            type: sectionType,
            category: currentSection,
            constraints: []
          });
        }
        continue;
      }

      // Collect initial description text
      if (!description && !line.startsWith("#")) {
        description = line;
      }
    }

    const technicalConstraints = this.extractConstraints(content);

    return {
      title,
      description: description || `Ingested specification for ${title}`,
      requirements,
      technicalConstraints,
      apiEndpoints: endpoints
    };
  }

  /**
   * Parses JSON or OpenAPI 3.0 specification documents.
   */
  public parseJsonOrOpenApi(content: string, filePath: string): ParsedSpecDocument {
    try {
      const data = JSON.parse(content);
      const title = data.info?.title || path.basename(filePath, ".json");
      const description = data.info?.description || "OpenAPI Specification";
      const endpoints: ApiEndpointSpec[] = [];
      const requirements: RequirementNode[] = [];
      let index = 1;

      if (data.paths && typeof data.paths === "object") {
        for (const [routePath, methods] of Object.entries(data.paths)) {
          if (methods && typeof methods === "object") {
            for (const [method, details] of Object.entries(methods as Record<string, any>)) {
              const upperMethod = method.toUpperCase();
              if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(upperMethod)) {
                const summary = details?.summary || details?.description || `${upperMethod} ${routePath}`;
                endpoints.push({ method: upperMethod, path: routePath, summary });
                requirements.push({
                  id: `req-api-${index++}`,
                  title: `${upperMethod} ${routePath}`,
                  description: summary,
                  type: "api_endpoint",
                  category: details?.tags?.[0] || "API",
                  constraints: [],
                  httpMethod: upperMethod,
                  routePath
                });
              }
            }
          }
        }
      }

      return {
        title,
        description,
        requirements,
        technicalConstraints: ["Strict TypeScript typing", "JSON REST schema compliance"],
        apiEndpoints: endpoints
      };
    } catch {
      return this.parseMarkdown(content, "JSON Document");
    }
  }

  /**
   * Extracts technical constraints (languages, frameworks, database drivers, coding rules)
   * from ingested text.
   */
  public extractConstraints(content: string): string[] {
    const constraints: string[] = [];
    const lower = content.toLowerCase();

    if (lower.includes("zero emojis") || lower.includes("no emojis")) {
      constraints.push("Zero emojis in code, comments, and commit messages");
    }
    if (lower.includes("solid")) {
      constraints.push("Strict SOLID principles enforcement");
    }
    if (lower.includes("typescript")) {
      constraints.push("Strict TypeScript typing with zero untyped any");
    }
    if (lower.includes("angular")) {
      constraints.push("Modern Angular (v20+ Standalone, Signals, Zoneless)");
    }
    if (lower.includes("mobile-first") || lower.includes("mobile first")) {
      constraints.push("Mobile-first responsive layout (WCAG AAA touch targets 44x44px)");
    }
    if (lower.includes("pglite") || lower.includes("postgres")) {
      constraints.push("PGlite/PostgreSQL dialect-agnostic schema migrations");
    }
    if (lower.includes("dark mode") || lower.includes("light mode")) {
      constraints.push("Support dark, light, and high-contrast color themes");
    }

    return constraints;
  }
}
