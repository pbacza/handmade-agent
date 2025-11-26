import { config } from 'dotenv';
config({ quiet: true });

import OpenAI from 'openai';
import type { ResponseInput } from 'openai/resources/responses/responses.mjs';
import * as readline from 'readline/promises';
import { styleText } from 'node:util';

const astIcon = styleText('blue', '^!^');
const usrIcon = styleText('magenta', '>?<');
const client = new OpenAI({ apiKey: process.env.O_KEY });

const context: ResponseInput = [{ role: 'system', content: '' }];

main();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    try {
      const line = await rl.question(`${usrIcon}: `);

      context.push({ role: 'user', content: line });

      const response = await processInput(context);

      console.log(`${astIcon}:`, response.output_text);
    } catch (error) {
      // Handle Ctrl+C gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`\n${astIcon}: Goodbye!\n`);
        rl.close();
        process.exit(0);
      }
      throw error;
    }
  }
}

const processInput = async (context: ResponseInput): Promise<OpenAI.Responses.Response> => {
  const response = await callLLM(context);
  context.push({ role: 'assistant', content: response.output_text });

  return response;
};

const callLLM = (context: OpenAI.Responses.ResponseInput) => {
  return client.responses.create({
    model: 'gpt-5-mini',
    input: context,
  });
};
