import ts from "typescript";

export interface ImportedIdentifier {
  readonly importedName: string;
  readonly localAlias: string;
  readonly moduleSpecifier: string;
  readonly isTypeOnly: boolean;
}

export interface SlicedDependencyResult {
  readonly dependencyFilePath: string;
  readonly skeletonContent: string;
  readonly originalLength: number;
  readonly skeletonLength: number;
  readonly reductionRatio: number;
}

export class AstContextSlicer {
  public readonly projectDir: string;

  constructor(projectDir: string = process.cwd()) {
    this.projectDir = projectDir;
  }

  public extractImportedSymbols(consumerContent: string, consumerFilePath = "consumer.ts"): readonly ImportedIdentifier[] {
    const sourceFile = ts.createSourceFile(
      consumerFilePath,
      consumerContent,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );

    const imports: ImportedIdentifier[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
        const isTypeOnly = Boolean(node.importClause?.isTypeOnly);

        if (node.importClause?.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const element of node.importClause.namedBindings.elements) {
              imports.push({
                importedName: element.propertyName?.text ?? element.name.text,
                localAlias: element.name.text,
                moduleSpecifier,
                isTypeOnly: isTypeOnly || Boolean(element.isTypeOnly)
              });
            }
          } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            imports.push({
              importedName: "*",
              localAlias: node.importClause.namedBindings.name.text,
              moduleSpecifier,
              isTypeOnly
            });
          }
        } else if (node.importClause?.name) {

          imports.push({
            importedName: "default",
            localAlias: node.importClause.name.text,
            moduleSpecifier,
            isTypeOnly
          });
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  public generateTypeSkeleton(
    dependencyContent: string,
    referencedSymbolNames: readonly string[] = [],
    dependencyFilePath = "dep.ts"
  ): SlicedDependencyResult {
    const sourceFile = ts.createSourceFile(
      dependencyFilePath,
      dependencyContent,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );

    const skeletons: string[] = [];
    const symbolSet = new Set(referencedSymbolNames);
    const filterBySymbols = symbolSet.size > 0 && !symbolSet.has("*");

    const visit = (node: ts.Node) => {

      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        if (!filterBySymbols || symbolSet.has(name)) {
          skeletons.push(node.getText(sourceFile));
        }
      }

      else if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        if (!filterBySymbols || symbolSet.has(name)) {
          skeletons.push(node.getText(sourceFile));
        }
      }

      else if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        if (!filterBySymbols || symbolSet.has(name)) {
          const classSkeleton = this.sliceClassDeclaration(node, sourceFile);
          skeletons.push(classSkeleton);
        }
      }

      else if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        if (!filterBySymbols || symbolSet.has(name)) {
          const fnSkeleton = this.sliceFunctionDeclaration(node, sourceFile);
          skeletons.push(fnSkeleton);
        }
      }

      else if (ts.isEnumDeclaration(node)) {
        const name = node.name.text;
        if (!filterBySymbols || symbolSet.has(name)) {
          skeletons.push(node.getText(sourceFile));
        }
      }
    };

    ts.forEachChild(sourceFile, visit);

    const skeletonContent = skeletons.length > 0
      ? skeletons.join("\n\n")
      : "// [AST Context Slicer: No referenced top-level exports matching requested symbols]";

    const originalLength = dependencyContent.length;
    const skeletonLength = skeletonContent.length;
    const reductionRatio = originalLength > 0
      ? Number(((originalLength - skeletonLength) / originalLength).toFixed(4))
      : 0;

    return {
      dependencyFilePath,
      skeletonContent,
      originalLength,
      skeletonLength,
      reductionRatio
    };
  }

  private sliceClassDeclaration(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): string {
    const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const exportPrefix = isExported ? "export " : "";
    const isAbstract = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword);
    const abstractPrefix = isAbstract ? "abstract " : "";
    const className = node.name?.text ?? "AnonymousClass";

    const members: string[] = [];

    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) {
        const propName = member.name.getText(sourceFile);
        const typeStr = member.type ? member.type.getText(sourceFile) : "any";
        const isReadonly = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword);
        const isStatic = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword);
        const prefix = `${isStatic ? "static " : ""}${isReadonly ? "readonly " : ""}`;
        members.push(`  ${prefix}${propName}: ${typeStr};`);
      } else if (ts.isConstructorDeclaration(member)) {
        const params = member.parameters.map((p) => p.getText(sourceFile)).join(", ");
        members.push(`  constructor(${params});`);
      } else if (ts.isMethodDeclaration(member)) {
        const methodName = member.name.getText(sourceFile);
        const params = member.parameters.map((p) => p.getText(sourceFile)).join(", ");
        const returnType = member.type ? member.type.getText(sourceFile) : "void";
        const isStatic = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword);
        const isAsync = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
        const prefix = `${isStatic ? "static " : ""}${isAsync ? "async " : ""}`;
        members.push(`  ${prefix}${methodName}(${params}): ${returnType};`);
      }
    }

    return `${exportPrefix}${abstractPrefix}class ${className} {\n${members.join("\n")}\n}`;
  }

  private sliceFunctionDeclaration(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): string {
    const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const exportPrefix = isExported ? "export " : "";
    const isAsync = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
    const asyncPrefix = isAsync ? "async " : "";
    const fnName = node.name?.text ?? "anonymous";
    const params = node.parameters.map((p) => p.getText(sourceFile)).join(", ");
    const returnType = node.type ? node.type.getText(sourceFile) : "void";

    return `${exportPrefix}${asyncPrefix}function ${fnName}(${params}): ${returnType};`;
  }
}