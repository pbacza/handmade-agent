import { config } from "dotenv";
config({ quiet: true });

import { GoogleGenAI } from "@google/genai";

const context:string[] = []

const ai = new GoogleGenAI({ apiKey: process.env.G_KEY ?? '' });

async function main() {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Explain how AI works in a few words",
    });

    console.log(response.text);
}

await main();