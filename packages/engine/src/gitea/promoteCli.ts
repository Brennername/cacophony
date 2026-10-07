import { exec } from "node:child_process";

export interface PromoteOptions {
  readonly dryRun?: boolean;
  readonly target?: string;
  readonly skipGitCleanCheck?: boolean;
  readonly testCommand?: string;
}

/**
 * Executes quarantine verification and promotes verified staging commits to upstream production.
 */
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
        } else {
          console.log(`[Promotion Pipeline] Pushing release to upstream ${target}...`);
          exec("git push origin master", (pushErr, pushStdout, pushStderr) => {
            if (pushErr) {
              console.error(`[Promotion Gate Failure] Failed pushing to upstream: ${pushStderr}`);
              resolve(false);
              return;
            }

            console.log(pushStdout.trim());
            console.log("[Promotion Pipeline] Promotion to upstream production successful.");
            resolve(true);
          });
        }
      });
    });
  });
}
