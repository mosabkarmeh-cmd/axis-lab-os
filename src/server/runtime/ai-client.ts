import { GoogleGenAI } from "@google/genai";

export const apiKey = process.env.GEMINI_API_KEY || "dummy_key_for_startup";

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});
