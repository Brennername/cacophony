import type { ExtractedSymbol } from "./SymbolExtractor.js";
import { SymbolGraph } from "./SymbolGraph.js";

export interface RepoMapOptions {
  readonly maxTokens?: number | undefined; // token budget for map (e.g., 1024, 2048, 4096)
  readonly queryBiasing?: string | undefined; // user intent query to boost relevant symbols
}

export interface RankedSymbol extends ExtractedSymbol {
  readonly score: number;
}

/**
 * RepoMapGenerator
 *
 * Produces a concise, tree-formatted architectural overview of the repository.
 * Formats file paths, classes, interfaces, and function signatures indented by directory,
 * strictly adhering to a configurable token budget and ranking by PageRank / query relevance.
 */
export class RepoMapGenerator {
  /**
   * Generates a formatted repo map string conforming to token budget.
   */
  public generateMap(symbols: readonly ExtractedSymbol[], options: RepoMapOptions = {}): string {
    const maxTokens = options.maxTokens ?? 2048;
    const query = options.queryBiasing?.toLowerCase().trim();

    if (symbols.length === 0) {
      return "No repository symbols indexed.";
    }

    // 1. Build graph & calculate PageRank
    const graph = new SymbolGraph();
    graph.addSymbols(symbols);
    const ranks = graph.computePageRank();

    // 2. Score symbols with query biasing
    const ranked: RankedSymbol[] = symbols.map((s) => {
      let score = ranks.get(s.id) ?? 0.0;
      if (query && (s.name.toLowerCase().includes(query) || s.filePath.toLowerCase().includes(query))) {
        score += 0.5; // Boost matches
      }
      return {
        ...s,
        score
      };
    });

    // 3. Sort symbols descending by score
    ranked.sort((a, b) => b.score - a.score);

    // 4. Greedily select top symbols fitting into token budget (~4 chars per token)
    const charBudget = maxTokens * 4;
    const selectedSymbols: RankedSymbol[] = [];
    let currentChars = 0;

    for (const item of ranked) {
      const estimatedLineLength = item.filePath.length + item.signature.length + 12;
      if (currentChars + estimatedLineLength > charBudget && selectedSymbols.length > 0) {
        break;
      }
      selectedSymbols.push(item);
      currentChars += estimatedLineLength;
    }

    // 5. Group selected symbols by file path
    const fileMap = new Map<string, RankedSymbol[]>();
    for (const item of selectedSymbols) {
      const list = fileMap.get(item.filePath) ?? [];
      list.push(item);
      fileMap.set(item.filePath, list);
    }

    // 6. Format hierarchical output
    const outputLines: string[] = [];
    outputLines.push("=== Repository Map (Architectural Overview) ===");

    const sortedFiles = Array.from(fileMap.keys()).sort();
    for (const filePath of sortedFiles) {
      outputLines.push(filePath + ":");
      const fileSyms = fileMap.get(filePath) ?? [];
      fileSyms.sort((a, b) => a.lineStart - b.lineStart);

      for (const s of fileSyms) {
        outputLines.push(`  │ [${s.kind}] ${s.signature} (L${s.lineStart})`);
      }
    }

    return outputLines.join("\n");
  }
}
