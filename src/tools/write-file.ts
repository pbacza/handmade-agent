import { writeFile } from 'fs/promises';

export const writeFileContent = async (filePath: string, content: string): Promise<void> => {
  await writeFile(filePath, content, 'utf-8');
};

export const writeFileTool = {
  name: 'write-file',
  description:
    'Write content to a file on the filesystem. Creates the file if it does not exist, or overwrites it if it does.',
  params: {
    filePath: {
      name: 'filePath',
      description: 'The path to the file to write',
    },
    content: {
      name: 'content',
      description: 'The content to write to the file',
    },
  },
} as const;
