import type {
  CodeSignatureRecord,
  CallableSignature,
  PropertySignature,
  FunctionParameterSignature
} from "@cacophony/shared-types";

/**
 * GoSignatureHarvester
 *
 * Dedicated extractor for Go source files (.go).
 * Parses:
 * - Struct definitions and member fields
 * - Interface definitions and method signatures
 * - Package-level functions and receiver methods
 * - Package comments / docstrings
 */
export class GoSignatureHarvester {
  public harvest(filePath: string, content: string): readonly CodeSignatureRecord[] {
    const records: CodeSignatureRecord[] = [];
    const lines = content.split("\n");

    const funcRegex = /^\s*func\s+(?:\(([^)]+)\)\s+)?([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*([^{]*)\{?/;
    const typeDefRegex = /^\s*type\s+([A-Za-z0-9_]+)\s+(struct|interface)\s*\{?/;

    let currentBlockName = "";
    let currentBlockKind: "type" | "interface" = "type";
    let currentBlockFields: PropertySignature[] = [];
    let currentBlockMethods: CallableSignature[] = [];
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? "";

      // Check struct / interface start
      const typeMatch = line.match(typeDefRegex);
      if (typeMatch && typeMatch[1] && typeMatch[2]) {
        currentBlockName = typeMatch[1];
        currentBlockKind = typeMatch[2] === "interface" ? "interface" : "type";
        currentBlockFields = [];
        currentBlockMethods = [];
        inBlock = true;
        continue;
      }

      // Check block closing
      if (inBlock && line === "}") {
        records.push({
          id: `${filePath}#${currentBlockName}`,
          filePath,
          language: "go",
          identifier: currentBlockName,
          kind: currentBlockKind,
          callables: currentBlockMethods,
          properties: currentBlockFields,
          rawCompressed: `type ${currentBlockName} ${currentBlockKind === "interface" ? "interface" : "struct"} { ${currentBlockFields.map((f) => `${f.name} ${f.type}`).join("; ")} }`
        });
        inBlock = false;
        continue;
      }

      // Inside struct or interface block
      if (inBlock && line && !line.startsWith("//")) {
        if (currentBlockKind === "type") {
          // Struct field: Name Type `tags`
          const parts = line.split(/\s+/);
          if (parts.length >= 2 && parts[0] && parts[1]) {
            currentBlockFields.push({
              name: parts[0],
              type: parts[1],
              isOptional: false,
              isReadonly: false
            });
          }
        } else if (currentBlockKind === "interface") {
          // Interface method: MethodName(param Type) ReturnType
          const ifaceMethodMatch = line.match(/^([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*([^;]*)/);
          if (ifaceMethodMatch && ifaceMethodMatch[1]) {
            currentBlockMethods.push({
              name: ifaceMethodMatch[1],
              parameters: this.parseGoParams(ifaceMethodMatch[2] || ""),
              returnType: ifaceMethodMatch[3]?.trim() || "void",
              isAsync: false
            });
          }
        }
        continue;
      }

      // Top-level function or receiver method
      const funcMatch = line.match(funcRegex);
      if (funcMatch && funcMatch[2]) {
        const receiver = funcMatch[1]?.trim();
        const funcName = funcMatch[2];
        const rawParams = funcMatch[3] ?? "";
        const returnType = funcMatch[4]?.trim() || "void";
        const params = this.parseGoParams(rawParams);

        const callable: CallableSignature = {
          name: receiver ? `${receiver}.${funcName}` : funcName,
          parameters: params,
          returnType,
          isAsync: false
        };

        records.push({
          id: `${filePath}#${funcName}`,
          filePath,
          language: "go",
          identifier: funcName,
          kind: "function",
          callables: [callable],
          properties: [],
          rawCompressed: `func ${receiver ? `(${receiver}) ` : ""}${funcName}(${params.map((p) => `${p.name}: ${p.type}`).join(", ")}): ${returnType}`
        });
      }
    }

    return records;
  }

  private parseGoParams(rawParams: string): FunctionParameterSignature[] {
    const params: FunctionParameterSignature[] = [];
    if (!rawParams.trim()) return params;

    const parts = rawParams.split(",");
    for (const p of parts) {
      const tokens = p.trim().split(/\s+/);
      if (tokens.length >= 2 && tokens[0] && tokens[1]) {
        params.push({
          name: tokens[0],
          type: tokens[1],
          isOptional: false
        });
      }
    }
    return params;
  }
}
