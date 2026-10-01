import { SymbolNode, SymbolEdge } from '@cacophony/shared-types';
import { Graph } from 'graphlib';

class SymbolGraphBuilder {
  private graph: Graph;

  constructor() {
    this.graph = new Graph();
  }

  public addSymbolNode(symbol: SymbolNode): void {
    this.graph.setNode(symbol.id, symbol);
  }

  public addSymbolEdge(from: string, to: string): void {
    if (!this.graph.hasNode(from)) {
      throw new Error(`Source node ${from} does not exist`);
    }
    if (!this.graph.hasNode(to)) {
      throw new Error(`Target node ${to} does not exist`);
    }
    this.graph.setEdge(from, to);
  }

  public getInDegree(symbolId: string): number {
    return this.graph.inEdges(symbolId)?.length || 0;
  }

  public getPageRankCentrality(): { [symbolId: string]: number } {
    const pageRank = require('pagerank-np');
    return pageRank(this.graph);
  }
}

export default SymbolGraphBuilder;