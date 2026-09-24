import ts from "typescript";
import { SignatureStore } from "./SignatureStore.js";

export interface AlignmentCorrection {
  readonly originalCall: string;
  readonly correctedCall: string;
  readonly reason: string;
  readonly line: number;
}

export interface AlignmentResult {
  readonly code: string;
  readonly corrections: readonly AlignmentCorrection[];
  readonly modified: boolean;
}

/**
 * SignatureAlignmentScrubber
 *
 * Runs deterministically immediately following LLM code generation and prior to test execution.
 * Aligns hallucinations, misspelled parameter names, and inverted argument orders against
 * the authoritative signature map.
 */
export class SignatureAlignmentScrubber {
  constructor(private readonly signatureStore: SignatureStore) {}

  /**
   * Evaluates generated TypeScript code and corrects parameter and method hallucinations.
   */
  public scrubTypeScript(filePath: string, code: string): AlignmentResult {
    const corrections: AlignmentCorrection[] = [];
    let updatedCode = code;

    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.ES2022,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const visit = (node: ts.Node) => {
      // 1. Inspect function and method invocations
      if (ts.isCallExpression(node)) {
        const expr = node.expression;

        let targetIdent = "";
        if (ts.isIdentifier(expr)) {
          targetIdent = expr.text;
        } else if (ts.isPropertyAccessExpression(expr)) {
          targetIdent = expr.name.text;
        }

        if (targetIdent) {
          const sig = this.signatureStore.get(targetIdent);
          if (sig) {
            const callable = sig.callables.find((c) => c.name === targetIdent) || sig.callables[0];
            if (callable && callable.parameters.length > 0) {
              // Check object literal argument parameter name mismatches
              if (node.arguments.length === 1 && ts.isObjectLiteralExpression(node.arguments[0]!)) {
                const objArg = node.arguments[0]!;
                const firstParam = callable.parameters[0]!;
                
                // Collect valid keys either from parameter name or from its type signature if it refers to an interface
                let validKeys = [firstParam.name];
                const typeRecord = this.signatureStore.get(firstParam.type);
                if (typeRecord && typeRecord.properties.length > 0) {
                  validKeys = typeRecord.properties.map((p) => p.name);
                }

                for (const prop of objArg.properties) {
                  if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                    const argKey = prop.name.text;
                    const matchedParam = this.findClosestParameter(argKey, validKeys);
                    if (matchedParam && matchedParam !== argKey) {
                      const pos = sourceFile.getLineAndCharacterOfPosition(prop.getStart(sourceFile));
                      corrections.push({
                        originalCall: argKey,
                        correctedCall: matchedParam,
                        reason: `Typo in parameter key "${argKey}" aligned to authoritative "${matchedParam}"`,
                        line: pos.line + 1,
                      });
                      updatedCode = updatedCode.replace(new RegExp(`\\b${argKey}\\s*:`, "g"), `${matchedParam}:`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      code: updatedCode,
      corrections,
      modified: corrections.length > 0,
    };
  }

  /**
   * Levenshtein / fuzzy distance match for parameter typos.
   */
  private findClosestParameter(candidate: string, validParams: readonly string[]): string | null {
    if (validParams.includes(candidate)) return candidate;

    let closest: string | null = null;
    let minDistance = Infinity;

    for (const valid of validParams) {
      const dist = this.levenshtein(candidate.toLowerCase(), valid.toLowerCase());
      if (dist <= 2 && dist < minDistance) {
        minDistance = dist;
        closest = valid;
      }
    }

    return closest;
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0]![j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j]! + 1
          );
        }
      }
    }
    return matrix[b.length]![a.length]!;
  }
}
