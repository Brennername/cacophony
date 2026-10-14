import path from "node:path";
import { DatasetVersionMigrator } from "../optimization/DatasetVersionMigrator.js";

/**
 * Executes dataset management subcommands.
 * Currently supports: cacophony dataset migrate --dir=<path>
 */
export async function runDatasetMigrateCommand(args: readonly string[]): Promise<number> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printDatasetHelp();
    return 0;
  }

  const subcommand = args[0];
  if (subcommand !== "migrate") {
    console.error(`Unknown dataset subcommand: ${subcommand}`);
    printDatasetHelp();
    return 1;
  }

  const rest = args.slice(1);
  let dir: string | undefined;
  let targetDir: string | undefined;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg.startsWith("--dir=")) {
      dir = arg.substring("--dir=".length);
    } else if (arg === "--dir" && i + 1 < rest.length) {
      dir = rest[++i];
    } else if (arg.startsWith("--target=")) {
      targetDir = arg.substring("--target=".length);
    } else if (arg === "--target" && i + 1 < rest.length) {
      targetDir = rest[++i];
    } else if (!arg.startsWith("-") && !dir) {
      dir = arg;
    }
  }

  if (!dir) {
    console.error("Error: --dir=<path> is required for dataset migration.");
    printDatasetHelp();
    return 1;
  }

  const resolvedDir = path.resolve(dir);
  console.log(`Starting non-destructive dataset schema migration for: ${resolvedDir}`);

  try {
    const migrator = new DatasetVersionMigrator();
    const result = await migrator.migrate(resolvedDir, {
      inplace: !targetDir,
      targetDir,
    });

    console.log(
      `Dataset migration complete!\n` +
      `  Previous Version: ${result.previousVersion}\n` +
      `  New Version:      ${result.manifest.version}\n` +
      `  Tasks Processed:  ${result.tasksMigrated}\n` +
      `  Target Directory: ${result.targetDirectory}\n` +
      `  Manifest File:    ${path.join(result.targetDirectory, "manifest.json")}`
    );
    return 0;
  } catch (err) {
    console.error(`Dataset migration failed: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

function printDatasetHelp(): void {
  console.log(`
Cacophony Dataset Management:
  cacophony dataset migrate --dir=<path> [--target=<targetPath>]

Options:
  --dir=<path>       Directory path containing historical arena dataset (required)
  --target=<path>    Optional target directory for migration output (defaults to in-place)
`);
}
