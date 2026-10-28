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
      origSf = ts.createSourceFile(
        "original.ts",
        originalCode,
        ts.ScriptTarget.ES2022,
        true,
      );
      newSf = ts.createSourceFile(
        "new.ts",
        newCode,
        ts.ScriptTarget.ES2022,
        true,
      );
    } catch {
      // If AST parsing fails and originalCode is substantial, protect originalCode
      if (originalCode.length > 500) {
        return originalCode;
      }
      return newCode;
    }

    // Check if either file is a test suite (describe/it/test blocks)
    if (this.isTestSuiteSource(origSf) || this.isTestSuiteSource(newSf)) {
      return this.mergeTestSuite(origSf, newSf, originalCode, newCode);
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
          if (
            t.startsWith("import ") ||
            t.startsWith("import{") ||
            t.startsWith("export type ") ||
            t.startsWith("export interface ")
          ) {
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
            "// Static asset fallback",
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
            const wrappedSf = ts.createSourceFile(
              "wrapped.ts",
              wrappedCode,
              ts.ScriptTarget.ES2022,
              true,
            );
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
      // Check if newCode defines new exported declarations (interfaces, types, functions, classes)
      // that can be safely appended to originalCode while preserving all existing implementations
      const newDeclarations: string[] = [];
      const newImportLines: string[] = [];
      for (const stmt of newSf.statements) {
        if (ts.isImportDeclaration(stmt)) {
          const importText = stmt.getText(newSf);
          if (!originalCode.includes(importText)) {
            newImportLines.push(importText);
          }
        } else {
          newDeclarations.push(stmt.getText(newSf));
        }
      }

      const hasExportedDeclarations = newDeclarations.some((decl) =>
        /^\s*export\s+/.test(decl),
      );
      if (origClasses.size > 0 && hasExportedDeclarations) {
        let merged = originalCode;
        if (newImportLines.length > 0) {
          merged = newImportLines.join("\n") + "\n" + merged;
        }
        merged =
          merged.trimEnd() + "\n\n" + newDeclarations.join("\n\n") + "\n";
        return merged;
      }

      // Safety guard: If original file is large and newCode is small/fragmented, NEVER destroy originalCode
      if (
        originalCode.length > 2000 &&
        newCode.length < originalCode.length * 0.7
      ) {
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
        } else {
          // Member was modified in partial or full class: track for surgical replacement
          const origMember = origMembersByName.get(memberName)!;
          const origText = origMember.getText(origSf).trim();
          if (origText !== memberText) {
            // Check if original member had JSDoc comments that the newly generated member omitted
            const origMemberFull = origMember.getFullText(origSf);
            const origLeadingComment = origMemberFull
              .slice(0, origMember.getStart(origSf) - origMember.getFullStart())
              .trim();
            let replacementText = memberText;
            if (
              origLeadingComment.includes("/**") &&
              !memberText.includes("/**")
            ) {
              const jsDocMatch =
                origLeadingComment.match(/(\/\*\*[\s\S]*?\*\/)/);
              if (jsDocMatch) {
                replacementText = jsDocMatch[1] + "\n  " + memberText;
              }
            }
            membersToReplace.set(origMember, replacementText);
          }
        }
      }
    }

    // A full-file response is safe to accept only when it still contains every
    // original named member and does not strip existing JSDoc documentation comments.
    const generatedMemberNames = new Set<string>();
    for (const member of newClass.members) {
      if (member.name && ts.isIdentifier(member.name))
        generatedMemberNames.add(member.name.text);
    }
    const containsAllOriginalMembers = [...origMembersByName.keys()].every(
      (name) => generatedMemberNames.has(name),
    );

    const countJsDocs = (code: string): number => {
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
    };

    const origJsDocCount = countJsDocs(originalCode);
    const newJsDocCount = countJsDocs(newCode);
    const preservesAllJsDocs = newJsDocCount >= origJsDocCount;

    if (
      !isStubbed &&
      containsAllOriginalMembers &&
      newClass.members.length >= origClass.members.length &&
      preservesAllJsDocs
    ) {
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
      if (
        (ts.isFunctionDeclaration(stmt) ||
          ts.isInterfaceDeclaration(stmt) ||
          ts.isTypeAliasDeclaration(stmt)) &&
        stmt.name
      ) {
        origTopLevelNames.add(stmt.name.text);
      }
    }

    const newTopLevelToAdd: string[] = [];
    for (const stmt of newSf.statements) {
      if (
        (ts.isFunctionDeclaration(stmt) ||
          ts.isInterfaceDeclaration(stmt) ||
          ts.isTypeAliasDeclaration(stmt)) &&
        stmt.name
      ) {
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
        (a, b) => b[0].getStart(origSf) - a[0].getStart(origSf),
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
      const reParsedSf = ts.createSourceFile(
        "reparsed.ts",
        merged,
        ts.ScriptTarget.ES2022,
        true,
      );
      let reParsedClass: ts.ClassDeclaration | null = null;
      for (const stmt of reParsedSf.statements) {
        if (
          ts.isClassDeclaration(stmt) &&
          stmt.name?.text === matchingClassName
        ) {
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
                  .join("\n"),
              )
              .join("\n\n") +
            "\n";

          merged =
            merged.slice(0, closingBraceIdx) +
            formattedMembers +
            merged.slice(closingBraceIdx);
        }
      }
    }

    return merged;
  }

  /**
   * Evaluates if code fragment represents a stub comment or placeholder exception.
   */
  private static isStubText(text: string): boolean {
    return (
      text.includes("existing implementation") ||
      text.includes("existing code") ||
      text.includes("// ...") ||
      text.includes("/* ... */") ||
      /throw\s+new\s+Error\s*\(\s*[`'"](?:not implemented|todo|stub)/i.test(text)
    );
  }

  /**
   * Determines if a source file represents a unit or integration test suite
   * by inspecting for describe, it, test, or suite call expressions.
   */
  private static isTestSuiteSource(sf: ts.SourceFile): boolean {
    let hasTest = false;
    const walk = (node: ts.Node) => {
      if (hasTest) return;
      if (
        ts.isCallExpression(node) &&
        node.arguments.length >= 2 &&
        (ts.isStringLiteral(node.arguments[0]!) ||
          ts.isNoSubstitutionTemplateLiteral(node.arguments[0]!))
      ) {
        const text = node.expression.getText(sf);
        if (
          text === "it" ||
          text === "test" ||
          text === "describe" ||
          text === "suite" ||
          text.startsWith("it.") ||
          text.startsWith("test.") ||
          text.startsWith("describe.") ||
          text.startsWith("suite.")
        ) {
          hasTest = true;
          return;
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(sf);
    return hasTest;
  }

  /**
   * Extracts structural test suite metadata including test cases, describe suites, and import declarations.
   */
  private static extractTestSuiteStructure(sf: ts.SourceFile): {
    readonly tests: {
      readonly testName: string;
      readonly suiteTitles: string[];
      readonly node: ts.CallExpression;
      readonly statement: ts.Statement;
      readonly text: string;
    }[];
    readonly describes: {
      readonly title: string;
      readonly suiteTitles: string[];
      readonly node: ts.CallExpression;
      readonly statement: ts.Statement;
      readonly body: ts.Block;
      readonly text: string;
    }[];
    readonly imports: string[];
  } {
    const tests: {
      testName: string;
      suiteTitles: string[];
      node: ts.CallExpression;
      statement: ts.Statement;
      text: string;
    }[] = [];
    const describes: {
      title: string;
      suiteTitles: string[];
      node: ts.CallExpression;
      statement: ts.Statement;
      body: ts.Block;
      text: string;
    }[] = [];
    const imports: string[] = [];
    const describeStack: string[] = [];

    for (const stmt of sf.statements) {
      if (ts.isImportDeclaration(stmt)) {
        imports.push(stmt.getText(sf).trim());
      }
    }

    const walk = (node: ts.Node, currentStatement: ts.Statement) => {
      if (ts.isCallExpression(node)) {
        const exprText = node.expression.getText(sf);
        const isDesc =
          exprText === "describe" ||
          exprText === "suite" ||
          exprText.startsWith("describe.") ||
          exprText.startsWith("suite.");
        const isTst =
          exprText === "it" ||
          exprText === "test" ||
          exprText.startsWith("it.") ||
          exprText.startsWith("test.");

        if (isDesc && node.arguments.length >= 2) {
          const firstArg = node.arguments[0]!;
          let title = "";
          if (
            ts.isStringLiteral(firstArg) ||
            ts.isNoSubstitutionTemplateLiteral(firstArg)
          ) {
            title = firstArg.text;
          }
          const fnArg = node.arguments[1];
          let bodyBlock: ts.Block | null = null;
          if (
            fnArg &&
            (ts.isArrowFunction(fnArg) || ts.isFunctionExpression(fnArg))
          ) {
            if (ts.isBlock(fnArg.body)) {
              bodyBlock = fnArg.body;
            }
          }

          if (title && bodyBlock) {
            const suiteTitles = [...describeStack, title];
            describes.push({
              title,
              suiteTitles,
              node,
              statement: currentStatement,
              body: bodyBlock,
              text: currentStatement.getText(sf),
            });
            describeStack.push(title);
            ts.forEachChild(bodyBlock, (child) => {
              const childStmt = ts.isStatement(child)
                ? child
                : currentStatement;
              walk(child, childStmt);
            });
            describeStack.pop();
            return;
          }
        } else if (isTst && node.arguments.length >= 2) {
          const firstArg = node.arguments[0]!;
          let testName = "";
          if (
            ts.isStringLiteral(firstArg) ||
            ts.isNoSubstitutionTemplateLiteral(firstArg)
          ) {
            testName = firstArg.text;
          }
          if (testName) {
            tests.push({
              testName,
              suiteTitles: [...describeStack],
              node,
              statement: currentStatement,
              text: currentStatement.getText(sf),
            });
            return;
          }
        }
      }

      ts.forEachChild(node, (child) => {
        const nextStmt = ts.isStatement(child) ? child : currentStatement;
        walk(child, nextStmt);
      });
    };

    for (const stmt of sf.statements) {
      if (!ts.isImportDeclaration(stmt)) {
        walk(stmt, stmt);
      }
    }

    return { tests, describes, imports };
  }

  /**
   * Merges newly generated test suite code into an existing test file.
   * Preserves all existing tests from originalCode, updates modified tests in place,
   * injects newly added tests into matching describe blocks, and incorporates new imports.
   */
  private static mergeTestSuite(
    origSf: ts.SourceFile,
    newSf: ts.SourceFile,
    originalCode: string,
    newCode: string,
  ): string {
    const origStruct = this.extractTestSuiteStructure(origSf);
    const newStruct = this.extractTestSuiteStructure(newSf);

    if (newStruct.tests.length === 0 && newStruct.describes.length === 0) {
      return originalCode;
    }
    if (origStruct.tests.length === 0 && origStruct.describes.length === 0) {
      return newCode;
    }

    const origTestsByName = new Map<string, (typeof origStruct.tests)[0]>();
    for (const t of origStruct.tests) {
      origTestsByName.set(t.testName, t);
    }

    const newTestsByName = new Map<string, (typeof newStruct.tests)[0]>();
    for (const t of newStruct.tests) {
      newTestsByName.set(t.testName, t);
    }

    // Check if newCode already preserves all original tests
    const containsAllOriginalTests = origStruct.tests.every((t) =>
      newTestsByName.has(t.testName),
    );
    const isStubbed = this.isStubText(newCode);

    if (
      containsAllOriginalTests &&
      newStruct.tests.length >= origStruct.tests.length &&
      !isStubbed
    ) {
      const newImports = new Set(newStruct.imports);
      const missingImports: string[] = [];
      for (const imp of origStruct.imports) {
        if (!newImports.has(imp) && !newCode.includes(imp)) {
          missingImports.push(imp);
        }
      }
      if (missingImports.length > 0) {
        return missingImports.join("\n") + "\n" + newCode;
      }
      return newCode;
    }

    // 1. In-place replacements for existing tests that were modified
    const replacements: { start: number; end: number; text: string }[] = [];
    for (const newTest of newStruct.tests) {
      const origTest = origTestsByName.get(newTest.testName);
      if (origTest) {
        const origText = origTest.text.trim();
        const newText = newTest.text.trim();
        if (origText !== newText && !this.isStubText(newText)) {
          replacements.push({
            start: origTest.statement.getStart(origSf),
            end: origTest.statement.getEnd(),
            text: newTest.text,
          });
        }
      }
    }

    replacements.sort((a, b) => b.start - a.start);
    let merged = originalCode;
    for (const r of replacements) {
      merged = merged.slice(0, r.start) + r.text + merged.slice(r.end);
    }

    // 2. Insert genuinely new tests that were not present in originalCode
    const newTestsToInsert = newStruct.tests.filter(
      (t) => !origTestsByName.has(t.testName) && !this.isStubText(t.text),
    );

    if (newTestsToInsert.length > 0) {
      let reParsedSf = ts.createSourceFile(
        "reparsed.ts",
        merged,
        ts.ScriptTarget.ES2022,
        true,
      );
      let reParsedStruct = this.extractTestSuiteStructure(reParsedSf);

      for (const newTest of newTestsToInsert) {
        let targetDescribe: (typeof reParsedStruct.describes)[0] | null = null;
        if (newTest.suiteTitles.length > 0) {
          const targetTitle =
            newTest.suiteTitles[newTest.suiteTitles.length - 1]!;
          targetDescribe =
            reParsedStruct.describes.find((d) => d.title === targetTitle) ||
            null;
        }
        if (!targetDescribe && reParsedStruct.describes.length > 0) {
          targetDescribe =
            reParsedStruct.describes[reParsedStruct.describes.length - 1]!;
        }

        if (targetDescribe) {
          const blockEnd = targetDescribe.body.getEnd();
          const closingBraceIdx = merged.lastIndexOf("}", blockEnd);
          if (closingBraceIdx !== -1) {
            const formattedTest = `\n  ${newTest.text.trim()}\n`;
            merged =
              merged.slice(0, closingBraceIdx) +
              formattedTest +
              merged.slice(closingBraceIdx);

            reParsedSf = ts.createSourceFile(
              "reparsed.ts",
              merged,
              ts.ScriptTarget.ES2022,
              true,
            );
            reParsedStruct = this.extractTestSuiteStructure(reParsedSf);
          }
        } else {
          merged = merged.trimEnd() + `\n\n${newTest.text.trim()}\n`;
        }
      }
    }

    // 3. Insert brand new describe blocks if newCode defined entirely new test suites
    const origDescribeTitles = new Set(origStruct.describes.map((d) => d.title));
    const newDescribesToInsert = newStruct.describes.filter(
      (d) =>
        !origDescribeTitles.has(d.title) &&
        !this.isStubText(d.text) &&
        !merged.includes(`"${d.title}"`) &&
        !merged.includes(`'${d.title}'`),
    );

    if (newDescribesToInsert.length > 0) {
      let reParsedSf = ts.createSourceFile(
        "reparsed.ts",
        merged,
        ts.ScriptTarget.ES2022,
        true,
      );
      let reParsedStruct = this.extractTestSuiteStructure(reParsedSf);

      for (const newDesc of newDescribesToInsert) {
        if (reParsedStruct.describes.length > 0) {
          const rootDescribe = reParsedStruct.describes[0]!;
          const blockEnd = rootDescribe.body.getEnd();
          const closingBraceIdx = merged.lastIndexOf("}", blockEnd);
          if (closingBraceIdx !== -1) {
            const formattedDesc = `\n\n  ${newDesc.text.trim()}\n`;
            merged =
              merged.slice(0, closingBraceIdx) +
              formattedDesc +
              merged.slice(closingBraceIdx);

            reParsedSf = ts.createSourceFile(
              "reparsed.ts",
              merged,
              ts.ScriptTarget.ES2022,
              true,
            );
            reParsedStruct = this.extractTestSuiteStructure(reParsedSf);
          }
        } else {
          merged = merged.trimEnd() + `\n\n${newDesc.text.trim()}\n`;
        }
      }
    }

    // 4. Prepend any new imports not in originalCode
    const origImportSet = new Set(origStruct.imports);
    const newImportsToAdd: string[] = [];
    for (const imp of newStruct.imports) {
      if (!origImportSet.has(imp) && !merged.includes(imp)) {
        newImportsToAdd.push(imp);
      }
    }
    if (newImportsToAdd.length > 0) {
      merged = newImportsToAdd.join("\n") + "\n" + merged;
    }

    return merged;
  }
}
