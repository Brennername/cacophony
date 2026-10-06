import ts from "typescript";

export interface TargetedMethodEdit {
  readonly kind: "method" | "route" | "route-insert";
  readonly className: string;
  readonly methodName: string;
  readonly routePath?: string;
  readonly httpMethod?: string;
  readonly prompt: string;
}

/** AST-backed single-method prompting and byte-range replacement for TypeScript. */
export class TypeScriptMethodSplicer {
  private static readonly stubPattern = /(?:\/\/|\/\*)\s*(?:\.\.\.|previous\s+code|existing\s+(?:code|implementation)|rest\s+of\s+(?:the\s+)?(?:method|code)|TODO\s*:\s*(?:implement|fill|complete))/i;

  public static prepare(source: string, taskPrompt: string, fileName: string): TargetedMethodEdit | null {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const httpRoute = taskPrompt.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+[`'\"]?(\/api\/[\w/-]+)/i);
    if (httpRoute) {
      const httpMethod = httpRoute[1]!.toUpperCase();
      const routePath = httpRoute[2]!;
      const routeCandidates: Array<{ owner: ts.ClassDeclaration; method: ts.MethodDeclaration; statement: ts.IfStatement }> = [];
      const visitRoutes = (node: ts.Node): void => {
        const parentMethod = ts.isIfStatement(node) ? this.findOwningMethod(node) : undefined;
        if (ts.isIfStatement(node) && parentMethod?.name && ts.isIdentifier(parentMethod.name)) {
          const condition = node.expression.getText(sourceFile);
          if (condition.includes(routePath) && condition.includes(httpMethod)) {
            const owner = this.findOwningClass(parentMethod);
            if (owner?.name) routeCandidates.push({ owner, method: parentMethod, statement: node });
          }
        }
        ts.forEachChild(node, visitRoutes);
      };
      visitRoutes(sourceFile);
      if (routeCandidates.length > 1) return null;

      const existingRoute = routeCandidates[0];
      const handler = existingRoute?.method ?? this.findHttpRequestHandler(sourceFile);
      const owner = existingRoute?.owner ?? (handler ? this.findOwningClass(handler) : undefined);
      if (!handler || !owner?.name || !ts.isIdentifier(handler.name) || handler.name.text !== "handleRequest") return null;
      const insertionAnchor = !existingRoute
        ? this.findFrontendFallback(handler)
        : undefined;
      if (!existingRoute && !insertionAnchor) return null;

      const classContracts = owner.members
        .filter((member): member is ts.PropertyDeclaration => ts.isPropertyDeclaration(member) && Boolean(member.name))
        .map((member) => `  ${member.getText(sourceFile).replace(/\s*=\s*[\s\S]*$/, "").replace(/;$/, "")};`);
      const methodSignatures = owner.members
        .filter((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && Boolean(member.name))
        .map((member) => `  ${member.getText(sourceFile).slice(0, member.body?.getStart(sourceFile) ?? member.end).trim()}${member.body ? " { … }" : ";"}`);
      const routeBlock = existingRoute?.statement.getText(sourceFile) ?? "(new route: no existing block)";
      const kind = existingRoute ? "route" : "route-insert";
      return {
        kind,
        className: owner.name.text,
        methodName: handler.name.text,
        routePath,
        httpMethod,
        prompt: [
          "[AST-TARGETED ROUTE IMPLEMENTATION]",
          `SCOPE: ${owner.name.text}.${handler.name.text}(req, res)`,
          "CONTRACTS:", [...classContracts, ...methodSignatures].join("\n") || "  (no class members)",
          `TARGET_ROUTE: ${httpMethod} ${routePath}`,
          existingRoute ? "CURRENT_ROUTE_BLOCK:" : "INSERTION_POINT: immediately before the static frontend fallback in handleRequest",
          routeBlock,
          "Return exactly one complete TypeScript if-statement for this route, in one TypeScript code fence. Do not return the class or handleRequest method. Preserve the existing request/response conventions and use only members in the contracts. The system will parse and replace or insert this single route block."
        ].join("\n")
      };
    }

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
      for (const match of taskPrompt.matchAll(/(?:\b(?:method|function)\s+[`'"\[]?([A-Za-z_$][\w$]*)|\b(?:implement|update|complete|flesh\s+out)\s+(?:the\s+)?(?:method\s+)?[`'"\[]?([A-Za-z_$][\w$]*))/gi)) {
        const name = match[1] || match[2];
        if (name) explicitNames.add(name.toLowerCase());
      }
      candidates = methods.filter((method) => explicitNames.has((method.name as ts.Identifier).text.toLowerCase()));
    }
    // Model transition tasks often describe the behavior but omit the method
    // name. In TaskScheduler the unique selectModel call is the safe AST anchor.
    if (candidates.length === 0 && /\bmodel\b/i.test(taskPrompt) && /\b(?:unload|load|loading|switch)\b/i.test(taskPrompt)) {
      candidates = methods.filter((method) => method.body!.getText(sourceFile).includes("this.evictionManager.selectModel("));
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
      kind: "method",
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
    if (edit.kind === "route" || edit.kind === "route-insert") {
      const handler = this.findHttpRequestHandler(sourceFile);
      if (!handler?.body || !edit.routePath || !edit.httpMethod) throw new Error("Target HTTP route handler disappeared before splice");
      const body = bodyText.trim();
      if (!body.startsWith("if") || !body.includes(edit.routePath) || !body.includes(edit.httpMethod) || this.stubPattern.test(body)) {
        throw new Error(`Targeted output must contain one complete ${edit.httpMethod} ${edit.routePath} route block without placeholders`);
      }
      const probe = ts.createSourceFile("route-probe.ts", `class __Probe { async run() {\n${body}\n} }`, ts.ScriptTarget.Latest, true);
      const diagnostics = (probe as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
      if (diagnostics.length > 0) throw new Error(`Targeted route block is not valid TypeScript syntax: ${diagnostics[0]!.messageText.toString()}`);

      if (edit.kind === "route") {
        let target: ts.IfStatement | undefined;
        const findTarget = (node: ts.Node): void => {
          const parentMethod = ts.isIfStatement(node) ? this.findOwningMethod(node) : undefined;
          if (ts.isIfStatement(node) && parentMethod?.name && ts.isIdentifier(parentMethod.name) &&
              parentMethod.name.text === edit.methodName && node.expression.getText(sourceFile).includes(edit.routePath!) &&
              node.expression.getText(sourceFile).includes(edit.httpMethod!)) target = node;
          if (!target) ts.forEachChild(node, findTarget);
        };
        findTarget(sourceFile);
        if (!target) throw new Error(`Target route ${edit.httpMethod} ${edit.routePath} disappeared before splice`);
        return source.slice(0, target.getStart(sourceFile)) + body + source.slice(target.getEnd());
      }

      const fallback = this.findFrontendFallback(handler);
      if (!fallback) throw new Error("Static frontend fallback insertion point disappeared before splice");
      return source.slice(0, fallback.getStart(sourceFile)) + `${body}\n\n` + source.slice(fallback.getStart(sourceFile));
    }

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

  private static findOwningMethod(node: ts.Node): ts.MethodDeclaration | undefined {
    let parent = node.parent;
    while (parent && !ts.isMethodDeclaration(parent)) parent = parent.parent;
    return parent && ts.isMethodDeclaration(parent) ? parent : undefined;
  }

  private static findHttpRequestHandler(sourceFile: ts.SourceFile): ts.MethodDeclaration | undefined {
    let handler: ts.MethodDeclaration | undefined;
    const visit = (node: ts.Node): void => {
      if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name) && node.name.text === "handleRequest" && node.body) {
        if (handler) {
          handler = undefined;
          return;
        }
        handler = node;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return handler;
  }

  private static findFrontendFallback(handler: ts.MethodDeclaration): ts.IfStatement | undefined {
    let fallback: ts.IfStatement | undefined;
    const visit = (node: ts.Node): void => {
      if (ts.isIfStatement(node) && node.expression.getText().includes("this.config.frontendDistPath")) fallback = node;
      if (!fallback) ts.forEachChild(node, visit);
    };
    if (handler.body) visit(handler.body);
    return fallback;
  }
}
