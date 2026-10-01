import { GitWorktreeManager } from '../gitea/GitWorktreeManager';
import { TaskScheduler } from '../scheduler/TaskScheduler';

export class GitCheckpointManager {
  private gitWorktreeManager: GitWorktreeManager;
  private taskScheduler: TaskScheduler;

  constructor(gitWorktreeManager: GitWorktreeManager, taskScheduler: TaskScheduler) {
    this.gitWorktreeManager = gitWorktreeManager;
    this.taskScheduler = taskScheduler;
  }

  /**
   * Reverts the workspace to a specific checkpoint.
   * @param checkpointId - The ID of the checkpoint to revert to.
   */
  async revertToCheckpoint(checkpointId: string): Promise<void> {
    try {
      // Checkout the snapshot into the workspace
      await this.gitWorktreeManager.checkoutSnapshot(checkpointId);

      // Schedule a task to update any necessary metadata or configurations
      this.taskScheduler.scheduleTask('updateMetadata', { checkpointId });

      console.log(`Workspace reverted to checkpoint ${checkpointId}`);
    } catch (error) {
      console.error(`Failed to revert workspace to checkpoint ${checkpointId}:`, error);
      throw error;
    }
  }
}