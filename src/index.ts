import { config } from 'dotenv';
config({ quiet: true });

import { Ollama, type Message, type ChatResponse, type ToolCall } from 'ollama';

import * as readline from 'readline/promises';
import { styleText } from 'node:util';
import { readFileContent, readFileTool } from './tools/read-file.js';
import { readDirectory, readDirectoryTool } from './tools/read-directory.js';
import { writeFileContent, writeFileTool } from './tools/write-file.js';

const astIcon = styleText('blue', '^!^');
const usrIcon = styleText('magenta', '>?<');
const llm = new Ollama();

const context: Message[] = [
  {
    role: 'system',
    content: `Your source code is in ./src folder.
    You can use read-directory and read-files to explore existing folders and files.
    And use write-file to generate new code.
  `,
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
      console.log(`${astIcon}:`, response.message.content);
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
  context.push({ role: 'assistant', content: response.message.content });

  if (response.message.tool_calls) {
    const { hasCalledTool, innerContext } = await handleTools(response.message.tool_calls);
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
  return llm.chat({
    model: 'qwen3-vl:8b',
    messages: context,
    stream: false,
    tools: [
      {
        type: 'function',
        function: {
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
          },
        },
      },
      {
        type: 'function',
        function: {
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
          },
        },
      },
      {
        type: 'function',
        function: {
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
          },
        },
      },
    ],
  });
};

const handleTools = async (
  toolCalls: ToolCall[],
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

const callTool = async (output: ToolCall): Promise<Message | undefined> => {
  switch (output.function.name) {
    case readFileTool.name: {
      const fileName = output.function.arguments.filePath;
      console.log('>>> Read File: ', fileName);
      const result = await readFileContent(fileName);

      return {
        role: 'tool',
        tool_name: output.function.name,
        content: result,
      };
    }

    case readDirectoryTool.name: {
      const dirPath = output.function.arguments.dirPath;
      console.log('>>> Read Dir: ', dirPath);
      const result = await readDirectory(dirPath);
      console.log('>>> Read Dir: ', result);

      return {
        role: 'tool',
        tool_name: output.function.name,
        content: JSON.stringify(result),
      };
    }

    case writeFileTool.name: {
      const { filePath, content } = output.function.arguments;
      console.log('>>> Write File: ', filePath);
      await writeFileContent(filePath, content);

      return {
        role: 'tool',
        tool_name: output.function.name,
        content: `${filePath} was created`,
      };
    }

    default:
      break;
  }
};
