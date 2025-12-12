import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a real-time navigation assistant for a blind user.
Your input is a stream of camera frames from the user's perspective.
Analyze the image and output a concise spoken instruction.

Rules:
1. DANGER CHECK: If there are immediate hazards (stairs, drop-offs, traffic, blocking obstacles), start with "CAUTION" or "STOP".
2. NAVIGATION: Describe the path ahead or relative position of key items using clock directions (e.g., "Clear path", "Door at 2 o'clock", "Chair ahead").
3. TEXT: If there is a large sign (e.g., "Exit", "Restroom"), read it.
4. BREVITY: Keep it under 15 words.
5. Do not describe background details unless they block the path.
`;

const QA_SYSTEM_INSTRUCTION = `
You are a helpful visual assistant for a blind user. 
The user will ask a specific question about the image provided.
Answer conversationally, concisely, and directly.
If the answer is not visible in the image, clearly state that you cannot see it.
Keep answers under 2 sentences unless detailed description is requested.
`;

export const analyzeImage = async (base64Image: string): Promise<string> => {
  try {
    // Remove data URL prefix if present for clean base64
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: "Provide navigation assistance for this scene."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 80, 
        temperature: 0.4,
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "";
  }
};

export const askAboutImage = async (base64Image: string, question: string): Promise<string> => {
  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: question
          }
        ]
      },
      config: {
        systemInstruction: QA_SYSTEM_INSTRUCTION,
        maxOutputTokens: 150,
        temperature: 0.6, // Slightly higher for more natural conversation
      }
    });

    return response.text || "I couldn't generate an answer.";
  } catch (error) {
    console.error("Gemini Q&A Error:", error);
    return "I had trouble answering that.";
  }
};