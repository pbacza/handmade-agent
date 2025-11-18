import { config } from "dotenv";
config({ quiet: true });

console.log("Hello Agent", process.env.G_KEY);