/**
 * Frontend Test Runner Wrapper
 *
 * Prevents Angular CLI argument parse crashes when npm forwards positional
 * arguments intended for other monorepo packages (e.g. @cacophony/engine).
 */
const { spawnSync } = require('child_process');

const rawArgs = process.argv.slice(2);

// If npm forwarded arguments targeting non-frontend packages, exit cleanly
const isForeignTarget = rawArgs.some(
  (arg) =>
    arg.includes('packages/engine') ||
    arg.includes('packages/db') ||
    arg.includes('packages/tools') ||
    arg.includes('packages/shared-types')
);

if (isForeignTarget) {
  process.exit(0);
}

const res = spawnSync('ng', ['test', '--watch=false'], {
  stdio: 'inherit',
  shell: true,
});

process.exit(res.status ?? 0);
