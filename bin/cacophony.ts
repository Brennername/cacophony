import { exec } from "node:child_process";

export interface PromoteOptions {
  readonly dryRun?: boolean;
  readonly target?: string;
  readonly skipGitCleanCheck?: boolean;
  readonly testCommand?: string;
}

export function promote(options: PromoteOptions): Promise<boolean> {
  const { dryRun = false, target = "github", skipGitCleanCheck = false, testCommand = "npm test" } = options;

  return new Promise((resolve) => {
    exec("git status", (statusErr, stdout, stderr) => {
      if (statusErr) {
        console.error(`Error checking git status: ${stderr}`);
        resolve(false);
        return;
      }

      const status = stdout.trim();
      const isClean = status.includes("nothing to commit, working tree clean");
      if (!isClean && !dryRun && !skipGitCleanCheck) {
        console.error("Working tree is not clean. Ensure all changes are committed before promotion.");
        resolve(false);
        return;
      }

      console.log("[Promotion Gauntlet] Running automated test verification gate...");

      exec(testCommand, (testErr, testStdout, testStderr) => {
        if (testErr) {
          console.error(`[Promotion Gate Failure] Automated verification tests failed: ${testStderr || testStdout}`);
          resolve(false);
          return;
        }

        console.log("[Promotion Gauntlet] All test suites passed 100%.");

        if (dryRun) {
          console.log(`[Promotion Pipeline] Dry run complete for target '${target}'. Gates passed. No remote push performed.`);
          resolve(true);
          return;
        }

        const confirm = options.hasOwnProperty("yes") ? options.yes : false;
        if (!confirm) {
          console.log("[Promotion Confirmation] Are you sure you want to proceed with the destructive reset? (y/n)");
          process.stdin.resume();
          process.stdin.setEncoding('utf8');
          process.stdin.on('data', (chunk) => {
            if (/^y(es)?$/i.test(chunk)) {
              console.log("[Promotion Confirmation] Proceeding with destructive reset...");
              exec("git reset --hard", (resetErr, resetStdout, resetStderr) => {
                if (resetErr) {
                  console.error(`[Destructive Reset Error] Failed to reset: ${resetStderr}`);
                  resolve(false);
                  return;
                }
                console.log("[Promotion Pipeline] Destructive reset successful.");
                console.log(resetStdout.trim());
                exec("git push origin master --force", (pushErr, pushStdout, pushStderr) => {
                  if (pushErr) {
                    console.error(`[Push Error] Failed pushing after reset: ${pushStderr}`);
                    resolve(false);
                    return;
                  }
                  console.log("[Promotion Pipeline] Push successful after destructive reset.");
                  resolve(true);
                });
              });
            } else {
              console.log("Operation cancelled by user.");
              resolve(false);
            }
          });
        } else {
          console.log("[Promotion Confirmation] Proceeding with destructive reset...");
          exec("git reset --hard", (resetErr, resetStdout, resetStderr) => {
            if (resetErr) {
              console.error(`[Destructive Reset Error] Failed to reset: ${resetStderr}`);
              resolve(false);
              return;
            }
            console.log("[Promotion Pipeline] Destructive reset successful.");
            console.log(resetStdout.trim());
            exec("git push origin master --force", (pushErr, pushStdout, pushStderr) => {
              if (pushErr) {
                console.error(`[Push Error] Failed pushing after reset: ${pushStderr}`);
                resolve(false);
                return;
              }
              console.log("[Promotion Pipeline] Push successful after destructive reset.");
              resolve(true);
            });
          });
        }
      });
    });
  });
}

const isDirectRun = Boolean(process.argv[1]?.endsWith("cacophony.ts") || process.argv[1]?.endsWith("cacophony.js"));
if (isDirectRun) {
  const rawArgs = process.argv.slice(2);
  const command = rawArgs[0] === "promote" ? rawArgs[0] : undefined;
  const commandArgs = command ? rawArgs.slice(1) : rawArgs;

  const options: PromoteOptions = {
    dryRun: commandArgs.includes("--dry-run"),
    yes: commandArgs.includes("--yes") // Add support for --yes flag to automatically confirm destructive actions
  };

  for (const arg of commandArgs) {
    if (arg.startsWith("--target=")) {
      options.target = arg.split("=")[1];
    }
  }

  promote(options).then((success) => {
    process.exit(success ? 0 : 1);
  });
}
