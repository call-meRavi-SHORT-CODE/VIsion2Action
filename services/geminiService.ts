import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const NAV_SYSTEM_INSTRUCTION = `
You are a pair of eyes for a blind user. 
Analyze the image stream and provide immediate navigation cues.

Priorities:
1. HAZARDS: Say "STOP" or "CAUTION" if there is immediate danger (stairs, traffic, hole).
2. PATH: Describe where to walk (e.g., "Path clear straight ahead", "Turn slightly right").
3. OBJECTS: Mention only obstacles in the way.
4. BREVITY: Maximum 10 words. concise. clear.
`;

const QA_SYSTEM_INSTRUCTION = `
You are a helpful visual assistant for a blind user. 
The user is asking a question about the current scene.
Answer conversationally and directly.
If the answer is not visible, say so.
Keep answers under 2 sentences.
`;

export const analyzeImage = async (base64Image: string): Promise<string> => {
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
        systemInstruction: NAV_SYSTEM_INSTRUCTION,
        maxOutputTokens: 100,
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
        maxOutputTokens: 150,
        temperature: 0.6,
      }
    });

    return response.text || "I couldn't see that.";
  } catch (error) {
    console.error("Gemini Q&A Error Details:", JSON.stringify(error, null, 2));
    return "I had trouble connecting to the assistant.";
  }
};