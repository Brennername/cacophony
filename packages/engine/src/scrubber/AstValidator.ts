import ts from "typescript";

export interface AstValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly exportsCount: number;
}

/**
 * AstValidator
 *
 * Performs fast in-memory static AST verification before dispatching heavy compilation
 * or long-running unit test suites. Catches syntax errors, unclosed delimiters, and invalid declarations.
 */
export class AstValidator {
  /**
   * Validates TypeScript or JavaScript source code syntax using the TypeScript Compiler API.
   */
  public validateTypeScript(
    content: string,
    fileName = "source.ts",
  ): AstValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.ES2022,
      true, // setParentNodes
      fileName.endsWith(".tsx") || fileName.endsWith(".jsx")
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS,
    );

    // Collect syntactic parse diagnostics
    const parseDiagnostics =
      (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] })
        .parseDiagnostics || [];
    for (const diag of parseDiagnostics) {
      const message =
        typeof diag.messageText === "string"
          ? diag.messageText
          : diag.messageText.messageText;
      errors.push(`TS Syntax Error: ${message}`);
    }

    let exportsCount = 0;
    const visit = (node: ts.Node) => {
      const modifiers = ts.canHaveModifiers(node)
        ? ts.getModifiers(node)
        : undefined;
      if (modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exportsCount++;
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      exportsCount,
    };
  }

  /**
   * Fast structural validator for Java source files (delimiter balancing and class declaration check).
   */
  public validateJava(content: string): AstValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    let braceCount = 0;
    let parenCount = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === "{") braceCount++;
      else if (char === "}") braceCount--;
      else if (char === "(") parenCount++;
      else if (char === ")") parenCount--;

      if (braceCount < 0) {
        errors.push("Unmatched closing brace '}' in Java source.");
        break;
      }
      if (parenCount < 0) {
        errors.push("Unmatched closing parenthesis ')' in Java source.");
        break;
      }
    }

    if (braceCount > 0)
      errors.push(
        `Unclosed opening braces: ${braceCount} unclosed '{' remaining.`,
      );
    if (parenCount > 0)
      errors.push(
        `Unclosed opening parentheses: ${parenCount} unclosed '(' remaining.`,
      );

    const hasClassOrInterface =
      /(?:public\s+|private\s+|protected\s+)?(?:class|interface|enum|record)\s+[a-zA-Z0-9_]+/m.test(
        content,
      );
    if (!hasClassOrInterface && content.trim().length > 0) {
      warnings.push(
        "No class, interface, enum, or record declaration identified in Java file.",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      exportsCount: 1,
    };
  }

  /**
   * Validates a discrete slot-fill implementation snippet before merging it
   * into a host scaffold or target source file.
   */
  public validateSlotFillIntegrity(
    slotCode: string,
    fileName = "slot_snippet.ts",
  ): AstValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const trimmed = slotCode.trim();

    if (trimmed.length === 0) {
      return {
        valid: false,
        errors: ["Slot-fill implementation body is empty."],
        warnings: [],
        exportsCount: 0,
      };
    }

    // Check for banned bypass directives and dummy stubs
    if (/\/\/\s*@ts-ignore/i.test(trimmed)) {
      errors.push("Banned directive '// @ts-ignore' detected in slot-fill implementation.");
    }
    if (/\[\s*key\s*:\s*string\s*\]\s*:\s*any/i.test(trimmed)) {
      errors.push("Banned dummy index signature '[key: string]: any' detected.");
    }
    if (/\/\*\s*AST_METHOD_STUB:/i.test(trimmed)) {
      errors.push("Unfulfilled 'AST_METHOD_STUB' marker found in slot-fill output.");
    }
    if (/throw\s+new\s+Error\(\s*["'](?:TODO|Not implemented)["']\s*\)/i.test(trimmed)) {
      errors.push("Unfulfilled placeholder error throw detected.");
    }

    // Wrap snippet in function scope to check syntactical and block-level validity
    const wrappedSource = `async function __slotCheck__() {\n${trimmed}\n}`;
    const sourceFile = ts.createSourceFile(
      fileName,
      wrappedSource,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    );

    const parseDiagnostics =
      (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] })
        .parseDiagnostics || [];

    for (const diag of parseDiagnostics) {
      const message =
        typeof diag.messageText === "string"
          ? diag.messageText
          : diag.messageText.messageText;
      errors.push(`TS Syntax Error in slot: ${message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      exportsCount: 0,
    };
  }
}
