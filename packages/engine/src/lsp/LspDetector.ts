import * as fs from "node:fs";
import * as path from "node:path";
import { type ILspClient, type LspClientOptions } from "./ILspClient.js";
import { LspProcessSupervisor } from "./LspProcessSupervisor.js";

export interface LspServerConfig {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly detectionMarkers: readonly string[];
  readonly initializationOptions?: Record<string, unknown>;
}

/**
 * LspDetector
 *
 * Automatically discovers suitable Language Server implementations based on workspace markers:
 * - TypeScript / JavaScript: typescript-language-server (or npx typescript-language-server --stdio)
 * - Java: jdtls (Eclipse JDT Language Server)
 * - Go: gopls
 * - Rust: rust-analyzer
 */
export class LspDetector {
  public static readonly KNOWN_SERVERS: readonly LspServerConfig[] = [
    {
      name: "typescript-language-server",
      command: "npx",
      args: ["-y", "typescript-language-server", "--stdio"],
      detectionMarkers: ["tsconfig.json", "package.json"]
    },
    {
      name: "jdtls",
      command: "jdtls",
      args: [],
      detectionMarkers: ["pom.xml", "build.gradle", ".project"]
    },
    {
      name: "gopls",
      command: "gopls",
      args: [],
      detectionMarkers: ["go.mod"]
    },
    {
      name: "rust-analyzer",
      command: "rust-analyzer",
      args: [],
      detectionMarkers: ["Cargo.toml"]
    }
  ];

  /**
   * Probes workspace directory for language server configuration match.
   */
  public static detectServer(workspaceRoot: string): LspServerConfig | null {
    for (const server of LspDetector.KNOWN_SERVERS) {
      const matched = server.detectionMarkers.some((marker) =>
        fs.existsSync(path.join(workspaceRoot, marker))
      );
      if (matched) {
        return server;
      }
    }
    return null;
  }

  /**
   * Creates an ILspClient instance configured for the given workspace.
   */
  public static createClient(workspaceRoot: string, customConfig?: Partial<LspServerConfig>): ILspClient {
    const detected = customConfig?.name
      ? LspDetector.KNOWN_SERVERS.find((s) => s.name === customConfig.name) || null
      : LspDetector.detectServer(workspaceRoot);

    const name = customConfig?.name || detected?.name || "generic-lsp";
    const command = customConfig?.command || detected?.command || "npx";
    const args = customConfig?.args || detected?.args || ["-y", "typescript-language-server", "--stdio"];
    const initOptions = customConfig?.initializationOptions || detected?.initializationOptions || {};

    const options: LspClientOptions = {
      workspaceRoot,
      serverCommand: command,
      serverArgs: args,
      initializationOptions: initOptions
    };

    return new LspProcessSupervisor(name, options);
  }
}
