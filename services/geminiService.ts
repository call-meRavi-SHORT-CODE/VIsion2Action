import { GoogleGenAI } from "@google/genai";
import { MemoryTag } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getNavInstruction = (tags: MemoryTag[]) => {
  const tagList = tags.map(t => `"${t.name}"`).join(', ');
  const memoryContext = tags.length > 0 
    ? `\n5. MEMORY: The user has marked these specific locations: [${tagList}]. If you see one of them clearly, announce "You are near your ${tags[0].name}" or similar.` 
    : "";

  return `
You are a pair of eyes for a blind user. 
Analyze the image stream and provide immediate navigation cues.

Priorities:
1. HAZARDS: Say "STOP" or "CAUTION" if there is immediate danger (stairs, traffic, hole).
2. PATH: Describe where to walk (e.g., "Path clear straight ahead", "Turn slightly right").
3. OBJECTS: Mention only obstacles in the way.
4. STYLE: Use complete, concise sentences. Avoid bullet points. Do not cut off sentences.${memoryContext}
`;
};

const QA_SYSTEM_INSTRUCTION = `
You are a helpful visual assistant for a blind user. 
The user is asking a question about the current scene.
Answer conversationally and directly.
If the answer is not visible, say so.
Keep answers under 2 sentences.
`;

export const analyzeImage = async (base64Image: string, tags: MemoryTag[] = []): Promise<string> => {
  try {
    if (!base64Image || base64Image.length < 100) {
        console.warn("Invalid base64 image received");
        return "";
    }

    // Remove data URL prefix if present (look for the comma after base64)
    const cleanBase64 = base64Image.includes('base64,') 
        ? base64Image.split('base64,')[1] 
        : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: "Describe the path and hazards." }
          ]
        }
      ],
      config: {
        systemInstruction: getNavInstruction(tags),
        maxOutputTokens: 300, 
        temperature: 0.4,
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Nav Error Details:", JSON.stringify(error, null, 2));
    return "";
  }
};

export const askAboutImage = async (base64Image: string, question: string): Promise<string> => {
  try {
     if (!base64Image || base64Image.length < 100) {
        return "I can't see the image clearly.";
    }

    const cleanBase64 = base64Image.includes('base64,') 
        ? base64Image.split('base64,')[1] 
        : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: question }
          ]
        }
      ],
      config: {
        systemInstruction: QA_SYSTEM_INSTRUCTION,
        maxOutputTokens: 300,
        temperature: 0.6,
      }
    });

    return response.text || "I couldn't see that.";
  } catch (error) {
    console.error("Gemini Q&A Error Details:", JSON.stringify(error, null, 2));
    return "I had trouble connecting to the assistant.";
  }
};