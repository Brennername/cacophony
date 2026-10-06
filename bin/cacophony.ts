import { exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Function to perform automated verification and upstream release
function promote(options: { dryRun?: boolean; target?: string }) {
  const { dryRun = false, target = 'github' } = options;

  // Check if the current branch is ready for promotion
  exec('git status', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error checking git status: ${stderr}`);
      return;
    }

    const status = stdout.trim();
    if (status !== 'On branch main\nnothing to commit, working tree clean') {
      console.error('Current branch is not ready for promotion. Please ensure you are on the main branch and have no uncommitted changes.');
      return;
    }

    // Run automated verification
    exec('npm run test', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running automated verification: ${stderr}`);
        return;
      }

      console.log(stdout);

      // If dry-run is enabled, exit here
      if (dryRun) {
        console.log('Dry run complete. No changes made.');
        return;
      }

      // Perform upstream release to GitHub
      exec('git push origin main', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error pushing to GitHub: ${stderr}`);
          return;
        }

        console.log(stdout);

        console.log('Promotion successful!');
      });
    });
  });
}

// Command line interface for the promote command
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: { dryRun?: boolean; target?: string } = {};

  args.forEach(arg => {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--target=')) {
      options.target = arg.split('=')[1];
    }
  });

  promote(options);
}
