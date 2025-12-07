# Handmade Agent

An experiment to see if building an AI agent from scratch is actually that hard.

## What is this?

This project explores a simple idea: that an AI agent is just three things combined:
- An LLM (language model)
- Some tools it can use
- A loop that keeps it running

I built this to test that theory and see how minimal an agent can be.

## What does it do?

It's a chatbot that can interact with your files. You can talk to it, and it can:
- Read files
- Write files
- List what's in directories

The agent runs in a loop - when it needs to use a tool, it calls it, gets the result, and keeps going until it has an answer for you.

## How to run it

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file and add your OpenAI API key:
   ```
   O_KEY=your-api-key-here
   ```

3. Start the agent:
   ```
   npm start
   ```

4. Chat with it! Try asking it to read a file or tell you what's in a folder.

## The code

The main logic is in [src/index.ts](src/index.ts). It's pretty straightforward:
- Takes your input
- Sends it to the LLM with available tools
- If the LLM wants to use a tool, run it and loop back
- When done, show you the response

The tools are simple functions in the `src/tools/` folder that wrap basic file operations.

## Why I made this

I read somewhere that agents are just "LLM + tools + loop" and wanted to see if I could build one without any fancy frameworks. Turns out, it's not that complicated!
