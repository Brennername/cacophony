import ts from "typescript";
import type {
  CodeSignatureRecord,
  CallableSignature,
  PropertySignature,
  FunctionParameterSignature,
} from "@cacophony/shared-types";

/**
 * SignatureHarvester
 *
 * Extracts deep, strictly typed AST signature maps across TypeScript, Java, and Go.
 * Produces ultra-compact string representations tailored for small local LLM context windows.
 */
export class SignatureHarvester {
  /**
   * Harvests all deep signatures from a TypeScript source file content.
   */
  public harvestTypeScript(filePath: string, content: string): readonly CodeSignatureRecord[] {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.ES2022,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const records: CodeSignatureRecord[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const record = this.extractTsClass(filePath, node, sourceFile);
        if (record) records.push(record);
      } else if (ts.isInterfaceDeclaration(node)) {
        const record = this.extractTsInterface(filePath, node, sourceFile);
        if (record) records.push(record);
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        const record = this.extractTsFunction(filePath, node, sourceFile);
        if (record) records.push(record);
      } else if (ts.isTypeAliasDeclaration(node)) {
        const record = this.extractTsTypeAlias(filePath, node, sourceFile);
        if (record) records.push(record);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return records;
  }

  /**
   * Harvests signatures from Java source code via AST-like structured parsing.
   */
  public harvestJava(filePath: string, content: string): readonly CodeSignatureRecord[] {
    const records: CodeSignatureRecord[] = [];
    const lines = content.split("\n");

    const classRegex = /(?:public\s+|protected\s+|private\s+)?(?:static\s+)?(?:final\s+)?class\s+([A-Za-z0-9_]+)(?:\s+extends\s+[A-Za-z0-9_]+)?(?:\s+implements\s+[A-Za-z0-9_,\s]+)?\s*\{?/;
    const methodRegex = /(?:public\s+|protected\s+|private\s+)?(?:static\s+)?(?:final\s+)?(?:<[^>]+>\s+)?([A-Za-z0-9_<>[\]]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[^{]+)?\{?/;

    let currentClassName = "";
    const methods: CallableSignature[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? "";
      const classMatch = line.match(classRegex);
      if (classMatch && classMatch[1]) {
        if (currentClassName) {
          records.push({
            id: `${filePath}#${currentClassName}`,
            filePath,
            language: "java",
            identifier: currentClassName,
            kind: "class",
            callables: [...methods],
            properties: [],
            rawCompressed: this.compressRecord(currentClassName, "class", methods, [])
          });
          methods.length = 0;
        }
        currentClassName = classMatch[1];
        continue;
      }

      const methodMatch = line.match(methodRegex);
      if (methodMatch && methodMatch[1] && methodMatch[2]) {
        const returnType = methodMatch[1];
        const methodName = methodMatch[2];
        const rawParams = methodMatch[3] ?? "";

        const params: FunctionParameterSignature[] = [];
        if (rawParams.trim()) {
          const parts = rawParams.split(",");
          for (const p of parts) {
            const pTokens = p.trim().split(/\s+/);
            if (pTokens.length >= 2) {
              params.push({
                type: pTokens[0]!,
                name: pTokens[1]!,
                isOptional: false,
              });
            }
          }
        }

        methods.push({
          name: methodName,
          returnType,
          parameters: params,
          isAsync: false,
          isStatic: line.includes("static "),
        });
      }
    }

    if (currentClassName) {
      records.push({
        id: `${filePath}#${currentClassName}`,
        filePath,
        language: "java",
        identifier: currentClassName,
        kind: "class",
        callables: methods,
        properties: [],
        rawCompressed: this.compressRecord(currentClassName, "class", methods, [])
      });
    }

    return records;
  }

  /**
   * Harvests struct and function signatures from Go source code.
   */
  public harvestGo(filePath: string, content: string): readonly CodeSignatureRecord[] {
    const records: CodeSignatureRecord[] = [];
    const lines = content.split("\n");

    const funcRegex = /^\s*func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*([^{]*)\{?/;
    const structRegex = /^\s*type\s+([A-Za-z0-9_]+)\s+struct\s*\{?/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? "";
      const structMatch = line.match(structRegex);
      if (structMatch && structMatch[1]) {
        const structName = structMatch[1];
        records.push({
          id: `${filePath}#${structName}`,
          filePath,
          language: "go",
          identifier: structName,
          kind: "type",
          callables: [],
          properties: [],
          rawCompressed: `type ${structName} struct`
        });
        continue;
      }

      const funcMatch = line.match(funcRegex);
      if (funcMatch && funcMatch[1]) {
        const funcName = funcMatch[1];
        const rawParams = funcMatch[2] ?? "";
        const returnType = funcMatch[3]?.trim() || "void";

        const params: FunctionParameterSignature[] = [];
        if (rawParams.trim()) {
          const parts = rawParams.split(",");
          for (const p of parts) {
            const pTokens = p.trim().split(/\s+/);
            if (pTokens.length >= 2) {
              params.push({
                name: pTokens[0]!,
                type: pTokens[1]!,
                isOptional: false,
              });
            }
          }
        }

        const callable: CallableSignature = {
          name: funcName,
          parameters: params,
          returnType,
          isAsync: false,
        };

        records.push({
          id: `${filePath}#${funcName}`,
          filePath,
          language: "go",
          identifier: funcName,
          kind: "function",
          callables: [callable],
          properties: [],
          rawCompressed: `func ${funcName}(${params.map((p) => `${p.name}: ${p.type}`).join(", ")}): ${returnType}`
        });
      }
    }

    return records;
  }

  private extractTsClass(filePath: string, node: ts.ClassDeclaration, sourceFile: ts.SourceFile): CodeSignatureRecord | null {
    const className = node.name?.text;
    if (!className) return null;

    const callables: CallableSignature[] = [];
    const properties: PropertySignature[] = [];

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        const isAsync = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
        const isStatic = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
        const returnType = member.type ? member.type.getText(sourceFile) : "void";
        const params = this.extractParameters(member.parameters, sourceFile);

        callables.push({
          name: member.name.text,
          parameters: params,
          returnType,
          isAsync,
          isStatic,
        });
      } else if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        const isReadonly = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
        const isOptional = !!member.questionToken;
        const type = member.type ? member.type.getText(sourceFile) : "any";

        properties.push({
          name: member.name.text,
          type,
          isOptional,
          isReadonly,
        });
      }
    }

    return {
      id: `${filePath}#${className}`,
      filePath,
      language: "typescript",
      identifier: className,
      kind: "class",
      callables,
      properties,
      rawCompressed: this.compressRecord(className, "class", callables, properties)
    };
  }

  private extractTsInterface(filePath: string, node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): CodeSignatureRecord {
    const ifaceName = node.name.text;
    const callables: CallableSignature[] = [];
    const properties: PropertySignature[] = [];

    for (const member of node.members) {
      if (ts.isMethodSignature(member) && member.name && ts.isIdentifier(member.name)) {
        const returnType = member.type ? member.type.getText(sourceFile) : "void";
        const params = this.extractParameters(member.parameters, sourceFile);
        callables.push({
          name: member.name.text,
          parameters: params,
          returnType,
          isAsync: false,
        });
      } else if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
        const isReadonly = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
        const isOptional = !!member.questionToken;
        const type = member.type ? member.type.getText(sourceFile) : "any";
        properties.push({
          name: member.name.text,
          type,
          isOptional,
          isReadonly,
        });
      }
    }

    return {
      id: `${filePath}#${ifaceName}`,
      filePath,
      language: "typescript",
      identifier: ifaceName,
      kind: "interface",
      callables,
      properties,
      rawCompressed: this.compressRecord(ifaceName, "interface", callables, properties)
    };
  }

  private extractTsFunction(filePath: string, node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): CodeSignatureRecord | null {
    const fnName = node.name?.text;
    if (!fnName) return null;

    const isAsync = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    const returnType = node.type ? node.type.getText(sourceFile) : "void";
    const params = this.extractParameters(node.parameters, sourceFile);

    const callable: CallableSignature = {
      name: fnName,
      parameters: params,
      returnType,
      isAsync,
    };

    return {
      id: `${filePath}#${fnName}`,
      filePath,
      language: "typescript",
      identifier: fnName,
      kind: "function",
      callables: [callable],
      properties: [],
      rawCompressed: `function ${fnName}(${params.map((p) => `${p.name}${p.isOptional ? "?" : ""}: ${p.type}`).join(", ")}): ${returnType}`
    };
  }

  private extractTsTypeAlias(filePath: string, node: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile): CodeSignatureRecord {
    const typeName = node.name.text;
    const rawType = node.type.getText(sourceFile).replace(/\s+/g, " ");

    return {
      id: `${filePath}#${typeName}`,
      filePath,
      language: "typescript",
      identifier: typeName,
      kind: "type",
      callables: [],
      properties: [],
      rawCompressed: `type ${typeName} = ${rawType}`
    };
  }

  private extractParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>, sourceFile: ts.SourceFile): FunctionParameterSignature[] {
    return parameters.map((param) => {
      const name = param.name.getText(sourceFile);
      const isOptional = !!param.questionToken || !!param.initializer;
      const type = param.type ? param.type.getText(sourceFile) : "any";
      const defaultValue = param.initializer ? param.initializer.getText(sourceFile) : undefined;
      const result: FunctionParameterSignature = {
        name,
        type,
        isOptional,
      };
      if (defaultValue !== undefined) {
        return { ...result, defaultValue };
      }
      return result;
    });
  }

  /**
   * Compresses record into a token-efficient single-line or compact notation.
   */
  public compressRecord(
    name: string,
    kind: string,
    callables: readonly CallableSignature[],
    properties: readonly PropertySignature[]
  ): string {
    const propStrs = properties.map((p) => `${p.isReadonly ? "readonly " : ""}${p.name}${p.isOptional ? "?" : ""}: ${p.type}`);
    const methodStrs = callables.map(
      (c) => `${c.name}(${c.parameters.map((p) => `${p.name}${p.isOptional ? "?" : ""}: ${p.type}`).join(", ")}): ${c.returnType}`
    );
    const body = [...propStrs, ...methodStrs].join("; ");
    return `${kind} ${name} { ${body} }`;
  }
}
