import type {
  CodeSignatureRecord,
  CallableSignature,
  PropertySignature,
  FunctionParameterSignature
} from "@cacophony/shared-types";

/**
 * RustSignatureHarvester
 *
 * Dedicated AST extractor for Rust source files (.rs).
 * Parses:
 * - pub struct declarations and public fields
 * - pub trait definitions and required methods
 * - pub fn / fn function signatures and parameter types
 */
export class RustSignatureHarvester {
  public harvest(filePath: string, content: string): readonly CodeSignatureRecord[] {
    const records: CodeSignatureRecord[] = [];
    const lines = content.split("\n");

    const structRegex = /^\s*(?:pub\s+)?struct\s+([A-Za-z0-9_]+)(?:<[^>]+>)?\s*\{?/;
    const traitRegex = /^\s*(?:pub\s+)?trait\s+([A-Za-z0-9_]+)(?:<[^>]+>)?\s*\{?/;
    const fnRegex = /^\s*(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)(?:<[^>]+>)?\s*\(([^)]*)\)\s*(?:->\s*([^{;]+))?\{?/;

    let currentBlockName = "";
    let currentBlockKind: "type" | "interface" = "type";
    let currentBlockFields: PropertySignature[] = [];
    let currentBlockMethods: CallableSignature[] = [];
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? "";

      // Check struct start
      const structMatch = line.match(structRegex);
      if (structMatch && structMatch[1]) {
        currentBlockName = structMatch[1];
        currentBlockKind = "type";
        currentBlockFields = [];
        currentBlockMethods = [];
        inBlock = true;
        continue;
      }

      // Check trait start
      const traitMatch = line.match(traitRegex);
      if (traitMatch && traitMatch[1]) {
        currentBlockName = traitMatch[1];
        currentBlockKind = "interface";
        currentBlockFields = [];
        currentBlockMethods = [];
        inBlock = true;
        continue;
      }

      // Block close
      if (inBlock && line.startsWith("}")) {
        records.push({
          id: `${filePath}#${currentBlockName}`,
          filePath,
          language: "rust",
          identifier: currentBlockName,
          kind: currentBlockKind,
          callables: currentBlockMethods,
          properties: currentBlockFields,
          rawCompressed: `pub ${currentBlockKind === "interface" ? "trait" : "struct"} ${currentBlockName} { ${currentBlockFields.map((f) => `${f.name}: ${f.type}`).join(", ")} }`
        });
        inBlock = false;
        continue;
      }

      // Inside block
      if (inBlock && line && !line.startsWith("//")) {
        if (currentBlockKind === "type") {
          // pub field_name: FieldType,
          const fieldMatch = line.match(/^(?:pub\s+)?([A-Za-z0-9_]+)\s*:\s*([^,;]+)/);
          if (fieldMatch && fieldMatch[1] && fieldMatch[2]) {
            currentBlockFields.push({
              name: fieldMatch[1],
              type: fieldMatch[2].trim(),
              isOptional: fieldMatch[2].includes("Option<"),
              isReadonly: false
            });
          }
        } else if (currentBlockKind === "interface") {
          // fn method_name(&self, ...) -> RetType;
          const methodMatch = line.match(/^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^{;]+))?/);
          if (methodMatch && methodMatch[1]) {
            currentBlockMethods.push({
              name: methodMatch[1],
              parameters: this.parseRustParams(methodMatch[2] || ""),
              returnType: methodMatch[3]?.trim() || "()",
              isAsync: line.includes("async ")
            });
          }
        }
        continue;
      }

      // Standalone function
      const fnMatch = line.match(fnRegex);
      if (fnMatch && fnMatch[1]) {
        const fnName = fnMatch[1];
        const rawParams = fnMatch[2] ?? "";
        const returnType = fnMatch[3]?.trim() || "()";
        const params = this.parseRustParams(rawParams);

        const callable: CallableSignature = {
          name: fnName,
          parameters: params,
          returnType,
          isAsync: line.includes("async ")
        };

        records.push({
          id: `${filePath}#${fnName}`,
          filePath,
          language: "rust",
          identifier: fnName,
          kind: "function",
          callables: [callable],
          properties: [],
          rawCompressed: `pub fn ${fnName}(${params.map((p) => `${p.name}: ${p.type}`).join(", ")}): ${returnType}`
        });
      }
    }

    return records;
  }

  private parseRustParams(rawParams: string): FunctionParameterSignature[] {
    const params: FunctionParameterSignature[] = [];
    if (!rawParams.trim()) return params;

    const parts = rawParams.split(",");
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed === "&self" || trimmed === "&mut self" || trimmed === "self") {
        continue;
      }
      const pair = trimmed.split(":");
      if (pair.length >= 2 && pair[0] && pair[1]) {
        params.push({
          name: pair[0].trim(),
          type: pair[1].trim(),
          isOptional: pair[1].includes("Option<")
        });
      }
    }
    return params;
  }
}
