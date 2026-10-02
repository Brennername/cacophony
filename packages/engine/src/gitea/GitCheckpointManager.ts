import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface GitCheckpoint {
  commitHash: string;
  message: string;
  date: Date;
  changedFiles: string[];
}

export class GitCheckpointManager {
  private readonly repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  public async getCheckpoints(): Promise<GitCheckpoint[]> {
    const checkpoints: GitCheckpoint[] = [];

    try {
      // Execute the git log command to retrieve refs in refs/cacophony/checkpoints/
      const { stdout } = await exec(`git --git-dir=${this.repoPath}/.git log --pretty=format:"%H %s %ad" --name-only --date=iso-strict refs/cacophony/checkpoints/`, {
        cwd: this.repoPath,
      });

      // Split the output into individual commits
      const commitLines = stdout.split('\n');

      for (const line of commitLines) {
        if (line.trim() === '') continue;

        const [commitHash, message, dateStr] = line.split(' ', 3);
        const date = new Date(dateStr);

        // Get the list of changed files for this commit
        const { stdout: diffOutput } = await exec(`git --git-dir=${this.repoPath}/.git diff-tree -r --no-commit-id --name-only ${commitHash}`, {
          cwd: this.repoPath,
        });

        const changedFiles = diffOutput.split('\n').filter(file => file.trim() !== '');

        checkpoints.push({ commitHash, message, date, changedFiles });
      }
    } catch (error) {
      console.error('Error fetching git checkpoints:', error);
    }

    return checkpoints;
  }
}