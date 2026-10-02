import { parse } from 'acorn';
import { generate } from '@babel/generator';

interface CodeBlock {
  start: number;
  end: number;
}

class SelfHealingParser {
  private maxRetries = 2;

  public parseCode(input: string): string {
    let retries = 0;
    while (retries <= this.maxRetries) {
      try {
        const codeWithoutFiller = this.stripConversationalFiller(input);
        const ast = parse(codeWithoutFiller, { ecmaVersion: 2020 });
        return generate(ast).code;
      } catch (error) {
        retries++;
        if (retries > this.maxRetries) {
          throw new Error('Failed to parse code after multiple attempts');
        }
      }
    }
  }

  private stripConversationalFiller(input: string): string {
    const fillerRegex = /^(?:Here is the code:|Certainly! Here is...)\s*/i;
    return input.replace(fillerRegex, '');
  }
}

export default SelfHealingParser;