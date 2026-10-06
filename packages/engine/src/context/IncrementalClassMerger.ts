import ts from "typescript";

/**
 * IncrementalClassMerger
 *
 * Implements Incremental Code Preservation under SOLID principles:
 * When language models generate updates for large existing classes (e.g. AutonomousWorkerPipeline,
 * CacophonyHttpServer), they often output only the newly implemented method, a route handler,
 * or a partial class with stubbed/omitted existing methods.
 *
 * This merger compares AST nodes of the original file and newly generated code:
 * 1. Preserves all existing methods, properties, and constructors in the original class.
 * 2. Injects any newly created methods or updates existing methods in place without duplicates.
 * 3. Injects any new import declarations that do not yet exist in the original file.
 * 4. Injects any new top-level exported functions, interfaces, or type aliases.
 * 5. Rejects placeholder stubs like '/* existing implementation * /' to protect working code.
 * 6. Hard safety guard: Never overwrites a large existing file with a truncated or broken stub.
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
      // If AST parsing fails and originalCode is substantial, protect originalCode
      if (originalCode.length > 500) {
        return originalCode;
      }
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

    // Fallback 1: If original has exactly one class and new code defined a single class with a different name
    if (!matchingClassName && origClasses.size === 1) {
      const origClassName = Array.from(origClasses.keys())[0]!;
      if (newClasses.size === 1) {
        const candidateNewClass = Array.from(newClasses.values())[0]!;
        newClasses.set(origClassName, candidateNewClass);
        matchingClassName = origClassName;
      } else if (newClasses.size === 0) {
        // Fallback 2: Model emitted methods or code without a class wrapper
        // Separate imports from body
        const lines = newCode.split("\n");
        const importLines: string[] = [];
        const bodyLines: string[] = [];
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith("import ") || t.startsWith("import{") || t.startsWith("export type ") || t.startsWith("export interface ")) {
            importLines.push(line);
          } else {
            bodyLines.push(line);
          }
        }

        // Check if body is an HTTP route block for CacophonyHttpServer
        const bodyText = bodyLines.join("\n").trim();
        if (
          origClassName === "CacophonyHttpServer" &&
          (bodyText.includes("url.pathname") || bodyText.includes("req.method"))
        ) {
          // Look for either production marker or fallback serveStatic marker
          const markers = [
            "// 5. Static Angular Frontend Serving",
            "this.serveStatic(",
            "// Static asset fallback"
          ];
          let markerIdx = -1;
          for (const m of markers) {
            markerIdx = originalCode.indexOf(m);
            if (markerIdx !== -1) {
              break;
            }
          }

          if (markerIdx !== -1) {
            let mergedWithRoute =
              originalCode.slice(0, markerIdx) +
              "    // Autonomous Injected Route Handler\n    " +
              bodyText +
              "\n\n    " +
              originalCode.slice(markerIdx);

            if (importLines.length > 0) {
              mergedWithRoute = importLines.join("\n") + "\n" + mergedWithRoute;
            }
            return mergedWithRoute;
          }
        }

        // Try wrapping body in class declaration only if body looks like class members
        const looksLikeClassMember =
          bodyText.startsWith("public ") ||
          bodyText.startsWith("private ") ||
          bodyText.startsWith("protected ") ||
          bodyText.startsWith("async ");

        if (looksLikeClassMember) {
          const wrappedCode = `${importLines.join("\n")}\nclass ${origClassName} {\n${bodyLines.join("\n")}\n}`;
          try {
            const wrappedSf = ts.createSourceFile("wrapped.ts", wrappedCode, ts.ScriptTarget.ES2022, true);
            for (const stmt of wrappedSf.statements) {
              if (ts.isClassDeclaration(stmt)) {
                newClasses.set(origClassName, stmt);
                matchingClassName = origClassName;
                newSf = wrappedSf;
                break;
              }
            }
          } catch {
            // Wrap failed
          }
        }
      }
    }

    if (!matchingClassName) {
      // Safety guard: If original file is large and newCode is small/fragmented, NEVER destroy originalCode
      if (originalCode.length > 2000 && newCode.length < originalCode.length * 0.7) {
        return originalCode;
      }
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

    // Check if new class has placeholder comments
    const isStubbed =
      newCode.includes("existing implementation") ||
      newCode.includes("existing code") ||
      newCode.includes("// ...") ||
      newCode.includes("/* ... */");

    const newMembersToAppend: string[] = [];
    const membersToReplace = new Map<ts.ClassElement, string>();

    for (const m of newClass.members) {
      if (ts.isConstructorDeclaration(m)) {
        continue; // Always preserve original constructor
      }

      const memberText = m.getText(newSf).trim();
      // Skip placeholder stubs
      if (
        memberText.includes("existing implementation") ||
        memberText.includes("existing code") ||
        memberText.includes("// ...") ||
        memberText.includes("/* ... */")
      ) {
        continue;
      }

      if (m.name && ts.isIdentifier(m.name)) {
        const memberName = m.name.text;
        if (!origMembersByName.has(memberName)) {
          // Genuinely new member
          newMembersToAppend.push(memberText);
        } else if (isStubbed || newClass.members.length < origClass.members.length) {
          // Member was modified in partial class: replace in place
          const origMember = origMembersByName.get(memberName)!;
          const origText = origMember.getText(origSf).trim();
          if (origText !== memberText) {
            membersToReplace.set(origMember, memberText);
          }
        }
      }
    }

    // A full-file response is safe to accept only when it still contains every
    // original named member. Partial class responses are merged surgically.
    const generatedMemberNames = new Set<string>();
    for (const member of newClass.members) {
      if (member.name && ts.isIdentifier(member.name)) generatedMemberNames.add(member.name.text);
    }
    const containsAllOriginalMembers = [...origMembersByName.keys()].every((name) => generatedMemberNames.has(name));
    if (!isStubbed && containsAllOriginalMembers && newClass.members.length >= origClass.members.length) {
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

    if (
      newMembersToAppend.length === 0 &&
      membersToReplace.size === 0 &&
      newImportsToAdd.length === 0 &&
      newTopLevelToAdd.length === 0
    ) {
      return originalCode;
    }

    // Build merged code
    let merged = originalCode;

    // 1. Apply in-place member replacements (sorted descending by position)
    if (membersToReplace.size > 0) {
      const sortedReplacements = Array.from(membersToReplace.entries()).sort(
        (a, b) => b[0].getStart(origSf) - a[0].getStart(origSf)
      );
      for (const [origElem, newText] of sortedReplacements) {
        const start = origElem.getStart(origSf);
        const end = origElem.getEnd();
        merged = merged.slice(0, start) + newText + merged.slice(end);
      }
    }

    // 2. Prepend new imports
    if (newImportsToAdd.length > 0) {
      merged = newImportsToAdd.join("\n") + "\n" + merged;
    }

    // 3. Append new top-level declarations
    if (newTopLevelToAdd.length > 0) {
      merged = merged + "\n\n" + newTopLevelToAdd.join("\n\n");
    }

    // 4. Inject new class members before the closing brace of the target class
    if (newMembersToAppend.length > 0) {
      const reParsedSf = ts.createSourceFile("reparsed.ts", merged, ts.ScriptTarget.ES2022, true);
      let reParsedClass: ts.ClassDeclaration | null = null;
      for (const stmt of reParsedSf.statements) {
        if (ts.isClassDeclaration(stmt) && stmt.name?.text === matchingClassName) {
          reParsedClass = stmt;
          break;
        }
      }

      if (reParsedClass) {
        const classEnd = reParsedClass.end;
        const closingBraceIdx = merged.lastIndexOf("}", classEnd);
        if (closingBraceIdx !== -1) {
          const indent = "  ";
          const formattedMembers =
            "\n\n" +
            newMembersToAppend
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
