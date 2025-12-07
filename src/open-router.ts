import { config } from 'dotenv';
config({ quiet: true });

import * as readline from 'readline/promises';
import { styleText } from 'node:util';
import { readFileContent, readFileTool } from './tools/read-file.js';
import { readDirectory, readDirectoryTool } from './tools/read-directory.js';
import { writeFileContent, writeFileTool } from './tools/write-file.js';
import { OpenRouter } from '@openrouter/sdk';
import type {
  ChatMessageToolCall,
  ChatResponse,
  Message,
  ToolResponseMessage,
} from '@openrouter/sdk/models';

const astIcon = styleText('blue', '^!^');
const usrIcon = styleText('magenta', '>?<');

const llm = new OpenRouter({
  apiKey: process.env.OR_KEY ?? '',
});

const sysPrompt = `
    You are a software engineer and hard-worker. Before any implementation you explore repository and read all relevant folders and files.
    After exploring you create a implementation plan.
    The source code is in ./src folder.

    You can use read-directory and read-files to explore existing folders and files.
    And use write-file to generate new code.
  `;

const context: Message[] = [
  {
    role: 'system',
    content: sysPrompt,
  },
];

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
      console.log(`${astIcon}:`, response.choices[0]?.message.content);
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

const processInput = async (context: Message[]): Promise<ChatResponse> => {
  const response = await callLLM(context);
  const msg = response.choices[0]!;
  context.push(msg.message);

  if (msg?.message.toolCalls) {
    const { hasCalledTool, innerContext } = await handleTools(msg.message.toolCalls);
    context.push(...innerContext);
    if (hasCalledTool) {
      console.log('>>> hasCalledTool', hasCalledTool);
      const rs = await processInput(context);
      return rs;
    }
  }

  return response;
};

const callLLM = (context: Message[]) => {
  return llm.chat.send({
    model: 'mistralai/codestral-2508',
    messages: context,
    stream: false,
    tools: [
      {
        type: 'function',
        function: {
          name: readFileTool.name,
          description: readFileTool.description,
          parameters: {
            type: 'object',
            properties: {
              [readFileTool.params.name]: {
                type: 'string',
                description: readFileTool.params.description,
              },
            },
            required: [readFileTool.params.name],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: writeFileTool.name,
          description: writeFileTool.description,
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
          },
        },
      },
      {
        type: 'function',
        function: {
          name: readDirectoryTool.name,
          description: readDirectoryTool.description,
          parameters: {
            type: 'object',
            properties: {
              [readDirectoryTool.params.name]: {
                type: 'string',
                description: readDirectoryTool.params.description,
              },
            },
            required: [readDirectoryTool.params.name],
          },
        },
      },
    ],
  });
};

const handleTools = async (
  toolCalls: ChatMessageToolCall[],
): Promise<{ hasCalledTool: boolean; innerContext: Message[] }> => {
  let hasCalledTool = false;

  const innerContext: Message[] = [];
  for (const toolCall of toolCalls) {
    const result = await callTool(toolCall);
    if (result) {
      innerContext.push(result);
    }

    hasCalledTool = true;
  }

  return { hasCalledTool, innerContext };
};

const callTool = async (output: ChatMessageToolCall): Promise<ToolResponseMessage | undefined> => {
  switch (output.function.name) {
    case readFileTool.name: {
      const fileName = JSON.parse(output.function.arguments).filePath;
      console.log('>>> Read File: ', fileName);
      const result = await readFileContent(fileName);

      return {
        role: 'tool',
        toolCallId: output.id,
        content: result,
      };
    }

    case readDirectoryTool.name: {
      const dirPath = JSON.parse(output.function.arguments).dirPath;
      console.log('>>> Read Dir: ', dirPath);
      const result = await readDirectory(dirPath);
      console.log('>>> Read Dir: ', result);

      return {
        role: 'tool',
        toolCallId: output.id,
        content: JSON.stringify(result),
      };
    }

    case writeFileTool.name: {
      const { filePath, content } = JSON.parse(output.function.arguments);
      console.log('>>> Write File: ', filePath);
      await writeFileContent(filePath, content);

      return {
        role: 'tool',
        toolCallId: output.id,
        content: `${filePath} was created`,
      };
    }

    default:
      break;
  }
};
