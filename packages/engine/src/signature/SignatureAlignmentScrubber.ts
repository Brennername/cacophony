import ts from "typescript";
import type { CodeSignatureRecord } from "@cacophony/shared-types";
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

export interface SignatureDriftWarning {
  readonly symbol: string;
  readonly kind:
    | "missing_method"
    | "missing_property"
    | "parameter_count_mismatch"
    | "parameter_type_mismatch"
    | "return_type_mismatch";
  readonly details: string;
  readonly severity: "warning" | "error";
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
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node: ts.Node) => {

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
            const callable =
              sig.callables.find((c) => c.name === targetIdent) ||
              sig.callables[0];
            if (callable && callable.parameters.length > 0) {

              if (
                node.arguments.length === 1 &&
                ts.isObjectLiteralExpression(node.arguments[0]!)
              ) {
                const objArg = node.arguments[0]!;
                const firstParam = callable.parameters[0]!;

                let validKeys = [firstParam.name];
                const typeRecord = this.signatureStore.get(firstParam.type);
                if (typeRecord && typeRecord.properties.length > 0) {
                  validKeys = typeRecord.properties.map((p) => p.name);
                }

                for (const prop of objArg.properties) {
                  if (
                    ts.isPropertyAssignment(prop) &&
                    ts.isIdentifier(prop.name)
                  ) {
                    const argKey = prop.name.text;
                    const matchedParam = this.findClosestParameter(
                      argKey,
                      validKeys,
                    );
                    if (matchedParam && matchedParam !== argKey) {
                      const pos = sourceFile.getLineAndCharacterOfPosition(
                        prop.getStart(sourceFile),
                      );
                      corrections.push({
                        originalCall: argKey,
                        correctedCall: matchedParam,
                        reason: `Typo in parameter key "${argKey}" aligned to authoritative "${matchedParam}"`,
                        line: pos.line + 1,
                      });
                      updatedCode = updatedCode.replace(
                        new RegExp(`\\b${argKey}\\s*:`, "g"),
                        `${matchedParam}:`,
                      );
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
  private findClosestParameter(
    candidate: string,
    validParams: readonly string[],
  ): string | null {
    if (validParams.includes(candidate)) return candidate;

    let closest: string | null = null;
    let minDistance = Infinity;

    for (const valid of validParams) {
      const dist = this.levenshtein(
        candidate.toLowerCase(),
        valid.toLowerCase(),
      );
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
            matrix[i - 1]![j]! + 1,
          );
        }
      }
    }
    return matrix[b.length]![a.length]!;
  }

  /**
   * Compares two CodeSignatureRecord declarations (e.g. across languages or interface vs implementation)
   * and reports drift warnings.
   */
  public compareSignatures(
    canonical: CodeSignatureRecord,
    target: CodeSignatureRecord,
  ): readonly SignatureDriftWarning[] {
    const warnings: SignatureDriftWarning[] = [];

    // Compare properties
    for (const canonProp of canonical.properties) {
      const targetProp = target.properties.find(
        (p) => this.normalizeIdentifier(p.name) === this.normalizeIdentifier(canonProp.name),
      );
      if (!targetProp) {
        warnings.push({
          symbol: `${canonical.identifier}.${canonProp.name}`,
          kind: "missing_property",
          details: `Canonical property '${canonProp.name}' is missing in target '${target.identifier}'`,
          severity: canonProp.isOptional ? "warning" : "error",
        });
      } else if (!this.areTypesCompatible(canonProp.type, targetProp.type)) {
        warnings.push({
          symbol: `${canonical.identifier}.${canonProp.name}`,
          kind: "parameter_type_mismatch",
          details: `Property '${canonProp.name}' type mismatch: expected '${canonProp.type}', got '${targetProp.type}'`,
          severity: "warning",
        });
      }
    }

    // Compare callables / methods
    for (const canonMethod of canonical.callables) {
      const targetMethod = target.callables.find(
        (c) => this.normalizeIdentifier(c.name) === this.normalizeIdentifier(canonMethod.name),
      );
      if (!targetMethod) {
        warnings.push({
          symbol: `${canonical.identifier}.${canonMethod.name}`,
          kind: "missing_method",
          details: `Canonical method '${canonMethod.name}' is missing in target '${target.identifier}'`,
          severity: "error",
        });
        continue;
      }

      // Check parameter count
      if (canonMethod.parameters.length !== targetMethod.parameters.length) {
        warnings.push({
          symbol: `${canonical.identifier}.${canonMethod.name}`,
          kind: "parameter_count_mismatch",
          details: `Method '${canonMethod.name}' parameter count mismatch: expected ${canonMethod.parameters.length}, got ${targetMethod.parameters.length}`,
          severity: "error",
        });
      } else {
        // Compare parameter types
        for (let i = 0; i < canonMethod.parameters.length; i++) {
          const canonP = canonMethod.parameters[i]!;
          const targetP = targetMethod.parameters[i]!;
          if (!this.areTypesCompatible(canonP.type, targetP.type)) {
            warnings.push({
              symbol: `${canonical.identifier}.${canonMethod.name}`,
              kind: "parameter_type_mismatch",
              details: `Parameter ${i + 1} ('${canonP.name}') type mismatch: expected '${canonP.type}', got '${targetP.type}'`,
              severity: "warning",
            });
          }
        }
      }

      // Check return type
      if (!this.areReturnTypesCompatible(canonMethod.returnType, targetMethod.returnType)) {
        warnings.push({
          symbol: `${canonical.identifier}.${canonMethod.name}`,
          kind: "return_type_mismatch",
          details: `Return type mismatch for '${canonMethod.name}': expected '${canonMethod.returnType}', got '${targetMethod.returnType}'`,
          severity: "warning",
        });
      }
    }

    return warnings;
  }

  /**
   * Compares arrays of CodeSignatureRecords across languages and finds drift.
   */
  public findDrift(
    canonicalRecords: readonly CodeSignatureRecord[],
    targetRecords: readonly CodeSignatureRecord[],
  ): readonly SignatureDriftWarning[] {
    const warnings: SignatureDriftWarning[] = [];
    const targetMap = new Map<string, CodeSignatureRecord>();
    for (const r of targetRecords) {
      targetMap.set(r.identifier.toLowerCase(), r);
    }

    for (const canon of canonicalRecords) {
      const matchedTarget = targetMap.get(canon.identifier.toLowerCase());
      if (!matchedTarget) {
        warnings.push({
          symbol: canon.identifier,
          kind: "missing_method",
          details: `Canonical symbol '${canon.identifier}' has no corresponding implementation in target records`,
          severity: "error",
        });
      } else {
        warnings.push(...this.compareSignatures(canon, matchedTarget));
      }
    }

    return warnings;
  }

  private areTypesCompatible(a: string, b: string): boolean {
    const normA = this.normalizeTypeName(a);
    const normB = this.normalizeTypeName(b);
    return normA === normB || normA === "any" || normB === "any";
  }

  private areReturnTypesCompatible(a: string, b: string): boolean {
    const normA = this.normalizeTypeName(a);
    const normB = this.normalizeTypeName(b);
    if (normA === normB) return true;
    if ((normA === "void" && normB === "()") || (normA === "()" && normB === "void")) return true;
    return false;
  }

  private normalizeTypeName(rawType: string): string {
    const trimmed = rawType.trim().toLowerCase();
    if (trimmed === "string" || trimmed === "&str" || trimmed === "java.lang.string") return "string";
    if (
      trimmed === "number" ||
      trimmed === "int" ||
      trimmed === "i32" ||
      trimmed === "i64" ||
      trimmed === "u32" ||
      trimmed === "u64" ||
      trimmed === "f64" ||
      trimmed === "float64" ||
      trimmed === "integer"
    ) {
      return "number";
    }
    if (trimmed === "boolean" || trimmed === "bool") return "boolean";
    if (trimmed === "void" || trimmed === "()") return "void";
    return trimmed;
  }

  private normalizeIdentifier(name: string): string {
    return name.replace(/_/g, "").toLowerCase();
  }
}
