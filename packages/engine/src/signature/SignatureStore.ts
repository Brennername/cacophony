import type { CodeSignatureRecord } from "@cacophony/shared-types";
import { SignatureHarvester } from "./SignatureHarvester.js";

/**
 * SignatureStore
 *
 * In-memory / relational registry indexing codebase signatures for prompt injection
 * and MCP query tools.
 */
export class SignatureStore {
  private readonly harvester = new SignatureHarvester();
  private readonly records = new Map<string, CodeSignatureRecord>();

  /**
   * Indexes signatures from raw file content.
   */
  public indexFile(filePath: string, content: string): readonly CodeSignatureRecord[] {
    let harvested: readonly CodeSignatureRecord[] = [];
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx") || filePath.endsWith(".js")) {
      harvested = this.harvester.harvestTypeScript(filePath, content);
    } else if (filePath.endsWith(".java")) {
      harvested = this.harvester.harvestJava(filePath, content);
    } else if (filePath.endsWith(".go")) {
      harvested = this.harvester.harvestGo(filePath, content);
    }

    for (const rec of harvested) {
      this.records.set(`${rec.filePath}#${rec.identifier}`, rec);
      // Also index by bare identifier for quick lookup
      if (!this.records.has(rec.identifier)) {
        this.records.set(rec.identifier, rec);
      }
    }

    return harvested;
  }

  /**
   * Retrieves a signature by identifier or filePath#identifier.
   */
  public get(identifier: string, filePath?: string): CodeSignatureRecord | undefined {
    if (filePath) {
      const exact = this.records.get(`${filePath}#${identifier}`);
      if (exact) return exact;
    }
    return this.records.get(identifier);
  }

  /**
   * Returns all indexed records.
   */
  public getAll(): readonly CodeSignatureRecord[] {
    const unique = new Map<string, CodeSignatureRecord>();
    for (const r of this.records.values()) {
      unique.set(r.id, r);
    }
    return Array.from(unique.values());
  }

  /**
   * Generates a compressed prompt mini-specification from indexed target files or identifiers.
   */
  public formatTargetMiniSpec(identifiers: readonly string[]): string {
    const lines: string[] = ["=== Target Interface Mini-Specification (Strict Signatures) ==="];
    for (const id of identifiers) {
      const rec = this.get(id);
      if (rec) {
        lines.push(`// ${rec.filePath}`);
        lines.push(rec.rawCompressed);
      }
    }
    return lines.join("\n");
  }

  /**
   * Clears all signatures.
   */
  public clear(): void {
    this.records.clear();
  }
}
