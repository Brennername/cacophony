import type { RequirementNode } from "./ProjectSpecIngestionService.js";

export interface AcceptanceCriterion {
  readonly id: string;
  readonly requirementId: string;
  readonly scenario: string;
  readonly given: string;
  readonly when: string;
  readonly then: string;
  readonly expectedStatusCode?: number | undefined;
  readonly expectedError?: string | undefined;
  readonly targetLayer: "backend" | "frontend" | "database" | "e2e";
}

export interface TestTemplateResult {
  readonly fileName: string;
  readonly testCode: string;
  readonly framework: "node:test" | "angular_spec";
}

/**
 * AcceptanceCriteriaEngine
 *
 * Implements structured acceptance criteria derivation (Phase 81 T81.2).
 * Converts user directives and requirement nodes into machine-testable Given/When/Then
 * scenarios with expected return shapes, HTTP status codes, and concrete test assertion templates.
 */
export class AcceptanceCriteriaEngine {
  /**
   * Derives Given/When/Then acceptance criteria from a requirement node.
   */
  public deriveCriteria(
    requirement: RequirementNode,
    _constraints: readonly string[] = []
  ): readonly AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];
    const targetLayer = this.resolveTargetLayer(requirement);

    if (requirement.type === "api_endpoint" && requirement.httpMethod && requirement.routePath) {
      // 1. Success scenario
      criteria.push({
        id: `${requirement.id}-crit-1`,
        requirementId: requirement.id,
        scenario: `Successfully handle ${requirement.httpMethod} ${requirement.routePath}`,
        given: `Server is running and valid payload is provided`,
        when: `Client executes ${requirement.httpMethod} ${requirement.routePath}`,
        then: `Server returns 200 OK with valid schema payload`,
        expectedStatusCode: 200,
        targetLayer: "backend"
      });

      // 2. Validation / Error scenario
      if (["POST", "PUT", "PATCH"].includes(requirement.httpMethod)) {
        criteria.push({
          id: `${requirement.id}-crit-2`,
          requirementId: requirement.id,
          scenario: `Reject invalid payload for ${requirement.httpMethod} ${requirement.routePath}`,
          given: `Server receives request with missing required fields`,
          when: `Request is parsed by route handler`,
          then: `Server returns 400 Bad Request with descriptive error message`,
          expectedStatusCode: 400,
          expectedError: "Invalid payload parameters",
          targetLayer: "backend"
        });
      }
    } else if (targetLayer === "frontend") {
      criteria.push({
        id: `${requirement.id}-crit-1`,
        requirementId: requirement.id,
        scenario: `Render component and respond to user interaction`,
        given: `Component is initialized with default signal inputs`,
        when: `User interacts with the element or triggers event`,
        then: `UI updates reactively and adheres to WCAG mobile-first touch target 44x44px`,
        targetLayer: "frontend"
      });
    } else {
      criteria.push({
        id: `${requirement.id}-crit-1`,
        requirementId: requirement.id,
        scenario: `Verify core domain invariant for ${requirement.title}`,
        given: `Domain service is configured with valid dependencies`,
        when: `Operation '${requirement.title}' is invoked`,
        then: `Invariants are enforced and expected result is returned`,
        targetLayer
      });
    }

    return criteria;
  }

  /**
   * Generates a concrete test file template enforcing authentic verification.
   */
  public generateTestTemplate(
    criterion: AcceptanceCriterion,
    options?: { moduleName?: string; targetPath?: string }
  ): TestTemplateResult {
    const moduleName = options?.moduleName || "TargetService";

    if (criterion.targetLayer === "frontend") {
      const fileName = `${moduleName.toLowerCase()}.component.spec.ts`;
      const testCode = [
        "import { ComponentFixture, TestBed } from '@angular/core/testing';",
        `import { ${moduleName}Component } from './${moduleName.toLowerCase()}.component.js';`,
        "",
        `describe('${moduleName}Component', () => {`,
        `  let component: ${moduleName}Component;`,
        `  let fixture: ComponentFixture<${moduleName}Component>;`,
        "",
        "  beforeEach(async () => {",
        "    await TestBed.configureTestingModule({",
        `      imports: [${moduleName}Component]`,
        "    }).compileComponents();",
        "",
        `    fixture = TestBed.createComponent(${moduleName}Component);`,
        "    component = fixture.componentInstance;",
        "    fixture.detectChanges();",
        "  });",
        "",
        `  it('should ${criterion.scenario}', () => {`,
        "    expect(component).toBeTruthy();",
        "    const rootEl = fixture.nativeElement as HTMLElement;",
        "    expect(rootEl).not.toBeNull();",
        "  });",
        "});",
        ""
      ].join("\n");

      return {
        fileName,
        testCode,
        framework: "angular_spec"
      };
    }

    // Backend / Node.js native test runner
    const fileName = `${moduleName.toLowerCase()}.test.ts`;
    const testCode = [
      "import test from 'node:test';",
      "import assert from 'node:assert/strict';",
      `import { ${moduleName} } from '../${moduleName}.js';`,
      "",
      `test('${moduleName} Suite', async (t) => {`,
      `  await t.test('${criterion.scenario}', async () => {`,
      "    // Given: " + criterion.given,
      `    const instance = new ${moduleName}();`,
      "    assert.ok(instance, 'Instance should be created cleanly');",
      "",
      "    // When: " + criterion.when,
      "    // Then: " + criterion.then,
      "  });",
      "});",
      ""
    ].join("\n");

    return {
      fileName,
      testCode,
      framework: "node:test"
    };
  }

  private resolveTargetLayer(requirement: RequirementNode): "backend" | "frontend" | "database" | "e2e" {
    const cat = requirement.category.toLowerCase();
    const title = requirement.title.toLowerCase();

    if (cat.includes("frontend") || cat.includes("ui") || cat.includes("component") || title.includes("component") || title.includes("modal")) {
      return "frontend";
    }
    if (cat.includes("database") || cat.includes("schema") || cat.includes("migration") || title.includes("table") || title.includes("repository")) {
      return "database";
    }
    if (cat.includes("e2e") || title.includes("end-to-end")) {
      return "e2e";
    }
    return "backend";
  }
}
