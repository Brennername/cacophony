import { CacophonyCli } from "./CacophonyCli.js";

async function main(): Promise<void> {
  const cli = new CacophonyCli();
  const exitCode = await cli.run(process.argv.slice(2));
  process.exit(exitCode);
}

void main();
