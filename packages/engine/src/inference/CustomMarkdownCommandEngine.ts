import * as fs from "node:fs";
import * as path from "node:path";

export interface MarkdownCommandMetadata {
  readonly name: string;
  readonly description: string;
  readonly role?: "user" | "system" | "assistant" | undefined;
  readonly temperature?: number | undefined;
  readonly focusFiles?: readonly string[] | undefined;
  readonly arguments?: readonly string[] | undefined;
}

export interface MarkdownCommand {
  readonly metadata: MarkdownCommandMetadata;
  readonly template: string;
  readonly sourceFilePath: string;
}

export interface InterpolationContext {
  readonly args?: readonly string[];
  readonly selection?: string;
  readonly files?: readonly string[];
  readonly testOutput?: string;
  readonly customVariables?: Record<string, string>;
}

/**
 * CustomMarkdownCommandEngine discovers, parses, and interpolates custom markdown commands
 * defined in workspace `.cacophony/commands/*.md` and user home `~/.cacophony/commands/*.md`.
 */
export class CustomMarkdownCommandEngine {
  private readonly searchDirectories: readonly string[];
  private readonly commands: Map<string, MarkdownCommand> = new Map();

  constructor(searchDirectories: readonly string[]) {
    this.searchDirectories = searchDirectories;
  }

  /**
   * Scans configured directories and registers all valid markdown command definitions.
   */
  public async loadCommands(): Promise<readonly MarkdownCommand[]> {
    this.commands.clear();

    for (const dir of this.searchDirectories) {
      if (!fs.existsSync(dir)) continue;

      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".md")) {
          const fullPath = path.join(dir, entry.name);
          const rawContent = await fs.promises.readFile(fullPath, "utf-8");
          const parsed = this.parseCommandFile(rawContent, fullPath);
          if (parsed) {
            this.commands.set(parsed.metadata.name.toLowerCase(), parsed);
          }
        }
      }
    }

    return Array.from(this.commands.values());
  }

  public getCommand(name: string): MarkdownCommand | undefined {
    const cleanName = name.startsWith("/") ? name.slice(1).toLowerCase() : name.toLowerCase();
    return this.commands.get(cleanName);
  }

  public listCommands(): readonly MarkdownCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Parses markdown file containing optional YAML-style frontmatter headers.
   */
  public parseCommandFile(content: string, filePath: string): MarkdownCommand | null {
    const defaultName = path.basename(filePath, ".md");
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      // No frontmatter: plain prompt template
      return {
        metadata: {
          name: defaultName,
          description: `Custom command ${defaultName}`
        },
        template: content.trim(),
        sourceFilePath: filePath
      };
    }

    const rawFrontmatter = match[1] ?? "";
    const template = (match[2] ?? "").trim();
    const metaObj = this.parseSimpleYaml(rawFrontmatter);

    return {
      metadata: {
        name: metaObj.name || defaultName,
        description: metaObj.description || `Custom command ${defaultName}`,
        role: (metaObj.role as "user" | "system" | "assistant") || "user",
        temperature: metaObj.temperature ? parseFloat(metaObj.temperature) : undefined,
        focusFiles: metaObj.focusFiles ? metaObj.focusFiles.split(",").map((s) => s.trim()) : undefined,
        arguments: metaObj.arguments ? metaObj.arguments.split(",").map((s) => s.trim()) : undefined
      },
      template,
      sourceFilePath: filePath
    };
  }

  /**
   * Interpolates variables into markdown command template.
   * Supports: $ARG1, $ARG2, ..., $SELECTION, $FILES, $TEST_OUTPUT, and custom vars.
   */
  public interpolate(command: MarkdownCommand, context: InterpolationContext = {}): string {
    let result = command.template;

    // Replace numbered arguments ($ARG1, $ARG2, ...)
    if (context.args && context.args.length > 0) {
      for (let i = 0; i < context.args.length; i++) {
        const argVal = context.args[i] || "";
        result = result.replaceAll(`$ARG${i + 1}`, argVal);
      }
    }

    // Replace $SELECTION
    result = result.replaceAll("$SELECTION", context.selection || "");

    // Replace $FILES
    result = result.replaceAll("$FILES", context.files ? context.files.join(", ") : "");

    // Replace $TEST_OUTPUT
    result = result.replaceAll("$TEST_OUTPUT", context.testOutput || "");

    // Replace custom dictionary variables
    if (context.customVariables) {
      for (const [key, val] of Object.entries(context.customVariables)) {
        result = result.replaceAll(`$${key}`, val);
      }
    }

    return result;
  }

  private parseSimpleYaml(yamlString: string): Record<string, string> {
    const record: Record<string, string> = {};
    const lines = yamlString.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        const key = trimmed.slice(0, colonIdx).trim();
        let value = trimmed.slice(colonIdx + 1).trim();
        // Strip optional surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        record[key] = value;
      }
    }

    return record;
  }
}
