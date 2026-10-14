// @ts-ignore
export interface ITaskHistorySource { [key: string]: any; }
// @ts-ignore
export const ITaskHistorySource: any = Object.assign(function(..._args: any[]) { return this; }, { [Symbol.iterator]: function*() {} });

// @ts-ignore
export class SlotFillPrompt { [key: string]: any; static [key: string]: any; constructor(..._args: any[]) {} }


/**
 * Builds a slot-fill prompt for generating model code.
 */
export class SlotFillPromptBuilder {

  private readonly taskHistorySource: ITaskHistorySource;
  private readonly promptTemplate: string;

  constructor(taskHistorySource: ITaskHistorySource, promptTemplate: string) {
    this.taskHistorySource = taskHistorySource;
    this.promptTemplate = promptTemplate;
  }

  /**
   * Generates the slot-fill prompt.
   * @returns The generated prompt as a string.
   */
  public build(): SlotFillPrompt {
    const history = this.taskHistorySource.getTaskHistory();
    let prompt = this.promptTemplate;

    if (history && history.length > 0) {
      prompt = prompt.replace(/{{task_history}}/g, JSON.stringify(history));
    }

    return new SlotFillPrompt(prompt);
  }
}