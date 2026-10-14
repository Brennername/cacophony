// packages/engine/src/telemetry/StructuredLogger.ts

/**
 * Standard log levels ordered by verbosity.
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly module: string;
  readonly message: string;
  readonly correlationId?: string | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string | undefined;
  } | undefined;
}

export type LogSink = (entry: LogEntry, rawJson: string) => void;

export interface StructuredLoggerOptions {
  readonly module?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly defaultMetadata?: Record<string, unknown> | undefined;
  readonly minLevel?: LogLevel | undefined;
  readonly sink?: LogSink | undefined;
}

/**
 * Structured logger utility producing standard JSON-formatted log entries.
 * Supports log level filtering, correlation tracking, and context chaining.
 */
export class StructuredLogger {
  private readonly moduleName: string;
  private readonly correlationId: string | undefined;
  private readonly defaultMetadata: Record<string, unknown>;
  private readonly minLevel: LogLevel;
  private readonly sink: LogSink;

  constructor(options: StructuredLoggerOptions | string = {}) {
    const opts: StructuredLoggerOptions =
      typeof options === "string" ? { module: options } : options;
    this.moduleName = opts.module || "cacophony";
    this.correlationId = opts.correlationId;
    this.defaultMetadata = opts.defaultMetadata || {};
    this.sink = opts.sink || this.defaultSink;

    if (opts.minLevel) {
      this.minLevel = opts.minLevel;
    } else {
      const envLevel = (process.env["LOG_LEVEL"] || "INFO").toUpperCase();
      this.minLevel = (
        envLevel in LOG_LEVEL_SEVERITY ? envLevel : "INFO"
      ) as LogLevel;
    }
  }

  /**
   * Default sink writing serialized JSON entries to standard streams.
   */
  private defaultSink(entry: LogEntry, rawJson: string): void {
    if (entry.level === "ERROR") {
      process.stderr.write(rawJson + "\n");
    } else {
      process.stdout.write(rawJson + "\n");
    }
  }

  /**
   * Determines if a log level satisfies the minimum configured threshold.
   */
  public isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[this.minLevel];
  }

  /**
   * Creates a child logger inheriting current context with an updated or added correlation ID.
   */
  public withCorrelationId(correlationId: string): StructuredLogger {
    return new StructuredLogger({
      module: this.moduleName,
      correlationId,
      defaultMetadata: { ...this.defaultMetadata },
      minLevel: this.minLevel,
      sink: this.sink,
    });
  }

  /**
   * Creates a child logger with a sub-module or distinct module name.
   */
  public withModule(module: string): StructuredLogger {
    return new StructuredLogger({
      module,
      correlationId: this.correlationId,
      defaultMetadata: { ...this.defaultMetadata },
      minLevel: this.minLevel,
      sink: this.sink,
    });
  }

  /**
   * Creates a child logger with additional persistent metadata fields.
   */
  public withMetadata(metadata: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({
      module: this.moduleName,
      correlationId: this.correlationId,
      defaultMetadata: { ...this.defaultMetadata, ...metadata },
      minLevel: this.minLevel,
      sink: this.sink,
    });
  }

  private write(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    errorObj?: unknown,
  ): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const mergedMetadata = {
      ...this.defaultMetadata,
      ...(metadata || {}),
    };

    let formattedError: LogEntry["error"] | undefined;
    if (errorObj instanceof Error) {
      formattedError = {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack,
      };
    } else if (errorObj !== undefined && errorObj !== null) {
      formattedError = {
        name: "Error",
        message: String(errorObj),
      };
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.moduleName,
      message,
      ...(this.correlationId ? { correlationId: this.correlationId } : {}),
      ...(Object.keys(mergedMetadata).length > 0
        ? { metadata: mergedMetadata }
        : {}),
      ...(formattedError ? { error: formattedError } : {}),
    };

    const rawJson = JSON.stringify(entry);
    this.sink(entry, rawJson);
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.write("DEBUG", message, metadata);
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    this.write("INFO", message, metadata);
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    this.write("WARN", message, metadata);
  }

  public error(
    message: string,
    errorObj?: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    this.write("ERROR", message, metadata, errorObj);
  }
}
