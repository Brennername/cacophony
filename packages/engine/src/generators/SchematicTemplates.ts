import type { ClassScaffoldSpec } from "./SchematicCodeGenerator.js";

/**
 * SchematicTemplates
 *
 * Provides declarative blueprint specifications for common architectural patterns
 * in the Cacophony monorepo. Used by micro-models and scaffolding generators
 * to produce type-safe skeletons with verified imports and method signatures.
 */
export class SchematicTemplates {
  /**
   * Blueprint for an AST / Regex Scrubber Rule.
   * Transforms raw model code output before compilation and testing.
   */
  public static scrubberRule(
    ruleName: string,
    description = "AST and pattern scrubber rule for transforming source files",
  ): ClassScaffoldSpec {
    return {
      className: ruleName,
      description,
      imports: [
        'import type { ScrubberRule, ScrubberResult } from "../ScrubberTypes.js";',
      ],
      properties: [
        {
          name: "ruleId",
          type: "string",
          isReadonly: true,
          initialValue: `"${ruleName.toLowerCase()}"`,
        },
      ],
      methods: [
        {
          name: "scrub",
          description: "Applies rule transformations to target source code.",
          parameters: [
            { name: "source", type: "string" },
            { name: "filePath", type: "string" },
          ],
          returnType: "ScrubberResult",
        },
      ],
    };
  }

  /**
   * Blueprint for a Telemetry Provider.
   * Queries hardware sensors or process metrics to emit structured telemetry snapshots.
   */
  public static telemetryProvider(
    providerName: string,
    description = "Hardware or system metrics telemetry provider",
  ): ClassScaffoldSpec {
    return {
      className: providerName,
      description,
      imports: [
        'import type { TelemetrySnapshot } from "@cacophony/shared-types";',
      ],
      properties: [
        {
          name: "providerId",
          type: "string",
          isReadonly: true,
          initialValue: `"${providerName.toLowerCase()}"`,
        },
      ],
      methods: [
        {
          name: "sample",
          description: "Samples current hardware or runtime metrics.",
          parameters: [],
          returnType: "Promise<TelemetrySnapshot>",
          isAsync: true,
        },
        {
          name: "isAvailable",
          description: "Verifies if the telemetry source is accessible on this host.",
          parameters: [],
          returnType: "boolean",
        },
      ],
    };
  }

  /**
   * Blueprint for an HTTP Route Handler.
   * Dispatches and processes REST API requests in CacophonyHttpServer.
   */
  public static httpRouteHandler(
    handlerName: string,
    description = "REST API endpoint route handler",
  ): ClassScaffoldSpec {
    return {
      className: handlerName,
      description,
      imports: [
        'import type { IncomingMessage, ServerResponse } from "node:http";',
      ],
      methods: [
        {
          name: "canHandle",
          description: "Evaluates whether this handler matches the request URL path and HTTP method.",
          parameters: [
            { name: "pathname", type: "string" },
            { name: "method", type: "string" },
          ],
          returnType: "boolean",
        },
        {
          name: "handle",
          description: "Executes request handling and writes JSON response.",
          parameters: [
            { name: "req", type: "IncomingMessage" },
            { name: "res", type: "ServerResponse" },
          ],
          returnType: "Promise<void>",
          isAsync: true,
        },
      ],
    };
  }

  /**
   * Blueprint for a Repository Service.
   * Manages transactional persistence and database queries.
   */
  public static repositoryService(
    repoName: string,
    entityName: string,
    description = `Persistence repository service for ${entityName} entities`,
  ): ClassScaffoldSpec {
    return {
      className: repoName,
      description,
      imports: [
        `import type { ${entityName} } from "@cacophony/shared-types";`,
      ],
      methods: [
        {
          name: "findById",
          description: `Retrieves a ${entityName} by its primary identifier.`,
          parameters: [{ name: "id", type: "string" }],
          returnType: `Promise<${entityName} | null>`,
          isAsync: true,
        },
        {
          name: "save",
          description: `Persists or updates a ${entityName} record.`,
          parameters: [{ name: "entity", type: entityName }],
          returnType: "Promise<void>",
          isAsync: true,
        },
        {
          name: "delete",
          description: `Deletes a ${entityName} record by identifier.`,
          parameters: [{ name: "id", type: "string" }],
          returnType: "Promise<boolean>",
          isAsync: true,
        },
      ],
    };
  }

  /**
   * Blueprint for an Angular 20+ Standalone Component.
   * Strictly adheres to modern Angular standards: Signals, OnPush, decomposed template/styles.
   */
  public static angularStandaloneComponent(
    componentName: string,
    _selector: string,
    description = `Angular standalone component for ${_selector}`,
  ): ClassScaffoldSpec {
    return {
      className: componentName,
      description,
      imports: [
        "import { Component, ChangeDetectionStrategy, signal, type WritableSignal } from '@angular/core';",
        "import { CommonModule } from '@angular/common';",
      ],
      properties: [
        {
          name: "isLoading",
          type: "WritableSignal<boolean>",
          initialValue: "signal(false)",
        },
      ],
      methods: [
        {
          name: "ngOnInit",
          description: "Initializes component data and subscribes to state signals.",
          parameters: [],
          returnType: "void",
        },
      ],
    };
  }
}
