import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const data = await response.json();

    let output = "Available Models:\n";
    if (data.models) {
      data.models.forEach((m) => {
        if (m.supportedGenerationMethods.includes("generateContent")) {
          output += `- ${m.name} (${m.displayName})\n`;
        }
      });
    } else {
      output += JSON.stringify(data, null, 2);
    }

    console.log(output);
    fs.writeFileSync("models_list.txt", output);
  } catch (e) {
    console.error("Error", e);
  }
}

listModels();
