import { config } from 'dotenv';
config({ quiet: true });

import { GenerateContentResponse, GoogleGenAI, type Content } from '@google/genai';
import * as readline from 'readline/promises';

const context: Content[] = [];

const ai = new GoogleGenAI({ apiKey: process.env.G_KEY ?? '' });

const callLLM = async (line: string): Promise<GenerateContentResponse> => {
  context.push({ role: 'user', parts: [{ text: line }] });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: context,
  });

  context.push({ role: 'model', parts: [{ text: response.text ?? '' }] });

  return response;
};

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const line = await rl.question('>!< ');
    const response = await callLLM(line);
    console.log(response.text);
  }
}

await main();
