import ts from "typescript";

export interface MethodTargetValidationResult {
  readonly valid: boolean;
  readonly reason?: string | undefined;
  readonly className?: string | undefined;
  readonly methodName?: string | undefined;
  readonly methodHead?: string | undefined;
  readonly currentBody?: string | undefined;
  readonly bodyStart?: number | undefined;
  readonly bodyEnd?: number | undefined;
  readonly contracts?: readonly string[] | undefined;
}

/**
 * Validates class and method existence via TypeScript AST before executing
 * surgical byte-range method replacements.
 */
export class TypeScriptMethodSplicer {
  private static readonly stubPattern =
    /(?:\/\/|\/\*)\s*(?:\.\.\.|previous\s+code|existing\s+(?:code|implementation)|rest\s+of\s+(?:the\s+)?(?:method|code)|TODO\s*:\s*(?:implement|fill|complete))/i;

  /**
   * Validates that the target class and method exist in the source file AST.
   */
  public static validateTarget(
    source: string,
    fileName: string,
    className: string,
    methodName: string,
  ): MethodTargetValidationResult {
    const sourceFile = ts.createSourceFile(
      fileName,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    let targetClass: ts.ClassDeclaration | undefined;
    const findClass = (node: ts.Node): void => {
      if (
        ts.isClassDeclaration(node) &&
        node.name &&
        node.name.text === className
      ) {
        targetClass = node;
        return;
      }
      ts.forEachChild(node, findClass);
    };
    findClass(sourceFile);

    if (!targetClass) {
      return {
        valid: false,
        reason: `Target class '${className}' not found in AST of '${fileName}'`,
      };
    }

    const targetMethod = targetClass.members.find(
      (m): m is ts.MethodDeclaration =>
        ts.isMethodDeclaration(m) &&
        m.name !== undefined &&
        ts.isIdentifier(m.name) &&
        m.name.text === methodName,
    );

    if (!targetMethod) {
      return {
        valid: false,
        reason: `Target method '${methodName}' not found in class '${className}'`,
      };
    }

    if (!targetMethod.body) {
      return {
        valid: false,
        reason: `Target method '${className}.${methodName}' is abstract or has no implementation body`,
      };
    }

    const contracts = targetClass.members
      .filter((m) => m !== targetMethod && Boolean(m.name))
      .map((m) => {
        if (ts.isPropertyDeclaration(m)) {
          return `  ${m.getText(sourceFile).replace(/\s*=\s*[\s\S]*$/, "").replace(/;$/, "")};`;
        }
        if (ts.isMethodDeclaration(m) && m.body) {
          const sig = m.getText(sourceFile).slice(0, m.body.getStart(sourceFile)).trim();
          return `  ${sig} { … }`;
        }
        return `  ${m.getText(sourceFile).trim()}`;
      });

    const methodHead = source
      .slice(targetMethod.getStart(sourceFile), targetMethod.body.getStart(sourceFile))
      .trim();

    return {
      valid: true,
      className,
      methodName,
      methodHead,
      currentBody: targetMethod.body.getText(sourceFile),
      bodyStart: targetMethod.body.getStart(sourceFile),
      bodyEnd: targetMethod.body.getEnd(),
      contracts,
    };
  }

  /**
   * Surgically splices the body of a validated class method.
   */
  public static spliceMethod(
    source: string,
    fileName: string,
    className: string,
    methodName: string,
    newBody: string,
  ): string {
    const validation = this.validateTarget(source, fileName, className, methodName);
    if (!validation.valid || validation.bodyStart === undefined || validation.bodyEnd === undefined) {
      throw new Error(validation.reason || "Validation failed");
    }

    let cleanedBody = newBody
      .replace(/^```[a-zA-Z0-9_-]*\r?\n?/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // If model wrapped body in braces '{ ... }', unwrap outer braces
    if (cleanedBody.startsWith("{") && cleanedBody.endsWith("}")) {
      cleanedBody = cleanedBody.slice(1, -1).trim();
    }

    if (this.stubPattern.test(cleanedBody)) {
      throw new Error(`Spliced body for '${className}.${methodName}' contains incomplete stub or placeholder pattern`);
    }

    // Syntax validation probe
    const methodHead = validation.methodHead || `${methodName}()`;
    const probeHead = cleanedBody.includes("await ") && !methodHead.includes("async")
      ? `async ${methodHead}`
      : methodHead;

    const probeContent = `class __SyntaxProbe {\n  ${probeHead} {\n${cleanedBody}\n  }\n}`;
    const probe = ts.createSourceFile(
      "probe.ts",
      probeContent,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const diagnostics =
      (probe as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] })
        .parseDiagnostics ?? [];
    if (diagnostics.length > 0) {
      const msg = diagnostics[0]!.messageText.toString();
      throw new Error(`Replacement method body for '${className}.${methodName}' has TypeScript syntax errors: ${msg}`);
    }

    // Determine surrounding method and class indentation depth
    const lineStart = source.lastIndexOf("\n", validation.bodyStart) + 1;
    const methodIndent = source.slice(lineStart, validation.bodyStart).match(/^\s*/)?.[0] || "  ";
    const bodyIndent = methodIndent + "  ";

    // Indent each line of the cleaned body to align with method body depth
    const lines = cleanedBody.split("\n");
    const formattedBody = lines
      .map((line) => (line.trim().length > 0 ? `${bodyIndent}${line.trimStart()}` : ""))
      .join("\n");

    const replacement = `{\n${formattedBody}\n${methodIndent}}`;
    return source.slice(0, validation.bodyStart) + replacement + source.slice(validation.bodyEnd);
  }

  /**
   * Instance method forwarder for validateTarget.
   */
  public validateTarget(
    source: string,
    fileName: string,
    className: string,
    methodName: string,
  ): MethodTargetValidationResult {
    return TypeScriptMethodSplicer.validateTarget(source, fileName, className, methodName);
  }

  /**
   * Instance method forwarder for spliceMethod.
   */
  public spliceMethod(
    source: string,
    fileName: string,
    className: string,
    methodName: string,
    newBody: string,
  ): string {
    return TypeScriptMethodSplicer.spliceMethod(source, fileName, className, methodName, newBody);
  }

  /**
   * Flexible method splice helper supporting either (source, methodName, newBody)
   * or (source, className, methodName, newBody).
   */
  public async splice(
    source: string,
    firstArg: string,
    secondArg: string,
    thirdArg?: string,
  ): Promise<string> {
    if (thirdArg !== undefined) {
      return TypeScriptMethodSplicer.spliceMethod(source, "file.ts", firstArg, secondArg, thirdArg);
    }
    const methodName = firstArg;
    const newBody = secondArg;
    const sourceFile = ts.createSourceFile(
      "file.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    let matchedClassName = "";
    const visitor = (node: ts.Node): void => {
      if (
        ts.isClassDeclaration(node) &&
        node.name &&
        node.members.some(
          (m) =>
            ts.isMethodDeclaration(m) &&
            m.name &&
            ts.isIdentifier(m.name) &&
            m.name.text === methodName,
        )
      ) {
        matchedClassName = node.name.text;
      }
      ts.forEachChild(node, visitor);
    };
    visitor(sourceFile);
    return TypeScriptMethodSplicer.spliceMethod(
      source,
      "file.ts",
      matchedClassName || "ExampleClass",
      methodName,
      newBody,
    );
  }
}
