import ts from "typescript";

export interface TargetedMethodEdit {
  readonly className: string;
  readonly methodName: string;
  readonly prompt: string;
}

/** AST-backed single-method prompting and byte-range replacement for TypeScript. */
export class TypeScriptMethodSplicer {
  private static readonly stubPattern = /(?:\/\/|\/\*)\s*(?:\.\.\.|previous\s+code|existing\s+(?:code|implementation)|rest\s+of\s+(?:the\s+)?(?:method|code)|TODO\s*:\s*(?:implement|fill|complete))/i;

  public static prepare(source: string, taskPrompt: string, fileName: string): TargetedMethodEdit | null {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const methods: ts.MethodDeclaration[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isMethodDeclaration(node) && node.body && node.name && ts.isIdentifier(node.name)) methods.push(node);
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    const stubs = methods.filter((method) => this.stubPattern.test(method.body!.getText(sourceFile)));
    let candidates = stubs.length === 1 ? stubs : [];

    if (candidates.length === 0) {
      const explicitNames = new Set<string>();
      for (const match of taskPrompt.matchAll(/(?:method|function|implement|update|complete|flesh\s+out)\s+[`'"\[]?([A-Za-z_$][\w$]*)/gi)) {
        explicitNames.add(match[1]!.toLowerCase());
      }
      candidates = methods.filter((method) => explicitNames.has((method.name as ts.Identifier).text.toLowerCase()));
    }
    if (candidates.length !== 1) return null;

    const target = candidates[0]!;
    const owner = this.findOwningClass(target);
    if (!owner?.name) return null;
    const className = owner.name.text;
    const fields = owner.members
      .filter((member): member is ts.PropertyDeclaration => ts.isPropertyDeclaration(member) && Boolean(member.name))
      .map((member) => `  ${member.getText(sourceFile).replace(/\s*=\s*[\s\S]*$/, "").replace(/;$/, "")};`);
    const signatures = owner.members
      .filter((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && Boolean(member.name))
      .map((member) => `  ${member.getText(sourceFile).slice(0, member.body?.getStart(sourceFile) ?? member.end).trim()}${member.body ? " { … }" : ";"}`);
    const methodName = (target.name as ts.Identifier).text;
    const methodHead = source.slice(target.getStart(sourceFile), target.body!.getStart(sourceFile));
    const currentBody = target.body!.getText(sourceFile);
    const contracts = [...fields, ...signatures].join("\n");

    return {
      className,
      methodName,
      prompt: [
        "[AST-TARGETED METHOD IMPLEMENTATION]",
        `SCOPE: ${className} (TypeScript class)`,
        "CONTRACTS:", contracts || "  (no class members)",
        `TARGET: ${methodHead.trim()}`,
        "CURRENT_BODY:", currentBody,
        "Return ONLY the replacement statements inside the method body, in one TypeScript code fence. Do not return a class, method signature, imports, or placeholder comments. The system will parse and splice this body at its original byte range."
      ].join("\n")
    };
  }

  public static splice(source: string, fileName: string, edit: TargetedMethodEdit, bodyText: string): string {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let target: ts.MethodDeclaration | undefined;
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name?.text === edit.className) {
        target = node.members.find((member): member is ts.MethodDeclaration =>
          ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === edit.methodName
        );
      }
      if (!target) ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    if (!target?.body) throw new Error(`Target method ${edit.className}.${edit.methodName} disappeared before splice`);

    const body = bodyText.trim();
    if (/^(?:export\s+)?(?:class|interface|function)\b/.test(body) || this.stubPattern.test(body)) {
      throw new Error(`Targeted output for ${edit.className}.${edit.methodName} contains a wrapper or placeholder`);
    }
    const methodHead = source.slice(target.getStart(sourceFile), target.body.getStart(sourceFile));
    const probe = ts.createSourceFile("method-probe.ts", `class __Probe { ${methodHead}{\n${body}\n} }`, ts.ScriptTarget.Latest, true);
    const diagnostics = (probe as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
    if (diagnostics.length > 0) {
      throw new Error(`Targeted method body is not valid TypeScript syntax: ${diagnostics[0]!.messageText.toString()}`);
    }
    const start = target.body.getStart(sourceFile);
    const end = target.body.getEnd();
    return source.slice(0, start) + `{\n${body}\n}` + source.slice(end);
  }

  private static findOwningClass(node: ts.Node): ts.ClassDeclaration | undefined {
    let parent = node.parent;
    while (parent && !ts.isClassDeclaration(parent)) parent = parent.parent;
    return parent && ts.isClassDeclaration(parent) ? parent : undefined;
  }
}
