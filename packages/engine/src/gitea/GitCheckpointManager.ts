import { TaskId, StageName } from '@cacophony/shared-types';
import { GitWorktreeManager } from '../gitea/GitWorktreeManager';

const CHECKPOINT_REF_PREFIX = 'refs/cacophony/checkpoints/';

export class GitCheckpointManager {
  private gitWorktreeManager: GitWorktreeManager;

  constructor(gitWorktreeManager: GitWorktreeManager) {
    this.gitWorktreeManager = gitWorktreeManager;
  }

  /**
   * Stores a checkpoint reference under the hidden namespace.
   * @param taskId - The ID of the task associated with the checkpoint.
   * @param stageName - The name of the stage associated with the checkpoint.
   * @param ref - The reference to store as a checkpoint.
   */
  public async storeCheckpointRef(taskId: TaskId, stageName: StageName, ref: string): Promise<void> {
    const checkpointRef = `${CHECKPOINT_REF_PREFIX}${taskId}-${stageName}`;
    await this.gitWorktreeManager.setGitRef(checkpointRef, ref);
  }

  /**
   * Retrieves a checkpoint reference from the hidden namespace.
   * @param taskId - The ID of the task associated with the checkpoint.
   * @param stageName - The name of the stage associated with the checkpoint.
   * @returns The checkpoint reference if found; otherwise, undefined.
   */
  public async getCheckpointRef(taskId: TaskId, stageName: StageName): Promise<string | undefined> {
    const checkpointRef = `${CHECKPOINT_REF_PREFIX}${taskId}-${stageName}`;
    return this.gitWorktreeManager.getGitRef(checkpointRef);
  }

  /**
   * Deletes a checkpoint reference from the hidden namespace.
   * @param taskId - The ID of the task associated with the checkpoint.
   * @param stageName - The name of the stage associated with the checkpoint.
   */
  public async deleteCheckpointRef(taskId: TaskId, stageName: StageName): Promise<void> {
    const checkpointRef = `${CHECKPOINT_REF_PREFIX}${taskId}-${stageName}`;
    await this.gitWorktreeManager.deleteGitRef(checkpointRef);
  }
}