import * as path from "node:path";
import type { ExtractedSymbol } from "../repomap/SymbolExtractor.js";

export interface ContextRecommendation {
  readonly filePath: string;
  readonly reason: "corresponding_test" | "imported_dependency" | "dependent_caller" | "prompt_relevance";
  readonly confidence: number;
}

/**
 * ContextRecommender
 *
 * Analyzes active context files and user prompt to recommend related files
 * (corresponding tests, graph dependencies, and callers).
 */
export class ContextRecommender {
  /**
   * Recommends candidate files based on active files and prompt keywords.
   */
  public recommend(
    activeFilePaths: readonly string[],
    allKnownSymbols: readonly ExtractedSymbol[],
    userPrompt = ""
  ): readonly ContextRecommendation[] {
    const recommendations = new Map<string, ContextRecommendation>();
    const activeSet = new Set(activeFilePaths);

    // 1. Suggest corresponding test files for editable files
    for (const filePath of activeFilePaths) {
      const ext = path.extname(filePath);
      const base = filePath.slice(0, -ext.length);

      const candidateTest1 = `${base}.test${ext}`;
      const candidateTest2 = `${base}.spec${ext}`;
      const candidateTest3 = path.join(path.dirname(filePath), "__tests__", `${path.basename(base)}.test${ext}`);

      for (const t of [candidateTest1, candidateTest2, candidateTest3]) {
        if (!activeSet.has(t)) {
          recommendations.set(t, {
            filePath: t,
            reason: "corresponding_test",
            confidence: 0.95
          });
        }
      }
    }

    // 2. Suggest files from dependencies referenced in active files
    const activeSymbols = allKnownSymbols.filter((s) => activeSet.has(s.filePath));
    for (const sym of activeSymbols) {
      for (const ref of sym.references) {
        const target = allKnownSymbols.find((s) => s.name === ref && !activeSet.has(s.filePath));
        if (target && !recommendations.has(target.filePath)) {
          recommendations.set(target.filePath, {
            filePath: target.filePath,
            reason: "imported_dependency",
            confidence: 0.8
          });
        }
      }
    }

    // 3. Prompt keyword match
    const promptLower = userPrompt.toLowerCase();
    if (promptLower.length > 0) {
      for (const sym of allKnownSymbols) {
        if (!activeSet.has(sym.filePath) && promptLower.includes(sym.name.toLowerCase())) {
          if (!recommendations.has(sym.filePath)) {
            recommendations.set(sym.filePath, {
              filePath: sym.filePath,
              reason: "prompt_relevance",
              confidence: 0.75
            });
          }
        }
      }
    }

    return Array.from(recommendations.values()).sort((a, b) => b.confidence - a.confidence);
  }
}
