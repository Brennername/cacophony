# Contributing to Cacophony

Thank you for your interest in contributing to Cacophony. We welcome bug reports, feature proposals, and pull requests.
---

## Architectural Directives & Guidelines

Before authoring code or submitting a pull request, ensure you adhere to the following project standards:

1. **Zero Emojis**:
   - Strictly no emojis in code, docstrings, commit messages, comments, issues, or documentation (unless a feature is explicitly dedicated to emoji processing). Be aware of arena configuration to allow emoji-related features and disable scrubbing if needed.
2. **SOLID Principles**:
   - Write decoupled, modular code adhering to Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion.
3. **Strict Typing**:
   - TypeScript is required throughout the codebase. Any new model, payload, or API interface must be explicitly typed under `@cacophony/shared-types`.
   - Strictly no Python scripts or untyped JavaScript.
4. **Mobile-First Design**:
   - Design frontend components to be mobile-first with defensive viewport scaling, overflow clipping, and responsive flex/grid layouts.
5. **Security & Secrets**:
   - Never commit API keys, tokens, passwords, or credentials. All secrets belong in `.env` files and must be accessed via configuration objects.
6. **Integrity Rule**:
   - Never stub, fake, or artificially bypass test passes. Tests must authentically assert system behavior and invariants.
7. **Test-Driven Development (TDD)**:
   - Drive feature development with tests. Define the contract, inputs, outputs, and invariants through automated test suites prior to writing production implementations.
8. **Regression & MRE**:
   - Resolve bugs with reproduction tests. Every defect requires a Minimal Reproducible Example (MRE) codified into a failing automated test before any fix is applied.

---

## Testing & Quality Assurance Methodology

### 1. Test-Driven Development (TDD) Workflow

We follow the standard Red-Green-Refactor cycle for new capabilities:

1. **Red (Specification)**: Author a failing unit or integration test in TypeScript defining the intended interface, expected behavior, and boundary conditions.
2. **Green (Implementation)**: Write the minimal amount of clean code necessary to make the test suite pass.
3. **Refactor (Optimization & Quality)**: Restructure the implementation to satisfy SOLID design principles, eliminate duplication, and preserve strict typing—without altering passing test outcomes.

### 2. Defect Resolution & Regression Protocol

When discovering or fixing an existing defect, follow this four-stage regression plan:

1. **Isolate with a Minimal Reproducible Example (MRE)**:
   - Strip away non-essential configuration, third-party integrations, or surrounding logic.
   - Reduce the reproduction to the absolute minimum set of inputs and state changes required to trigger the invalid behavior.
2. **Codify into a Failing Test (Red)**:
   - Translate the MRE into an automated test within the appropriate package test directory.
   - Run the test suite and confirm it fails specifically for the expected defect condition. Do not alter any implementation code yet.
3. **Implement the Root Cause Fix (Green)**:
   - Patch the defect with targeted, decoupled code changes until the failing test passes cleanly.
   - Verify that all existing unit, integration, and end-to-end tests continue to pass without side effects.
4. **Permanent Regression Shield**:
   - The reproduction test remains a permanent addition to our test suite. This ensures the defect cannot re-enter the codebase unnoticed during future refactoring or dependency updates.

---

## Development Workflow

### 1. Prerequisites

- Node.js >= 22.0.0
- Docker & Docker Compose v2+
- Git

### 2. Fork & Clone

```bash
git clone [https://github.com/your-username/cacophony.git](https://github.com/your-username/cacophony.git)
cd cacophony
npm install

```

### 3. Environment Configuration

```bash
cp .env.example .env

```

Review `.env` to configure your local test parameters and ports.

### 4. Making Changes

Create a descriptive topic branch from `master`:

```bash
git checkout -b feature/my-feature-name

```

Ensure your code is properly formatted and passes all tests before committing:

```bash
# Type check and build all packages
npm run build

# Run unit tests
npm test

# Format code
npm run format

```

### 5. Rebuilding in Live Environments

If validating changes within a running Docker stack, use the live rebuild script:

```bash
npm run rebuild
# or
./bin/rebuild-all.sh

```

---

## Commit Guidelines

We follow Conventional Commits format:

```text
<type>(<scope>): <short description>

```

Types:

* `feat`: A new user-facing or platform feature
* `fix`: A bug fix
* `docs`: Documentation modifications
* `test`: Adding or refactoring tests
* `refactor`: Code reorganization with no functional changes
* `chore`: Build or dependency maintenance

Examples:

* `feat(scheduler): add affinity-based batch grouping for local models`
* `fix(frontend): prevent horizontal overflow in mobile telemetry header`
* `test(db): verify migration rollback on connection failure`

---

## Submitting Pull Requests

1. Push your branch to your GitHub fork:
```bash
git push origin feature/my-feature-name

```


2. Open a Pull Request against the `master` branch.
3. Complete the Pull Request template checklist:
* Verify whether feature additions followed the TDD lifecycle.
* For bug fixes, confirm an automated test reproducing the MRE is included.


4. Ensure Continuous Integration (CI) checks pass.

