import ts from "typescript";

/**
 * IncrementalClassMerger
 *
 * Implements Incremental Code Preservation under SOLID principles:
 * When language models generate updates for large existing classes (e.g. AutonomousWorkerPipeline,
 * CacophonyHttpServer), they often output only the newly implemented method or a partial class
 * with stubbed/omitted existing methods.
 *
 * This merger compares AST nodes of the original file and newly generated code:
 * 1. Preserves all existing methods, properties, and constructors in the original class.
 * 2. Injects any newly created methods or replaces modified methods.
 * 3. Injects any new import declarations that do not yet exist in the original file.
 * 4. Injects any new top-level exported functions, interfaces, or type aliases.
 * 5. Rejects placeholder stubs like '/* existing implementation * /' to protect working code.
 */
export class IncrementalClassMerger {
  /**
   * Merges newly synthesized code into original existing file content using AST analysis.
   *
   * @param originalCode The full original source code already on disk.
   * @param newCode The new code emitted by the inference pipeline.
   * @returns Merged TypeScript code preserving existing methods and incorporating new members.
   */
  public static merge(originalCode: string, newCode: string): string {
    const trimmedOrig = originalCode.trim();
    const trimmedNew = newCode.trim();

    if (!trimmedOrig) {
      return newCode;
    }
    if (!trimmedNew) {
      return originalCode;
    }

    let origSf: ts.SourceFile;
    let newSf: ts.SourceFile;

    try {
      origSf = ts.createSourceFile("original.ts", originalCode, ts.ScriptTarget.ES2022, true);
      newSf = ts.createSourceFile("new.ts", newCode, ts.ScriptTarget.ES2022, true);
    } catch {
      // If AST parsing fails, fallback to newCode
      return newCode;
    }

    // Find class declarations in original and new code
    const origClasses = new Map<string, ts.ClassDeclaration>();
    for (const stmt of origSf.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name) {
        origClasses.set(stmt.name.text, stmt);
      }
    }

    const newClasses = new Map<string, ts.ClassDeclaration>();
    for (const stmt of newSf.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name) {
        newClasses.set(stmt.name.text, stmt);
      }
    }

    // Check if there is an overlapping class name
    let matchingClassName: string | null = null;
    for (const className of newClasses.keys()) {
      if (origClasses.has(className)) {
        matchingClassName = className;
        break;
      }
    }

    if (!matchingClassName) {
      // If new code is a pure standalone file or does not overlap existing classes, return newCode
      return newCode;
    }

    const origClass = origClasses.get(matchingClassName)!;
    const newClass = newClasses.get(matchingClassName)!;

    // Check existing member names in original class
    const origMembersByName = new Map<string, ts.ClassElement>();
    for (const m of origClass.members) {
      if (m.name && ts.isIdentifier(m.name)) {
        origMembersByName.set(m.name.text, m);
      }
    }

    // If new class has MORE or equal members and no placeholders, newCode might be a full replacement
    const isStubbed =
      newCode.includes("existing implementation") ||
      newCode.includes("existing code") ||
      newCode.includes("// ...") ||
      newCode.includes("/* ... */");

    const newMembersToAdd: string[] = [];
    for (const m of newClass.members) {
      if (ts.isConstructorDeclaration(m)) {
        continue; // Keep original constructor
      }

      const memberText = m.getText(newSf).trim();
      // Skip placeholder stubs
      if (
        memberText.includes("existing implementation") ||
        memberText.includes("existing code") ||
        memberText.includes("// ...")
      ) {
        continue;
      }

      if (m.name && ts.isIdentifier(m.name)) {
        const memberName = m.name.text;
        if (!origMembersByName.has(memberName)) {
          // Genuinely new member
          newMembersToAdd.push(memberText);
        } else if (isStubbed || newClass.members.length < origClass.members.length / 2) {
          // If newCode is a partial class update and member changed, replace it
          const origMember = origMembersByName.get(memberName)!;
          const origText = origMember.getText(origSf).trim();
          if (origText !== memberText) {
            newMembersToAdd.push(memberText);
          }
        }
      }
    }

    // If newCode contains almost all members of original class and no stubs, it is a valid full rewrite
    if (!isStubbed && newClass.members.length >= origClass.members.length * 0.8) {
      return newCode;
    }

    // Collect new imports in newCode not present in originalCode
    const origImportTexts = new Set<string>();
    for (const stmt of origSf.statements) {
      if (ts.isImportDeclaration(stmt)) {
        origImportTexts.add(stmt.getText(origSf).trim().replace(/\s+/g, " "));
      }
    }

    const newImportsToAdd: string[] = [];
    for (const stmt of newSf.statements) {
      if (ts.isImportDeclaration(stmt)) {
        const text = stmt.getText(newSf).trim().replace(/\s+/g, " ");
        if (!origImportTexts.has(text)) {
          newImportsToAdd.push(stmt.getText(newSf).trim());
        }
      }
    }

    // Collect new top-level functions, interfaces, type aliases
    const origTopLevelNames = new Set<string>();
    for (const stmt of origSf.statements) {
      if ((ts.isFunctionDeclaration(stmt) || ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) && stmt.name) {
        origTopLevelNames.add(stmt.name.text);
      }
    }

    const newTopLevelToAdd: string[] = [];
    for (const stmt of newSf.statements) {
      if ((ts.isFunctionDeclaration(stmt) || ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) && stmt.name) {
        if (!origTopLevelNames.has(stmt.name.text)) {
          newTopLevelToAdd.push(stmt.getText(newSf).trim());
        }
      }
    }

    if (newMembersToAdd.length === 0 && newImportsToAdd.length === 0 && newTopLevelToAdd.length === 0) {
      return originalCode;
    }

    // Build merged code
    let merged = originalCode;

    // 1. Prepend new imports
    if (newImportsToAdd.length > 0) {
      merged = newImportsToAdd.join("\n") + "\n" + merged;
    }

    // 2. Append new top-level declarations
    if (newTopLevelToAdd.length > 0) {
      merged = merged + "\n\n" + newTopLevelToAdd.join("\n\n");
    }

    // 3. Inject new class members before the closing brace of the target class
    if (newMembersToAdd.length > 0) {
      // Re-parse merged code to locate closing brace accurately
      const reParsedSf = ts.createSourceFile("reparsed.ts", merged, ts.ScriptTarget.ES2022, true);
      let reParsedClass: ts.ClassDeclaration | null = null;
      for (const stmt of reParsedSf.statements) {
        if (ts.isClassDeclaration(stmt) && stmt.name?.text === matchingClassName) {
          reParsedClass = stmt;
          break;
        }
      }

      if (reParsedClass) {
        const classEnd = reParsedClass.end; // End position after closing brace '}'
        // Find the index of the last closing brace '}' in that range
        const closingBraceIdx = merged.lastIndexOf("}", classEnd);
        if (closingBraceIdx !== -1) {
          const indent = "  ";
          const formattedMembers =
            "\n\n" +
            newMembersToAdd
              .map((m) =>
                m
                  .split("\n")
                  .map((line) => (line.trim() ? indent + line : line))
                  .join("\n")
              )
              .join("\n\n") +
            "\n";

          merged = merged.slice(0, closingBraceIdx) + formattedMembers + merged.slice(closingBraceIdx);
        }
      }
    }

    return merged;
  }
}
