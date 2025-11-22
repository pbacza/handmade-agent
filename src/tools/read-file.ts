import { readFile } from 'fs/promises';

export const readFileContent = async (filePath: string): Promise<string> => {
  const content = await readFile(filePath, 'utf-8');
  return content;
};

export const readFileTool = {
  name: 'read-file',
  description: 'Read a file from the filesystem and return its content as plain text.',
  params: {
    name: 'filePath',
    description: 'The path to the file to read',
  },
} as const;
