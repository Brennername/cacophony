import type { ExtractedSymbol } from "./SymbolExtractor.js";

export interface SymbolNode {
  readonly symbol: ExtractedSymbol;
  readonly outgoingEdges: Set<string>; // Target symbol names or file paths
  readonly incomingEdges: Set<string>; // Source symbol names or file paths
  rank: number;
}

export interface PageRankOptions {
  readonly dampingFactor?: number | undefined; // default 0.85
  readonly maxIterations?: number | undefined; // default 20
  readonly convergenceThreshold?: number | undefined; // default 0.0001
}

/**
 * SymbolGraph
 *
 * Dependency graph model mapping cross-file definitions, call hierarchies,
 * and import dependencies. Calculates centrality ranking using the PageRank algorithm.
 */
export class SymbolGraph {
  private readonly nodes = new Map<string, SymbolNode>();
  private readonly nameToIds = new Map<string, string[]>();

  public addSymbol(symbol: ExtractedSymbol): void {
    const node: SymbolNode = {
      symbol,
      outgoingEdges: new Set<string>(),
      incomingEdges: new Set<string>(),
      rank: 1.0
    };
    this.nodes.set(symbol.id, node);

    const existing = this.nameToIds.get(symbol.name) ?? [];
    existing.push(symbol.id);
    this.nameToIds.set(symbol.name, existing);
  }

  public addSymbols(symbols: readonly ExtractedSymbol[]): void {
    for (const sym of symbols) {
      this.addSymbol(sym);
    }
    // Wire up edges based on referenced symbols
    for (const sym of symbols) {
      for (const ref of sym.references) {
        const targetIds = this.nameToIds.get(ref);
        if (targetIds) {
          for (const targetId of targetIds) {
            this.addEdge(sym.id, targetId);
          }
        }
      }
    }
  }

  public addEdge(sourceId: string, targetId: string): void {
    const sourceNode = this.nodes.get(sourceId);
    const targetNode = this.nodes.get(targetId);
    if (!sourceNode || !targetNode || sourceId === targetId) return;

    sourceNode.outgoingEdges.add(targetId);
    targetNode.incomingEdges.add(sourceId);
  }

  /**
   * Computes PageRank across all symbols to determine architectural hubs.
   */
  public computePageRank(options: PageRankOptions = {}): Map<string, number> {
    const damping = options.dampingFactor ?? 0.85;
    const maxIters = options.maxIterations ?? 20;
    const tol = options.convergenceThreshold ?? 0.0001;

    const n = this.nodes.size;
    if (n === 0) return new Map();

    const initialRank = 1.0 / n;
    for (const node of this.nodes.values()) {
      node.rank = initialRank;
    }

    const nodeArray = Array.from(this.nodes.values());

    for (let iter = 0; iter < maxIters; iter++) {
      let maxDiff = 0;
      const newRanks = new Map<string, number>();

      for (const node of nodeArray) {
        let incomingSum = 0;
        for (const sourceId of node.incomingEdges) {
          const sourceNode = this.nodes.get(sourceId);
          if (sourceNode && sourceNode.outgoingEdges.size > 0) {
            incomingSum += sourceNode.rank / sourceNode.outgoingEdges.size;
          }
        }

        const newRank = (1 - damping) / n + damping * incomingSum;
        newRanks.set(node.symbol.id, newRank);
        const diff = Math.abs(newRank - node.rank);
        if (diff > maxDiff) maxDiff = diff;
      }

      for (const [id, rank] of newRanks.entries()) {
        const node = this.nodes.get(id);
        if (node) node.rank = rank;
      }

      if (maxDiff < tol) {
        break;
      }
    }

    const result = new Map<string, number>();
    for (const [id, node] of this.nodes.entries()) {
      result.set(id, node.rank);
    }
    return result;
  }

  public getNode(id: string): SymbolNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): readonly SymbolNode[] {
    return Array.from(this.nodes.values());
  }
}
