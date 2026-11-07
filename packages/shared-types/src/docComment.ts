/**
 * Data contracts and interfaces for AST function boundary analysis,
 * non-destructive doc comment injection, and candidate persistence.
 */

export interface FunctionParameterInfo {
  name: string;
  type?: string | undefined;
  defaultValue?: string | undefined;
}

export interface FunctionBoundary {
  name: string;
  signature: string;
  startLine: number;
  endLine: number;
  startPos: number;
  endPos: number;
  parameters: FunctionParameterInfo[];
  returnType?: string | undefined;
  existingComment?: string | undefined;
  leadingIndent: string;
  isAsync: boolean;
  isExported: boolean;
  scopeKind: 'function' | 'method' | 'arrow' | 'constructor';
}

export type DocCommentStatus = 'PENDING' | 'ACCEPTED' | 'DISCARDED';

export interface DocCommentCandidate {
  id: string;
  functionIdentifier: string;
  filePath: string;
  candidateText: string;
  userGuidance?: string | undefined;
  status: DocCommentStatus;
  modelId: string;
  createdAt: string;
  acceptedAt?: string | undefined;
  discardedAt?: string | undefined;
}

export interface DocCommentInjectionResult {
  success: boolean;
  filePath: string;
  injectedAtLine: number;
  modifiedContent: string;
  error?: string | undefined;
}
