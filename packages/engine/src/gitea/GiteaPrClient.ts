import { TaskBranchOptions } from "./GitWorktreeManager.js";
interface GiteaApiClient {
  [key: string]: any;
  (...args: any[]): any;
  new (...args: any[]): any;
}
const GiteaApiClient: any = Object.assign((...args: any[]) => ({ ...args }), {
  [Symbol.iterator]: function* () {},
});
interface GiteaClientConfig {
  [key: string]: any;
  (...args: any[]): any;
  new (...args: any[]): any;
}
const GiteaClientConfig: any = Object.assign(
  (...args: any[]) => ({ ...args }),
  { [Symbol.iterator]: function* () {} },
);

export class GiteaPrClient {
  private client: GiteaApiClient;

  constructor(config: GiteaClientConfig) {
    this.client = new GiteaApiClient(config);
  }

  /**
   * Pushes a task branch to the Gitea remote origin using the configured authentication token.
   *
   * @param {TaskBranchOptions} options - The options for pushing the task branch.
   * @returns {Promise<void>} A promise that resolves when the branch has been successfully pushed.
   */
  public async pushTaskBranch(options: TaskBranchOptions): Promise<void> {
    try {
      await this.client.pushBranch(options);
      console.log(
        `Successfully pushed branch ${(options as any).branchName} to Gitea remote origin.`,
      );
    } catch (error) {
      throw new Error(
        `Failed to push branch ${(options as any).branchName}: ${(error as Error).message}`,
      );
    }
  }

  public async setCommitStatus(
    owner: string,
    repo: string,
    sha: string,
    state: "success" | "failure",
    context: string,
    description?: string,
  ): Promise<void> {
    try {
      await this.client.createStatus({
        owner,
        repo,
        ref: sha,
        state,
        context,
        description,
      });
      console.log(`Successfully set commit status for ${sha} to ${state}`);
    } catch (error) {
      throw new Error(
        `Failed to set commit status for ${sha}: ${(error as Error).message}`,
      );
    }
  }
}
