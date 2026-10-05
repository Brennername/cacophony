import ts from "typescript";

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
    if (!original.trim()) return [];

    const issues: string[] = [];
    const oldLines = original.split(/\r?\n/).length;
    const newLines = replacement.split(/\r?\n/).length;
    const permitsRemoval = /\b(?:remove|delete|deprecate)\s+(?:the\s+)?(?:existing\s+)?(?:method|function|class|interface|property|field|implementation|declaration|file|module)\b/i.test(taskText);

    if (!permitsRemoval && oldLines >= 80 && newLines < oldLines * 0.6) {
      issues.push(`Generated replacement shrinks ${filePath} from ${oldLines} to ${newLines} lines.`);
    }

    const originalNames = this.collectDeclarations(original, filePath);
    const replacementNames = this.collectDeclarations(replacement, filePath);
    const missing = [...originalNames].filter((name) => !replacementNames.has(name));
    if (!permitsRemoval && missing.length > 0) {
      issues.push(`Generated replacement removes existing declarations: ${missing.slice(0, 12).join(", ")}.`);
    }

    return issues;
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
}
