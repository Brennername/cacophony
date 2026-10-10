import ts from "typescript";
import { TypeScriptMethodSplicer } from "../context/TypeScriptMethodSplicer.js";
import { StubCommentSanitizer } from "./StubCommentSanitizer.js";

/**
 * Rejects generated replacements that accidentally discard existing declarations.
 * Task worktrees are isolated, but destructive rewrites waste model time and can
 * obscure the requested change behind a superficially small test.
 */
export class GeneratedChangeGuard {
  public static inspectReplacement(
    filePath: string,
    original: string,
    replacement: string,
    taskText: string
  ): readonly string[] {
    const issues: string[] = [];

    const replacementSource = ts.createSourceFile(filePath, replacement, ts.ScriptTarget.Latest, true);
    const parseDiagnostics = (replacementSource as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
    if (parseDiagnostics.length > 0) {
      issues.push(`Generated replacement is not parseable: ${parseDiagnostics[0]!.messageText.toString()}.`);
      return issues;
    }

    const addedPlaceholders = this.getAddedPlaceholderComments(original, replacement);
    if (addedPlaceholders.length > 0) {
      issues.push(`Generated replacement added placeholder code: ${addedPlaceholders.slice(0, 3).join("; ")}.`);
    }

    const residualMarkers = StubCommentSanitizer.findResidualMarkers(replacement);
    if (residualMarkers.length > 0) {
      issues.push(`Generated replacement contains residual stub comments: ${residualMarkers.slice(0, 3).join("; ")}.`);
    }

    // Check for Angular placeholder/empty templates in newly created or modified components
    this.inspectAngularComponentTemplates(filePath, replacement, issues);

    // Check for naked module-root function executions in library and service modules
    this.inspectModuleRootExecutions(filePath, replacementSource, issues);

    if (!original.trim()) {
      for (const statement of replacementSource.statements) {
        if (ts.isClassDeclaration(statement)) {
          for (const member of statement.members) {
            if (ts.isMethodDeclaration(member) && this.hasExplicitPlaceholder(member)) {
              const className = statement.name?.text || "AnonymousClass";
              const mName = this.memberName(member) || "method";
              issues.push(`Generated class ${className}.${mName} contains a placeholder stub.`);
            }
          }
        }
      }
      return issues;
    }

    const oldLines = original.split(/\r?\n/).length;
    const newLines = replacement.split(/\r?\n/).length;
    const authorizedRemovals = this.getAuthorizedRemovals(taskText);

    if (oldLines >= 80 && newLines < oldLines * 0.6 && authorizedRemovals.size === 0) {
      issues.push(`Generated replacement shrinks ${filePath} from ${oldLines} to ${newLines} lines.`);
    }

    // Check for JSDoc documentation stripping
    const originalJsDocs = this.countJsDocBlocks(original);
    const replacementJsDocs = this.countJsDocBlocks(replacement);
    if (originalJsDocs > 0 && replacementJsDocs < originalJsDocs && authorizedRemovals.size === 0) {
      const stripped = originalJsDocs - replacementJsDocs;
      issues.push(`Generated replacement stripped ${stripped} JSDoc documentation comment block(s) from ${filePath}.`);
    }

    const originalNames = this.collectDeclarations(original, filePath);
    const replacementNames = this.collectDeclarations(replacement, filePath);
    const missing = [...originalNames].filter((name) =>
      !replacementNames.has(name) && !this.isAuthorizedRemoval(name, authorizedRemovals)
    );
    if (missing.length > 0) {
      issues.push(`Generated replacement removes existing declarations: ${missing.slice(0, 12).join(", ")}.`);
    }

    const originalSource = ts.createSourceFile(filePath, original, ts.ScriptTarget.Latest, true);

    // A full-file response may retain every declaration name while silently
    // replacing sibling implementations. When an AST target is identified by the task,
    // allow body changes only for that target; every other existing class member and
    // named top-level declaration must remain byte-for-byte equivalent.
    const targetEdit = TypeScriptMethodSplicer.prepare(original, taskText, filePath);
    if (targetEdit) {
      const targetClass = targetEdit.className;
      const targetMethod = targetEdit.methodName;
      for (const originalStatement of originalSource.statements) {
        if (!ts.isClassDeclaration(originalStatement) || !originalStatement.name) continue;
        const replacementClass = replacementSource.statements.find(
          (statement): statement is ts.ClassDeclaration =>
            ts.isClassDeclaration(statement) && statement.name?.text === originalStatement.name!.text
        );
        if (!replacementClass) continue; // Declaration removal is reported above.

        for (const originalMember of originalStatement.members) {
          const name = this.memberName(originalMember);
          if (!name) continue;
          const replacementMember = replacementClass.members.find((member) => this.memberName(member) === name);
          if (!replacementMember && this.isAuthorizedRemoval(`${originalStatement.name.text}.${name}`, authorizedRemovals)) continue;
          if (!replacementMember || originalMember.getText(originalSource) === replacementMember.getText(replacementSource)) continue;

          const isTarget = originalStatement.name.text === targetClass && name === targetMethod;
          if (isTarget && targetEdit.kind === "method" &&
              ts.isMethodDeclaration(originalMember) && ts.isMethodDeclaration(replacementMember)) {
            const originalHeader = originalMember.body
              ? originalMember.getText(originalSource).slice(0, originalMember.body.getStart(originalSource) - originalMember.getStart(originalSource))
              : originalMember.getText(originalSource);
            const replacementHeader = replacementMember.body
              ? replacementMember.getText(replacementSource).slice(0, replacementMember.body.getStart(replacementSource) - replacementMember.getStart(replacementSource))
              : replacementMember.getText(replacementSource);
            if (originalHeader !== replacementHeader) {
              issues.push(`Generated replacement changed the signature of ${originalStatement.name.text}.${name}.`);
            }
            if (this.hasPlaceholderBody(replacementMember) && !this.hasPlaceholderBody(originalMember)) {
              issues.push(`Generated replacement left a stub in ${originalStatement.name.text}.${name}.`);
            }
            continue;
          }

          if (isTarget && (targetEdit.kind === "route" || targetEdit.kind === "route-insert") &&
              name === "handleRequest" && ts.isMethodDeclaration(originalMember) && ts.isMethodDeclaration(replacementMember)) {
            const routeIssues = this.inspectRouteSiblings(
              originalMember,
              replacementMember,
              originalSource,
              replacementSource,
              targetEdit.routePath || "",
              targetEdit.httpMethod || ""
            );
            issues.push(...routeIssues);
            continue;
          }

          issues.push(`Generated replacement changed non-target member ${originalStatement.name.text}.${name}.`);
        }
      }

      const originalNamedStatements = this.namedTopLevelStatements(originalSource);
      const replacementNamedStatements = this.namedTopLevelStatements(replacementSource);
      for (const [name, statement] of originalNamedStatements) {
        const current = replacementNamedStatements.get(name);
        if (current && statement.getText(originalSource) !== current.getText(replacementSource)) {
          issues.push(`Generated replacement changed non-target declaration ${name}.`);
        }
      }
    } else {
      // For general full-file edits without a single target anchor, verify that
      // existing populated methods are not replaced with stub or empty bodies.
      for (const originalStatement of originalSource.statements) {
        if (!ts.isClassDeclaration(originalStatement) || !originalStatement.name) continue;
        const replacementClass = replacementSource.statements.find(
          (statement): statement is ts.ClassDeclaration =>
            ts.isClassDeclaration(statement) && statement.name?.text === originalStatement.name!.text
        );
        if (!replacementClass) continue;

        for (const originalMember of originalStatement.members) {
          const name = this.memberName(originalMember);
          if (!name) continue;
          const replacementMember = replacementClass.members.find((member) => this.memberName(member) === name);
          if (!replacementMember) continue;

          if (ts.isMethodDeclaration(originalMember) && ts.isMethodDeclaration(replacementMember)) {
            if (this.hasPlaceholderBody(replacementMember) && !this.hasPlaceholderBody(originalMember)) {
              issues.push(`Generated replacement left a stub in ${originalStatement.name.text}.${name}.`);
            }
          }
        }
      }
    }

    return issues;
  }

  private static countJsDocBlocks(code: string): number {
    let count = 0;
    let cursor = 0;
    while (cursor < code.length) {
      const startIdx = code.indexOf("/**", cursor);
      if (startIdx === -1) break;
      const endIdx = code.indexOf("*/", startIdx + 3);
      if (endIdx === -1) break;
      count++;
      cursor = endIdx + 2;
    }
    return count;
  }

  private static readonly placeholderKeywords = [
    "previous code goes here",
    "existing code goes here",
    "existing code remains",
    "existing implementation",
    "rest of the method",
    "rest of the class",
    "rest of the file",
    "rest of the code",
    "rest of method",
    "rest of class",
    "rest of file",
    "rest of code",
    "unchanged method",
    "unchanged methods",
    "unchanged code",
    "omitted for brevity"
  ];

  private static getAddedPlaceholderComments(original: string, replacement: string): string[] {
    const isPlaceholderLine = (line: string): string | null => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      const todoMatch = trimmed.match(/\bTODO\s*:\s*(?:implement|fill|complete)\b/i);
      if (todoMatch) {
        return todoMatch[0].toLowerCase();
      }

      if (trimmed.startsWith("//")) {
        const commentBody = trimmed.slice(2).trim().replace(/^\[\s*/, "").replace(/\s*\]$/, "").trim().toLowerCase();
        if (commentBody === "..." || commentBody.startsWith("...")) {
          return trimmed.toLowerCase();
        }
        for (const kw of GeneratedChangeGuard.placeholderKeywords) {
          if (commentBody.includes(kw)) {
            return trimmed.toLowerCase();
          }
        }
      }

      if (trimmed.startsWith("/*") && trimmed.endsWith("*/")) {
        const commentBody = trimmed.slice(2, -2).trim().replace(/^\[\s*/, "").replace(/\s*\]$/, "").trim().toLowerCase();
        if (commentBody === "..." || commentBody.startsWith("...")) {
          return trimmed.toLowerCase();
        }
        for (const kw of GeneratedChangeGuard.placeholderKeywords) {
          if (commentBody.includes(kw)) {
            return trimmed.toLowerCase();
          }
        }
      }

      return null;
    };

    const count = (source: string): Map<string, number> => {
      const found = new Map<string, number>();
      for (const rawLine of source.split(/\r?\n/)) {
        const marker = isPlaceholderLine(rawLine);
        if (marker) {
          const key = marker.replace(/\s+/g, " ").trim();
          found.set(key, (found.get(key) || 0) + 1);
        }
      }
      return found;
    };
    const originalCounts = count(original);
    const replacementCounts = count(replacement);
    return [...replacementCounts]
      .filter(([marker, amount]) => amount > (originalCounts.get(marker) || 0))
      .map(([marker]) => marker);
  }

  private static getAuthorizedRemovals(taskText: string): Set<string> {
    const names = new Set<string>();
    const expression = /\b(?:remove|delete|deprecate)\s+(?:the\s+)?(?:existing\s+)?(?:method|function|class|interface|property|field|implementation|declaration)\s+[`'\"]?([A-Za-z_$][\w$]*)/gi;
    for (const match of taskText.matchAll(expression)) {
      if (match[1]) names.add(match[1].toLowerCase());
    }
    return names;
  }

  private static isAuthorizedRemoval(declarationName: string, authorized: ReadonlySet<string>): boolean {
    const shortName = declarationName.split(".").at(-1)?.toLowerCase();
    return Boolean(shortName && authorized.has(shortName));
  }

  private static memberName(member: ts.ClassElement): string | undefined {
    if (ts.isConstructorDeclaration(member)) return "constructor";
    if (!member.name) return undefined;
    if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name)) {
      return member.name.text;
    }
    return undefined;
  }

  private static hasPlaceholderBody(member: ts.MethodDeclaration): boolean {
    if (!member.body) return false;
    const body = member.body.getText();
    return member.body.statements.length === 0 ||
      /throw\s+new\s+Error\s*\(\s*[`'\"](?:not implemented|todo|stub)/i.test(body);
  }

  private static inspectRouteSiblings(
    original: ts.MethodDeclaration,
    replacement: ts.MethodDeclaration,
    originalSource: ts.SourceFile,
    replacementSource: ts.SourceFile,
    routePath: string,
    httpMethod: string
  ): string[] {
    if (!original.body || !replacement.body) return ["Generated replacement removed the request handler body."];
    const isTarget = (statement: ts.Statement, source: ts.SourceFile): boolean => {
      if (!ts.isIfStatement(statement)) return false;
      const condition = statement.expression.getText(source);
      return condition.includes(routePath) && condition.includes(httpMethod);
    };
    const oldRoutes = original.body.statements.filter((statement) => isTarget(statement, originalSource));
    const newRoutes = replacement.body.statements.filter((statement) => isTarget(statement, replacementSource));
    const oldSiblings = original.body.statements.filter((statement) => !isTarget(statement, originalSource));
    const newSiblings = replacement.body.statements.filter((statement) => !isTarget(statement, replacementSource));
    if (newRoutes.length !== 1) return [`Expected exactly one ${httpMethod} ${routePath} route after generation.`];
    if (oldRoutes.length > 1 || oldSiblings.length !== newSiblings.length ||
        oldSiblings.some((statement, index) => statement.getText(originalSource) !== newSiblings[index]?.getText(replacementSource))) {
      return [`Generated replacement changed request-handler code outside ${httpMethod} ${routePath}.`];
    }
    return [];
  }

  private static namedTopLevelStatements(sourceFile: ts.SourceFile): Map<string, ts.Statement> {
    const named = new Map<string, ts.Statement>();
    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement) || ts.isClassDeclaration(statement)) continue;
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) named.set(declaration.name.text, statement);
        }
        continue;
      }
      const declaration = statement as ts.Statement & { name?: ts.Identifier };
      if (declaration.name && ts.isIdentifier(declaration.name)) named.set(declaration.name.text, statement);
    }
    return named;
  }

  private static collectDeclarations(source: string, filePath: string): Set<string> {
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
    const names = new Set<string>();
    for (const statement of sourceFile.statements) {
      if (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
          ts.isFunctionDeclaration(statement) || ts.isTypeAliasDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) {
        if (statement.name) names.add(statement.name.text);
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
        }
      }

      if (ts.isClassDeclaration(statement) && statement.name) {
        for (const member of statement.members) {
          const name = member.name && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name))
            ? member.name.text
            : ts.isConstructorDeclaration(member) ? "constructor" : undefined;
          if (name) names.add(`${statement.name.text}.${name}`);
        }
      }
    }
    return names;
  }

  private static inspectAngularComponentTemplates(filePath: string, source: string, issues: string[]): void {
    if (!filePath.endsWith(".ts") || !source.includes("@Component")) return;
    const templateMatch = source.match(/template\s*:\s*[`'"]([\s\S]*?)[`'"]/);
    if (templateMatch && templateMatch[1] !== undefined) {
      const tpl = templateMatch[1].trim();
      if (
        tpl === "" ||
        /^<div(\s+class=["'][^"']*["'])?>\s*<\/div>$/i.test(tpl) ||
        tpl === '<div class="component-container"></div>' ||
        /^<p>\s*<\/p>$/i.test(tpl) ||
        tpl.length < 15
      ) {
        issues.push(`Generated Angular component in ${filePath} contains an empty or placeholder template.`);
      }
    }
  }

  private static inspectModuleRootExecutions(filePath: string, source: ts.SourceFile, issues: string[]): void {
    if (
      !filePath.endsWith(".ts") ||
      filePath.endsWith(".test.ts") ||
      filePath.endsWith(".spec.ts") ||
      filePath.includes("/bin/") ||
      filePath.includes("/scripts/") ||
      filePath.includes("main.ts")
    ) {
      return;
    }
    for (const statement of source.statements) {
      if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)) {
        const expr = statement.expression.expression;
        const callName = expr.getText(source);
        if (
          !callName.startsWith("describe") &&
          !callName.startsWith("test") &&
          !callName.startsWith("it") &&
          !callName.startsWith("before") &&
          !callName.startsWith("after") &&
          !callName.startsWith("console.")
        ) {
          issues.push(`Generated file ${filePath} executes '${callName}(...)' at module root; library modules must encapsulate execution.`);
        }
      }
    }
  }

  private static hasExplicitPlaceholder(member: ts.MethodDeclaration): boolean {
    if (!member.body) return false;
    const body = member.body.getText();
    return (
      /throw\s+new\s+Error\s*\(\s*[`'"](?:not implemented|todo|stub)/i.test(body) ||
      /\/\/\s*(?:TODO|stub|placeholder)/i.test(body)
    );
  }
}
