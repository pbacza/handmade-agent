import { config } from 'dotenv';
config({ quiet: true });

import OpenAI from 'openai';
import type {
  ResponseInput,
  Response,
  ResponseFunctionToolCall,
  ResponseInputItem,
} from 'openai/resources/responses/responses.mjs';
import * as readline from 'readline/promises';
import { styleText } from 'node:util';
import { ping, pingu } from './tools/ping.js';

const client = new OpenAI({ apiKey: process.env.O_KEY });
const context: ResponseInput = [];

const assIcon = styleText('blue', '^!^');
const usrIcon = styleText('magenta', '>?<');

main();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    try {
      const line = await rl.question(`${usrIcon}: `);
      const response = await processInput(line);
      console.log(`${assIcon}: `, response);
    } catch (error) {
      // Handle Ctrl+C gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`\n${assIcon}: Goodbye!\n`);
        rl.close();
        process.exit(0);
      }
      throw error;
    }
  }
}

const processInput = async (line: string) => {
  context.push({ role: 'user', content: line });

  let response = await callLLM(context);
  context.push({ role: 'assistant', content: response.output_text });

  const hasCalledTool = await handleTools(response);
  if (hasCalledTool) {
    response = await callLLM(context);
  }

  return response.output_text;
};

const callLLM = (context: OpenAI.Responses.ResponseInput) => {
  return client.responses.create({
    model: 'gpt-5',
    input: context,
    // reasoning: { effort: 'medium' },
    tools: [
      {
        name: pingu.name,
        description: pingu.description,
        type: 'function',
        parameters: {
          type: 'object',
          properties: {
            [pingu.params.name]: {
              type: 'string',
              description: pingu.params.description,
            },
          },
          required: [pingu.params.name],
          additionalProperties: false,
        },
        strict: true,
      },
    ],
  });
};

const handleTools = async (response: Response) => {
  let hasFnCallHappened = false; //! REFACTOR

  for (const output of response.output) {
    switch (output.type) {
      case 'function_call': {
        context.push(output);
        const result = await callTool(output);
        if (result) {
          context.push(result);
        }
        hasFnCallHappened = true;
        continue;
      }

      case 'reasoning': {
        context.push(output);
        continue;
      }
    }
  }

  return hasFnCallHappened;
};

const callTool = async (
  output: ResponseFunctionToolCall,
): Promise<ResponseInputItem.FunctionCallOutput | undefined> => {
  if (output.name === 'ping') {
    const host = JSON.parse(output.arguments).host; //! A BIT UGLY
    const result = await ping(host);
    console.log('>>> Ping: ', host);

    return {
      type: 'function_call_output',
      call_id: output.call_id,
      output: JSON.stringify(result),
    };
  }
};

// describe connectivity to google
