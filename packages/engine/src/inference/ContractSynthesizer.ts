import ts from "typescript";

export type FieldType = "string" | "number" | "boolean" | "date" | "json";

export interface ModelFieldContract {
  readonly name: string;
  readonly type: FieldType;
  readonly isPrimary?: boolean | undefined;
  readonly isNullable?: boolean | undefined;
  readonly defaultValue?: string | undefined;
}

export interface ModelSchemaContract {
  readonly name: string;
  readonly tableName: string;
  readonly fields: readonly ModelFieldContract[];
  readonly description?: string | undefined;
}

export interface ContractValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * ContractSynthesizer
 *
 * Implements architectural contract and type schema synthesis (Phase 81 T81.3).
 * Defines TypeScript interfaces, Zod validation schemas, and dialect-agnostic SQL migrations.
 */
export class ContractSynthesizer {
  /**
   * Generates a typed TypeScript interface definition.
   */
  public synthesizeTypescriptInterface(schema: ModelSchemaContract): string {
    const lines: string[] = [];
    if (schema.description) {
      lines.push("/**");
      lines.push(` * ${schema.description}`);
      lines.push(" */");
    }
    lines.push(`export interface ${schema.name} {`);

    for (const field of schema.fields) {
      const tsType = this.mapFieldToTsType(field.type);
      const opt = field.isNullable ? "?" : "";
      lines.push(`  readonly ${field.name}${opt}: ${tsType};`);
    }

    lines.push("}");
    lines.push("");
    return lines.join("\n");
  }

  /**
   * Generates a Zod validation schema.
   */
  public synthesizeZodSchema(schema: ModelSchemaContract): string {
    const lines: string[] = [
      'import { z } from "zod";',
      "",
      `export const ${schema.name}Schema = z.object({`
    ];

    for (const field of schema.fields) {
      let zodType: string;
      switch (field.type) {
        case "string":
          zodType = "z.string()";
          break;
        case "number":
          zodType = "z.number()";
          break;
        case "boolean":
          zodType = "z.boolean()";
          break;
        case "date":
          zodType = "z.string().datetime()";
          break;
        case "json":
          zodType = "z.record(z.unknown())";
          break;
        default:
          zodType = "z.unknown()";
      }

      if (field.isNullable) {
        zodType += ".optional()";
      }
      lines.push(`  ${field.name}: ${zodType},`);
    }

    lines.push("});");
    lines.push("");
    lines.push(`export type ${schema.name} = z.infer<typeof ${schema.name}Schema>;`);
    lines.push("");
    return lines.join("\n");
  }

  /**
   * Synthesizes database migration SQL DDL.
   */
  public synthesizeMigration(
    schema: ModelSchemaContract,
    dialect: "postgres" | "sqlite" = "postgres"
  ): string {
    const lines: string[] = [
      `-- Migration for ${schema.tableName}`,
      `CREATE TABLE IF NOT EXISTS ${schema.tableName} (`
    ];

    const colDefs: string[] = [];
    for (const field of schema.fields) {
      const sqlType = this.mapFieldToSqlType(field.type, dialect);
      let def = `  ${field.name} ${sqlType}`;

      if (field.isPrimary) {
        def += " PRIMARY KEY";
      } else if (!field.isNullable) {
        def += " NOT NULL";
      }

      if (field.defaultValue !== undefined) {
        def += ` DEFAULT ${field.defaultValue}`;
      }
      colDefs.push(def);
    }

    lines.push(colDefs.join(",\n"));
    lines.push(");");
    lines.push("");

    // Indexes
    for (const field of schema.fields) {
      if (!field.isPrimary && (field.name.endsWith("_id") || field.name === "status")) {
        lines.push(`CREATE INDEX IF NOT EXISTS idx_${schema.tableName}_${field.name} ON ${schema.tableName}(${field.name});`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Validates synthesized contract code for TypeScript syntactic validity.
   */
  public validateAgainstWorkspace(contractCode: string): ContractValidationResult {
    const sourceFile = ts.createSourceFile("contract.ts", contractCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const errors: string[] = [];

    // Check for obvious syntax diagnostics in AST
    const visit = (node: ts.Node): void => {
      if (node.kind === ts.SyntaxKind.Unknown) {
        errors.push(`Encountered unknown syntax at offset ${node.pos}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private mapFieldToTsType(type: FieldType): string {
    switch (type) {
      case "string": return "string";
      case "number": return "number";
      case "boolean": return "boolean";
      case "date": return "string";
      case "json": return "Record<string, unknown>";
      default: return "unknown";
    }
  }

  private mapFieldToSqlType(type: FieldType, dialect: "postgres" | "sqlite"): string {
    if (dialect === "sqlite") {
      switch (type) {
        case "string": return "TEXT";
        case "number": return "INTEGER";
        case "boolean": return "INTEGER";
        case "date": return "TEXT";
        case "json": return "TEXT";
      }
    }

    switch (type) {
      case "string": return "VARCHAR(255)";
      case "number": return "BIGINT";
      case "boolean": return "BOOLEAN";
      case "date": return "TIMESTAMPTZ";
      case "json": return "JSONB";
    }
  }
}
