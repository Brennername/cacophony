import ts from "typescript";

export interface MethodContract {
  readonly name: string;
  readonly description?: string | undefined;
  readonly parameters: readonly { readonly name: string; readonly type: string }[];
  readonly returnType: string;
  readonly isAsync?: boolean | undefined;
  readonly isStatic?: boolean | undefined;
}

export interface PropertyContract {
  readonly name: string;
  readonly type: string;
  readonly isReadonly?: boolean | undefined;
  readonly isPrivate?: boolean | undefined;
  readonly initialValue?: string | undefined;
}

export interface ClassScaffoldSpec {
  readonly className: string;
  readonly description?: string | undefined;
  readonly imports?: readonly string[] | undefined;
  readonly properties?: readonly PropertyContract[] | undefined;
  readonly methods: readonly MethodContract[];
  readonly exportKind?: "export" | "export default" | undefined;
}

export interface ScaffoldResult {
  readonly className: string;
  readonly sourceCode: string;
  readonly methodCount: number;
}

export interface TargetedMethodUnit {
  readonly className: string;
  readonly methodName: string;
  readonly signature: string;
  readonly prompt: string;
  readonly isAsync: boolean;
  readonly returnType: string;
}

/**
 * SchematicCodeGenerator
 *
 * Implements micro-model scaffolding generation (Phase 89 T89.3.2).
 * Enables lightweight models (e.g. 3B/4B) to generate clean structural
 * contracts, signatures, and file outlines without writing hollow method logic.
 *
 * The method bodies are then distributed to specialized 7B+ implementer models
 * and cleanly merged back into the consolidated source file via AST splicing.
 */
export class SchematicCodeGenerator {
  public static readonly STUB_MARKER_PREFIX = "/* AST_METHOD_STUB:";

  /**
   * Generates a typed TypeScript scaffold from a structured contract specification.
   */
  public generateScaffold(spec: ClassScaffoldSpec): ScaffoldResult {
    const lines: string[] = [];

    // 1. Imports
    if (spec.imports && spec.imports.length > 0) {
      lines.push(...spec.imports);
      lines.push("");
    }

    // 2. Class Documentation
    if (spec.description) {
      lines.push("/**");
      lines.push(` * ${spec.description}`);
      lines.push(" */");
    }

    // 3. Class Declaration
    const exportPrefix = spec.exportKind === "export default" ? "export default class" : "export class";
    lines.push(`${exportPrefix} ${spec.className} {`);

    // 4. Properties
    if (spec.properties && spec.properties.length > 0) {
      for (const prop of spec.properties) {
        const visibility = prop.isPrivate ? "private " : "public ";
        const ro = prop.isReadonly ? "readonly " : "";
        const init = prop.initialValue ? ` = ${prop.initialValue}` : "";
        lines.push(`  ${visibility}${ro}${prop.name}: ${prop.type}${init};`);
      }
      lines.push("");
    }

    // 5. Methods with AST stub markers
    for (const method of spec.methods) {
      if (method.description) {
        lines.push("  /**");
        lines.push(`   * ${method.description}`);
        lines.push("   */");
      }
      const asyncPrefix = method.isAsync ? "async " : "";
      const staticPrefix = method.isStatic ? "static " : "";
      const params = method.parameters.map((p) => `${p.name}: ${p.type}`).join(", ");
      const retType = method.isAsync && !method.returnType.startsWith("Promise<")
        ? `Promise<${method.returnType}>`
        : method.returnType;

      lines.push(`  public ${staticPrefix}${asyncPrefix}${method.name}(${params}): ${retType} {`);
      lines.push(`    ${SchematicCodeGenerator.STUB_MARKER_PREFIX} ${method.name} */`);
      lines.push("  }");
      lines.push("");
    }

    lines.push("}");
    lines.push("");

    return {
      className: spec.className,
      sourceCode: lines.join("\n"),
      methodCount: spec.methods.length
    };
  }

  /**
   * Traverses a scaffolded TypeScript file and extracts isolated method units
   * ready for individual distribution to larger implementer models.
   */
  public extractMethodTargets(sourceCode: string, fileName = "scaffold.ts"): readonly TargetedMethodUnit[] {
    const sourceFile = ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const units: TargetedMethodUnit[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        const classProperties = node.members
          .filter((m): m is ts.PropertyDeclaration => ts.isPropertyDeclaration(m) && Boolean(m.name))
          .map((m) => `  ${m.getText(sourceFile)}`);

        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            const methodName = member.name.text;
            const methodBody = member.body?.getText(sourceFile) || "";

            if (methodBody.includes(SchematicCodeGenerator.STUB_MARKER_PREFIX)) {
              const signature = member.getText(sourceFile).slice(0, member.body?.getStart(sourceFile) ?? member.end).trim();
              const isAsync = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
              const returnType = member.type?.getText(sourceFile) ?? "void";

              const prompt = [
                `[AST METHOD IMPLEMENTATION UNIT]`,
                `CLASS: ${className}`,
                `METHOD SIGNATURE: ${signature}`,
                `CLASS CONTRACTS:`,
                classProperties.join("\n") || "  (no properties)",
                "",
                "Implement the complete method body for this signature.",
                "Return only the method body statements wrapped in braces { ... }.",
                "Strict TypeScript typing required. No empty stubs or unhandled errors."
              ].join("\n");

              units.push({
                className,
                methodName,
                signature,
                prompt,
                isAsync,
                returnType
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return units;
  }

  /**
   * Splices completed method implementations back into the scaffold source.
   */
  public mergeMethodImplementations(
    sourceCode: string,
    implementations: ReadonlyMap<string, string>,
    fileName = "scaffold.ts"
  ): string {
    const sourceFile = ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const replacements: Array<{ start: number; end: number; text: string }> = [];

    const visit = (node: ts.Node): void => {
      if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name) && node.body) {
        const methodName = node.name.text;
        const impl = implementations.get(methodName);

        if (impl && node.body.getText(sourceFile).includes(SchematicCodeGenerator.STUB_MARKER_PREFIX)) {
          // Normalize implementation: ensure it has braces
          let cleanImpl = impl.trim();
          if (cleanImpl.startsWith("```typescript") || cleanImpl.startsWith("```ts")) {
            cleanImpl = cleanImpl.replace(/^```(?:typescript|ts)?\s*/, "").replace(/```\s*$/, "").trim();
          }
          if (!cleanImpl.startsWith("{")) {
            cleanImpl = `{\n    ${cleanImpl.split("\n").join("\n    ")}\n  }`;
          }

          replacements.push({
            start: node.body.getStart(sourceFile),
            end: node.body.getEnd(),
            text: cleanImpl
          });
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Apply replacements from bottom to top to preserve character offsets
    replacements.sort((a, b) => b.start - a.start);
    let result = sourceCode;
    for (const r of replacements) {
      result = result.slice(0, r.start) + r.text + result.slice(r.end);
    }

    return result;
  }
}
