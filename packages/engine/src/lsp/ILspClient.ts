/**
 * Diagnostic severity levels defined by the Language Server Protocol.
 */
export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4
}

export interface Position {
  readonly line: number;
  readonly character: number;
}

export interface Range {
  readonly start: Position;
  readonly end: Position;
}

export interface LspDiagnostic {
  readonly uri: string;
  readonly range: Range;
  readonly severity: DiagnosticSeverity;
  readonly code?: string | number | undefined;
  readonly source?: string | undefined;
  readonly message: string;
}

export interface LspLocation {
  readonly uri: string;
  readonly range: Range;
}

export interface LspSymbolInformation {
  readonly name: string;
  readonly kind: number;
  readonly location: LspLocation;
  readonly containerName?: string;
}

export interface LspClientOptions {
  readonly workspaceRoot: string;
  readonly serverCommand: string;
  readonly serverArgs?: readonly string[];
  readonly initializationOptions?: Record<string, unknown>;
}

export interface ILspClient {
  readonly serverName: string;
  readonly isRunning: boolean;

  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;

  sendRequest<TResult = unknown>(method: string, params?: unknown): Promise<TResult>;
  sendNotification(method: string, params?: unknown): Promise<void>;

  onNotification(method: string, handler: (params: unknown) => void): () => void;
  onDiagnostics(handler: (diagnostics: readonly LspDiagnostic[]) => void): () => void;

  getDiagnostics(uri?: string): readonly LspDiagnostic[];
  findDefinition(uri: string, position: Position): Promise<readonly LspLocation[]>;
  findReferences(uri: string, position: Position): Promise<readonly LspLocation[]>;
  documentSymbols(uri: string): Promise<readonly LspSymbolInformation[]>;
}
