# Contributing to Cacophony

Thank you for your interest in contributing to Cacophony. We welcome bug reports, feature proposals, and pull requests to help advance autonomous multi-agent orchestration and local model arenas.

---

## Architectural Directives & Guidelines

Before authoring code or submitting a pull request, ensure you adhere to the following project standards:

1. **Zero Emojis**:
   - Strictly no emojis in code, docstrings, commit messages, comments, issues, or documentation (unless a feature is explicitly dedicated to emoji processing).
2. **SOLID Principles**:
   - Write decoupled, modular code adhering to Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion.
3. **Strict Typing**:
   - TypeScript is required throughout the codebase. Any new model, payload, or API interface must be explicitly typed under `@cacophony/shared-types`.
   - Strictly no Python scripts or untyped JavaScript.
4. **Mobile-First Design**:
   - Frontend components must be designed mobile-first with defensive viewport scaling, overflow clipping, and responsive flex/grid layouts.
5. **Security & Secrets**:
   - Never commit API keys, tokens, passwords, or credentials. All secrets belong in `.env` files and must be accessed via configuration objects.
6. **Integrity Rule**:
   - Never stub, fake, or artificially bypass test passes. Tests must authentically assert system behavior and invariants.

---

## Development Workflow

### 1. Prerequisites

- Node.js >= 22.0.0
- Docker & Docker Compose v2+
- Git

### 2. Fork & Clone

```bash
git clone https://github.com/your-username/cacophony.git
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

- `feat`: A new user-facing or platform feature
- `fix`: A bug fix
- `docs`: Documentation modifications
- `test`: Adding or refactoring tests
- `refactor`: Code reorganization with no functional changes
- `chore`: Build or dependency maintenance

Examples:

- `feat(scheduler): add affinity-based batch grouping for local models`
- `fix(frontend): prevent horizontal overflow in mobile telemetry header`
- `test(db): verify migration rollback on connection failure`

---

## Submitting Pull Requests

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/my-feature-name
   ```
2. Open a Pull Request against the `master` branch.
3. Complete the Pull Request template checklist.
4. Ensure Continuous Integration (CI) checks pass.
