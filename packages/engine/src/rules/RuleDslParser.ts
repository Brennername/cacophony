import {
  RulePipelineDeclaration,
  PipelineHookDeclaration,
  RuleConfigDeclaration,
  RuleLifecycleHook,
  RuleSeverity,
} from "@cacophony/shared-types";

/**
 * Lightweight recursive-descent DSL parser for rule pipelines.
 *
 * Example syntax:
 * pipeline "vega_hardened" {
 *   target_arch "x86_64-linux-vega"
 *   description "Hardened deterministic repair rules for local Vega nodes"
 *
 *   hook post_generation {
 *     rule strip_emojis [severity=silent_repair]
 *     rule enforce_esm_js [severity=silent_repair]
 *     rule whitespace_normalizer [severity=silent_repair]
 *   }
 *
 *   hook pre_test {
 *     rule banned_imports [severity=hard_rejection, packages=["conductor", "lodash"]]
 *     rule loose_root_files [severity=soft_warning]
 *     rule empty_files [severity=hard_rejection]
 *     rule placeholder_stubs [severity=soft_warning, maxAllowed=0]
 *   }
 * }
 */
export class RuleDslParser {
  /**
   * Interpolates environment variables into DSL source text.
   * Matches patterns like ${VAR_NAME} or $VAR_NAME.
   */
  public static interpolateVariables(
    source: string,
    env: Record<string, string> = process.env as Record<string, string>
  ): string {
    return source.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_, key) => env[key] ?? "")
                 .replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => env[key] ?? "");
  }

  /**
   * Parses the DSL string into a typed RulePipelineDeclaration.
   */
  public parse(source: string, env?: Record<string, string>): RulePipelineDeclaration {
    const interpolated = RuleDslParser.interpolateVariables(source, env);
    const tokens = this.tokenize(interpolated);
    let pos = 0;

    const peek = () => tokens[pos];
    const consume = (expected?: string) => {
      const token = tokens[pos];
      if (!token) {
        throw new Error(`Unexpected end of input, expected ${expected || "token"}`);
      }
      if (expected && token !== expected) {
        throw new Error(`Expected '${expected}' but got '${token}' at token ${pos}`);
      }
      pos++;
      return token;
    };

    consume("pipeline");
    const rawId = consume();
    const id = this.stripQuotes(rawId);
    consume("{");

    let name = id;
    let description: string | undefined;
    let targetArch: string | undefined;
    const hooks: PipelineHookDeclaration[] = [];

    while (pos < tokens.length && peek() !== "}") {
      const token = peek();
      if (token === "name") {
        consume("name");
        name = this.stripQuotes(consume());
      } else if (token === "description") {
        consume("description");
        description = this.stripQuotes(consume());
      } else if (token === "target_arch") {
        consume("target_arch");
        targetArch = this.stripQuotes(consume());
      } else if (token === "hook") {
        consume("hook");
        const hookName = consume() as RuleLifecycleHook;
        consume("{");

        const rules: RuleConfigDeclaration[] = [];
        while (pos < tokens.length && peek() !== "}") {
          consume("rule");
          const ruleId = consume();
          let severity: RuleSeverity = "silent_repair";
          let options: Record<string, unknown> = {};
          let continueOnError = false;

          if (peek() === "[") {
            consume("[");
            const parsedConfig = this.parseRuleAttributes(consumeUntil("]"));
            consume("]");
            if (parsedConfig.severity) {
              severity = parsedConfig.severity as RuleSeverity;
            }
            if (parsedConfig.continueOnError !== undefined) {
              continueOnError = Boolean(parsedConfig.continueOnError);
            }
            options = parsedConfig.options;
          }

          rules.push({
            ruleId,
            severity,
            options,
            continueOnError,
          });
        }
        consume("}");
        hooks.push({
          hook: hookName,
          rules,
        });
      } else {
        throw new Error(`Unexpected keyword '${token}' inside pipeline declaration`);
      }
    }

    consume("}");

    return {
      id,
      name,
      ...(description ? { description } : {}),
      ...(targetArch ? { targetArch } : {}),
      hooks,
    };

    function consumeUntil(endToken: string): string[] {
      const slice: string[] = [];
      let depth = 0;
      while (pos < tokens.length) {
        const t = peek();
        if (t === "[") {
          depth++;
        } else if (t === "]") {
          if (depth === 0 && endToken === "]") {
            break;
          }
          depth--;
        }
        slice.push(tokens[pos]!);
        pos++;
      }
      return slice;
    }
  }

  private parseRuleAttributes(tokens: string[]): {
    severity: string | undefined;
    continueOnError: boolean | undefined;
    options: Record<string, unknown>;
  } {
    const text = tokens.join(" ");
    const options: Record<string, unknown> = {};
    let severity: string | undefined;
    let continueOnError: boolean | undefined;

    // Split on commas not inside square brackets
    const parts = this.splitKeyValues(text);
    for (const part of parts) {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) continue;
      const key = part.slice(0, eqIdx).trim();
      const valStr = part.slice(eqIdx + 1).trim();

      let val: unknown;
      try {
        val = JSON.parse(valStr);
      } catch {
        val = this.stripQuotes(valStr);
      }

      if (key === "severity") {
        severity = String(val);
      } else if (key === "continueOnError") {
        continueOnError = Boolean(val);
      } else {
        options[key] = val;
      }
    }

    return { severity, continueOnError, options };
  }

  private splitKeyValues(content: string): string[] {
    const parts: string[] = [];
    let current = "";
    let bracketDepth = 0;
    let inQuote = false;

    for (let i = 0; i < content.length; i++) {
      const ch = content[i]!;
      if (ch === '"') inQuote = !inQuote;
      if (!inQuote) {
        if (ch === "[" || ch === "{") bracketDepth++;
        if (ch === "]" || ch === "}") bracketDepth--;
        if (ch === "," && bracketDepth === 0) {
          parts.push(current.trim());
          current = "";
          continue;
        }
      }
      current += ch;
    }
    if (current.trim()) {
      parts.push(current.trim());
    }
    return parts;
  }

  private stripQuotes(val: string): string {
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      return val.slice(1, -1);
    }
    return val;
  }

  private tokenize(text: string): string[] {
    const tokens: string[] = [];
    let i = 0;

    while (i < text.length) {
      const ch = text[i]!;

      // Skip whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Skip single line comments
      if (ch === "/" && text[i + 1] === "/") {
        i += 2;
        while (i < text.length && text[i] !== "\n") {
          i++;
        }
        continue;
      }

      // Strings
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let str = quote;
        i++;
        while (i < text.length && text[i] !== quote) {
          if (text[i] === "\\") {
            str += text[i] + (text[i + 1] || "");
            i += 2;
          } else {
            str += text[i];
            i++;
          }
        }
        if (i < text.length) {
          str += text[i];
          i++;
        }
        tokens.push(str);
        continue;
      }

      // Single character punctuation
      if (["{", "}", "[", "]", ",", "="].includes(ch)) {
        tokens.push(ch);
        i++;
        continue;
      }

      // Identifiers / numbers / words
      let word = "";
      while (i < text.length && !/\s/.test(text[i]!) && !["{", "}", "[", "]", ",", "="].includes(text[i]!)) {
        word += text[i];
        i++;
      }
      if (word) {
        tokens.push(word);
      }
    }

    return tokens;
  }
}
