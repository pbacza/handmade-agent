import { readdir } from 'fs/promises';

export const readDirectory = async (dirPath: string): Promise<string[]> => {
  try {
    return await readdir(dirPath);
  } catch {
    return [];
  }
};

export const readDirectoryTool = {
  name: 'read-directory',
  description: 'Read a directory and return a list of file and folder names contained in it.',
  params: {
    name: 'dirPath',
    description: 'The path to the directory to read',
  },
} as const;
