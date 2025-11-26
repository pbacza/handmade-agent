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
import { readFileContent, readFileTool } from './tools/read-file.js';
import { readDirectory, readDirectoryTool } from './tools/read-directory.js';
import { writeFileContent, writeFileTool } from './tools/write-file.js';

const client = new OpenAI({ apiKey: process.env.O_KEY });
const context: ResponseInput = [
  { role: 'system', content: 'You have my recipes in ./recipes folder' },
];

const astIcon = styleText('blue', '^!^');
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

  const { hasCalledTool, innerContext } = await handleTools(response);
  context.push(...innerContext);
  if (hasCalledTool) {
    console.log('>>> hasCalledTool', hasCalledTool);
    const rs = await processInput(context);
    return rs;
  }

  return response;
};

const callLLM = (context: OpenAI.Responses.ResponseInput) => {
  return client.responses.create({
    model: 'gpt-5-mini',
    input: context,
    reasoning: { effort: 'medium' },
    tools: [
      {
        name: readFileTool.name,
        description: readFileTool.description,
        type: 'function',
        parameters: {
          type: 'object',
          properties: {
            [readFileTool.params.name]: {
              type: 'string',
              description: readFileTool.params.description,
            },
          },
          required: [readFileTool.params.name],
          additionalProperties: false,
        },
        strict: true,
      },
      {
        name: writeFileTool.name,
        description: writeFileTool.description,
        type: 'function',
        parameters: {
          type: 'object',
          properties: {
            [writeFileTool.params.filePath.name]: {
              type: 'string',
              description: writeFileTool.params.filePath.description,
            },
            [writeFileTool.params.content.name]: {
              type: 'string',
              description: writeFileTool.params.content.description,
            },
          },
          required: [writeFileTool.params.filePath.name, writeFileTool.params.content.name],
          additionalProperties: false,
        },
        strict: true,
      },
      {
        name: readDirectoryTool.name,
        description: readDirectoryTool.description,
        type: 'function',
        parameters: {
          type: 'object',
          properties: {
            [readDirectoryTool.params.name]: {
              type: 'string',
              description: readDirectoryTool.params.description,
            },
          },
          required: [readDirectoryTool.params.name],
          additionalProperties: false,
        },
        strict: true,
      },
    ],
  });
};

const handleTools = async (
  response: Response,
): Promise<{ hasCalledTool: boolean; innerContext: ResponseInput }> => {
  let hasCalledTool = false;

  const innerContext: ResponseInput = [];

  for (const output of response.output) {
    switch (output.type) {
      case 'reasoning': {
        innerContext.push(output);
        continue;
      }

      case 'function_call': {
        innerContext.push(output);
        const result = await callTool(output);
        if (result) {
          innerContext.push(result);
        }
        hasCalledTool = true;
        continue;
      }
    }
  }

  return { hasCalledTool, innerContext };
};

const callTool = async (
  output: ResponseFunctionToolCall,
): Promise<ResponseInputItem.FunctionCallOutput | undefined> => {
  switch (output.name) {
    case readFileTool.name: {
      const fileName = JSON.parse(output.arguments).filePath;
      console.log('>>> Read File: ', fileName);
      const result = await readFileContent(fileName);

      return {
        type: 'function_call_output',
        call_id: output.call_id,
        output: result,
      };
    }

    case readDirectoryTool.name: {
      const dirPath = JSON.parse(output.arguments).dirPath;
      console.log('>>> Read Dir: ', dirPath);
      const result = await readDirectory(dirPath);
      console.log('>>> Read Dir: ', result);

      return {
        type: 'function_call_output',
        call_id: output.call_id,
        output: JSON.stringify(result),
      };
    }

    case writeFileTool.name: {
      const { filePath, content } = JSON.parse(output.arguments);
      console.log('>>> Write File: ', filePath);
      await writeFileContent(filePath, content);

      return {
        type: 'function_call_output',
        call_id: output.call_id,
        status: 'completed',
        output: `${filePath} created`,
      };
    }

    default:
      break;
  }
};
