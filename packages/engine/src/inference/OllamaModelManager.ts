import { Agent } from "undici";
import type {
  OllamaInstalledModel,
  OllamaPullProgressEvent
} from "@cacophony/shared-types";

/**
 * Raw model entry returned from Ollama GET /api/tags
 */
interface RawOllamaTagEntry {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

/**
 * Raw model entry returned from Ollama GET /api/ps
 */
interface RawOllamaPsEntry {
  name: string;
  model: string;
  size?: number;
  digest?: string;
  expires_at?: string;
  size_vram?: number;
}

/**
 * Model info returned from Ollama POST /api/show
 */
export interface OllamaModelInfo {
  license?: string;
  modelfile?: string;
  parameters?: string;
  template?: string;
  system?: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

/**
 * OllamaModelManager
 *
 * Provides lifecycle operations directly against the Ollama REST API:
 * - Enumerates installed models (GET /api/tags) and correlates VRAM residency (GET /api/ps)
 * - Streams model downloads with progressive layer status (POST /api/pull)
 * - Deletes evicted models (DELETE /api/delete)
 * - Inspects architectural metadata and quantization details (POST /api/show)
 */
export class OllamaModelManager {
  private readonly baseUrl: string;
  private readonly dispatcher: Agent;

  constructor(baseUrl: string = process.env["OLLAMA_BASE_URL"] || "http://127.0.0.1:11434") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.dispatcher = new Agent({
      headersTimeout: 0,
      bodyTimeout: 0,
      connectTimeout: 30000
    });
  }

  /**
   * Lists all locally installed models, enriched with active VRAM status and protected flags.
   *
   * @param protectedModels - List of model tags or patterns protected from eviction.
   * @returns Array of OllamaInstalledModel objects.
   */
  public async listInstalledModels(
    protectedModels: readonly string[] = []
  ): Promise<OllamaInstalledModel[]> {
    const [tagsRes, psRes] = await Promise.all([
      fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatcher: this.dispatcher as any
      }).catch(() => null),
      fetch(`${this.baseUrl}/api/ps`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatcher: this.dispatcher as any
      }).catch(() => null)
    ]);

    let rawTags: RawOllamaTagEntry[] = [];
    if (tagsRes && tagsRes.ok) {
      const data = (await tagsRes.json()) as { models?: RawOllamaTagEntry[] };
      rawTags = data.models || [];
    }

    const loadedModelNames = new Set<string>();
    if (psRes && psRes.ok) {
      const psData = (await psRes.json()) as { models?: RawOllamaPsEntry[] };
      for (const m of psData.models || []) {
        loadedModelNames.add(m.name);
        loadedModelNames.add(m.model);
      }
    }

    return rawTags.map((t) => {
      const modelName = t.name || t.model;
      const isProtected = protectedModels.some(
        (pattern) => pattern === modelName || modelName.startsWith(pattern)
      );
      const isLoadedInVram = loadedModelNames.has(modelName);

      return {
        name: modelName,
        model: t.model || modelName,
        modifiedAt: t.modified_at || new Date().toISOString(),
        sizeBytes: t.size || 0,
        digest: t.digest || "",
        details: {
          parentModel: t.details?.parent_model || "",
          format: t.details?.format || "",
          family: t.details?.family || "",
          families: t.details?.families || [],
          parameterSize: t.details?.parameter_size || "",
          quantizationLevel: t.details?.quantization_level || ""
        },
        isProtected,
        isLoadedInVram
      };
    });
  }

  /**
   * Initiates a model pull request and processes ndjson chunks to emit progress events.
   *
   * @param modelName - The Ollama model tag to pull (e.g. "qwen2.5-coder:7b").
   * @param onProgress - Callback receiving parsed progress events.
   */
  public async pullModel(
    modelName: string,
    onProgress?: (event: OllamaPullProgressEvent) => void
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatcher: this.dispatcher as any,
      body: JSON.stringify({ model: modelName, stream: true })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to pull model '${modelName}': HTTP ${res.status} ${errText}`);
    }

    if (!res.body) {
      throw new Error(`Failed to pull model '${modelName}': Empty response body from Ollama`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const rawEvent = JSON.parse(trimmed) as {
              status?: string;
              digest?: string;
              total?: number;
              completed?: number;
              error?: string;
            };

            if (rawEvent.error) {
              throw new Error(`Ollama pull error for '${modelName}': ${rawEvent.error}`);
            }

            const percent =
              rawEvent.total && rawEvent.completed && rawEvent.total > 0
                ? Math.min(100, Math.round((rawEvent.completed / rawEvent.total) * 1000) / 10)
                : undefined;

            const progressEvent: OllamaPullProgressEvent = {
              status: rawEvent.status || "downloading",
              ...(rawEvent.digest !== undefined ? { digest: rawEvent.digest } : {}),
              ...(rawEvent.total !== undefined ? { total: rawEvent.total } : {}),
              ...(rawEvent.completed !== undefined ? { completed: rawEvent.completed } : {}),
              ...(percent !== undefined ? { percent } : {})
            };

            if (onProgress) {
              onProgress(progressEvent);
            }
          } catch (err: unknown) {
            if (err instanceof Error && err.message.startsWith("Ollama pull error")) {
              throw err;
            }
            // Ignore malformed intermediate JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Deletes a model from local Ollama storage.
   *
   * @param modelName - The model tag to remove.
   */
  public async deleteModel(modelName: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatcher: this.dispatcher as any,
      body: JSON.stringify({ model: modelName })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to delete model '${modelName}': HTTP ${res.status} ${errText}`);
    }

    return true;
  }

  /**
   * Inspects detailed architecture and quantization info for a model.
   *
   * @param modelName - The model tag to inspect.
   */
  public async showModelInfo(modelName: string): Promise<OllamaModelInfo> {
    const res = await fetch(`${this.baseUrl}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatcher: this.dispatcher as any,
      body: JSON.stringify({ model: modelName })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to inspect model '${modelName}': HTTP ${res.status} ${errText}`);
    }

    return (await res.json()) as OllamaModelInfo;
  }
}
