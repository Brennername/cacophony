/**
 * Utility functions for safe, bounded JSON extraction and parsing from raw LLM responses.
 * Follows SOLID principles and prevents polynomial backtracking regular expression denial-of-service (ReDoS).
 */

/**
 * Safely extracts the outermost JSON object substring from raw model output
 * using deterministic linear index scanning without regular expressions.
 *
 * @param rawText Uncontrolled text output from language models or external APIs.
 * @returns Outermost JSON object string, or null if balanced braces are not found.
 */
export function extractJsonObjectString(rawText: string | null | undefined): string | null {
  if (!rawText) return null;
  const first = rawText.indexOf("{");
  const last = rawText.lastIndexOf("}");
  if (first !== -1 && last > first) {
    return rawText.slice(first, last + 1);
  }
  return null;
}

/**
 * Safely parses the outermost JSON object from raw model output.
 * Returns null if no valid JSON object can be parsed.
 */
export function safeParseJsonObject<T = unknown>(rawText: string | null | undefined): T | null {
  const jsonStr = extractJsonObjectString(rawText);
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}
