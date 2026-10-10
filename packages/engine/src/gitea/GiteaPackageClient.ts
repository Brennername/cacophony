import * as crypto from "node:crypto";
import type { GiteaApiClient } from "./GiteaApiClient.js";

export interface PackageArtifactMetadata {
  readonly packageName: string;
  readonly packageVersion: string;
  readonly packageType: "generic" | "npm";
  readonly filename: string;
  readonly contentBuffer: Buffer;
}

export interface PublishedArtifactRecord {
  readonly packageName: string;
  readonly version: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly publishedAt: string;
}

/**
 * Interacts with Gitea's built-in package registry to publish reproducible build bundles
 * and test reports with cryptographic SHA256 checksums.
 */
export class GiteaPackageClient {
  private readonly baseUrl: string;
  private readonly apiToken: string | undefined;

  constructor(_client: GiteaApiClient, baseUrl: string, apiToken?: string) {
    let url = baseUrl;
    while (url.endsWith("/")) {
      url = url.slice(0, -1);
    }
    this.baseUrl = url;
    this.apiToken = apiToken;
  }

  /**
   * Calculates SHA256 checksum of a buffer.
   */
  public calculateSha256(content: Buffer): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Publishes an artifact file to the Gitea generic package registry.
   */
  public async publishGenericPackage(
    owner: string,
    artifact: PackageArtifactMetadata
  ): Promise<PublishedArtifactRecord> {
    const sha256 = this.calculateSha256(artifact.contentBuffer);
    const url = `${this.baseUrl}/api/packages/${owner}/generic/${artifact.packageName}/${artifact.packageVersion}/${artifact.filename}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream"
    };

    if (this.apiToken) {
      headers["Authorization"] = `token ${this.apiToken}`;
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: artifact.contentBuffer
    });

    if (!response.ok && response.status !== 201 && response.status !== 200) {
      const errText = await response.text();
      throw new Error(`Failed to upload package to Gitea registry (${response.status}): ${errText}`);
    }

    return {
      packageName: artifact.packageName,
      version: artifact.packageVersion,
      sha256,
      sizeBytes: artifact.contentBuffer.byteLength,
      publishedAt: new Date().toISOString()
    };
  }

  /**
   * Formats a markdown provenance summary linking artifact metadata for Pull Request bodies.
   */
  public formatProvenanceSummary(record: PublishedArtifactRecord): string {
    return [
      "### Build Artifact Provenance",
      `- **Package**: \`${record.packageName}\` v\`${record.version}\``,
      `- **SHA-256 Checksum**: \`${record.sha256}\``,
      `- **Payload Size**: \`${record.sizeBytes}\` bytes`,
      `- **Timestamp**: \`${record.publishedAt}\``
    ].join("\n");
  }
}
