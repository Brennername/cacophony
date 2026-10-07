import fs from "node:fs/promises";
import path from "node:path";

export interface ApiEndpointSpec {
  readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  readonly path: string;
  readonly description: string;
  readonly requestBody?: Record<string, any> | undefined;
  readonly responseStatusCode?: number | undefined;
  readonly responseExample?: Record<string, any> | undefined;
}

/**
 * ApiDocAppender
 *
 * Micro-task documentation utility that automatically generates and appends
 * structured markdown specifications for new API routes to docs/api_spec.md,
 * intended for ultra-small chore models to execute during idle or cooldown windows.
 */
export class ApiDocAppender {
  /**
   * Generates formatted markdown documentation for an API endpoint.
   */
  public static generateEndpointDoc(endpoint: ApiEndpointSpec): string {
    const statusCode = endpoint.responseStatusCode ?? (endpoint.method === "POST" ? 201 : 200);
    const statusText = statusCode === 201 ? "Created" : "OK";

    let doc = `\n### ${endpoint.method} \`${endpoint.path}\`\n${endpoint.description}\n\n`;

    if (endpoint.requestBody) {
      doc += `**Request Body:**\n\`\`\`json\n${JSON.stringify(endpoint.requestBody, null, 2)}\n\`\`\`\n\n`;
    }

    const example = endpoint.responseExample ?? { success: true };
    doc += `**Response:** \`${statusCode} ${statusText}\`\n\`\`\`json\n${JSON.stringify(example, null, 2)}\n\`\`\`\n`;

    return doc;
  }

  /**
   * Appends an endpoint specification to the target API markdown doc file if not already present.
   */
  public static async appendEndpointToSpec(
    specFilePath: string,
    endpoint: ApiEndpointSpec
  ): Promise<boolean> {
    const absPath = path.resolve(specFilePath);
    let content = "";
    try {
      content = await fs.readFile(absPath, "utf-8");
    } catch {
      content = "# Cacophony API Specification\n\n## REST Endpoints\n";
    }

    // Check if endpoint is already documented
    const searchPattern = `### ${endpoint.method} \`${endpoint.path}\``;
    if (content.includes(searchPattern)) {
      return false; // Already present
    }

    const docBlock = this.generateEndpointDoc(endpoint);

    // Insert under REST Endpoints section if present, or append to end
    let updatedContent = content;
    const restHeader = "## 1. REST Endpoints";
    if (content.includes(restHeader)) {
      const idx = content.indexOf(restHeader) + restHeader.length;
      updatedContent = content.slice(0, idx) + docBlock + content.slice(idx);
    } else {
      updatedContent = content.trimEnd() + "\n" + docBlock;
    }

    await fs.writeFile(absPath, updatedContent, "utf-8");
    return true;
  }
}
