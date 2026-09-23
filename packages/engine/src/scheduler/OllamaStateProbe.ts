/**
 * OllamaStateProbe
 *
 * Queries host Ollama HTTP endpoint to inspect which model is currently loaded in VRAM.
 */
export class OllamaStateProbe {
  private readonly baseUrl: string;

  constructor(baseUrl: string = process.env["OLLAMA_BASE_URL"] || "http://127.0.0.1:11434") {
    this.baseUrl = baseUrl;
  }

  /**
   * Retrieves the normalized model name currently resident in VRAM, or null if idle.
   */
  public async getLoadedModel(): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const res = await fetch(`${this.baseUrl}/api/ps`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = (await res.json()) as {
        readonly models?: readonly {
          readonly name: string;
          readonly model: string;
        }[];
      };

      if (Array.isArray(data.models) && data.models.length > 0 && data.models[0]?.name) {
        return this.normalizeModelName(data.models[0].name);
      }
      return null;
    } catch {
      return null;
    }
  }

  private normalizeModelName(rawName: string): string {
    return rawName.replace(/^openai\//, "").replace(/^ollama_chat\//, "").trim();
  }
}
