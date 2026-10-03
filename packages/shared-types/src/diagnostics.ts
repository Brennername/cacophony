import { z } from "zod";

/**
 * Compiler and linter diagnostic severity levels.
 */
export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";
export const DiagnosticSeveritySchema = z.enum(["error", "warning", "info", "hint"]);

/**
 * Standard structured compiler/syntax diagnostic.
 */
export interface Diagnostic {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly columnNumber?: number;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly errorCode?: string;
}

export const DiagnosticSchema = z.object({
  filePath: z.string(),
  lineNumber: z.number(),
  columnNumber: z.number().optional(),
  severity: DiagnosticSeveritySchema,
  message: z.string(),
  errorCode: z.string().optional(),
});

export type CompilerDiagnostic = Diagnostic;
export const CompilerDiagnosticSchema = DiagnosticSchema;

/**
 * Structured context payload for compiler remediation prompts.
 */
export interface IRemediationPrompt {
  readonly taskGoal: string;
  readonly targetFilePath: string;
  readonly currentCode: string;
  readonly compilerDiagnostics?: readonly Diagnostic[];
  readonly testErrorOutput?: string;
  readonly command?: string;
}

/**
 * Standard text tokenizer contract.
 */
export interface StandardTokenizer {
  tokenize(text: string): readonly string[];
  countTokens(text: string): number;
}

export interface ITokenizer extends StandardTokenizer {}

export class DefaultStandardTokenizer implements StandardTokenizer {
  public tokenize(text: string): readonly string[] {
    return text.match(/\b\w+\b|[^\w\s]/g) ?? [];
  }

  public countTokens(text: string): number {
    return this.tokenize(text).length;
  }
}
