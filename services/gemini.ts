import { GoogleGenAI, Type, Chat } from "@google/genai";
import { QuizQuestion, ChatMessage } from "../types";

// Ensure process is defined for TypeScript without needing @types/node explicitly in all envs
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};

// Check for API key availability
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

const STUDENT_SYSTEM_INSTRUCTION = `
You are EDUFLY, an intelligent, encouraging, and safe AI tutor for a student. 
Your goal is to help them learn, not just give answers.

Rules:
1. Be concise, clear, and age-appropriate.
2. If asked to do homework, explain the concept and give examples. Do not simply provide the final answer; guide the student through the steps.
3. Use formatting (bullet points, bold text) to make learning easy.
4. If the topic is inappropriate/harmful, politely decline.
5. **Image Analysis**: If an image is provided:
   - Identify what the image is (e.g., a math equation, a biology diagram, a historical map).
   - If it is a problem/question (like a math problem), solve it STEP-BY-STEP. Explain the logic for each step so the student understands HOW to reach the solution.
   - If it is a diagram or text, summarize and explain the key concepts.
`;

export const createChatSession = (history?: ChatMessage[]): Chat => {
  const sdkHistory: any[] = [];

  if (history && history.length > 0) {
      let lastRole = '';

      for (const msg of history) {
          // Gemini API requires alternating roles. 
          // If we have consecutive messages of the same role in our UI history, 
          // we skip the subsequent ones for the SDK context to prevent errors.
          if (msg.role === lastRole) continue;

          // Ensure 'user' or 'model' are the only roles passed
          if (msg.role !== 'user' && msg.role !== 'model') continue;

          const parts: any[] = [{ text: msg.text }];
          
          if (msg.image) {
            // Extract base64 data and mime type from data URL
            // Format: data:image/png;base64,.....
            const matches = msg.image.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              parts.push({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2]
                }
              });
            }
          }

          sdkHistory.push({
            role: msg.role,
            parts: parts
          });
          lastRole = msg.role;
      }
      
      // Critical: The history passed to chats.create represents the *past* conversation.
      // If the last message in history is 'user', and we interpret this as "the conversation so far",
      // the model expects to reply to it.
      // HOWEVER, the `sendMessage` method sends a NEW user message.
      // If we pass a history ending in 'user' and then immediately call `sendMessage` (another user message),
      // we violate the User->Model->User flow.
      // Therefore, if the history ends in 'user', we remove it from the SDK context. 
      if (sdkHistory.length > 0 && sdkHistory[sdkHistory.length - 1].role === 'user') {
          sdkHistory.pop();
      }
  }

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: STUDENT_SYSTEM_INSTRUCTION,
    },
    history: sdkHistory,
  });
};

export const generateQuizQuestions = async (subject: string, topic: string, difficulty: string): Promise<QuizQuestion[]> => {
  const prompt = `Generate a quiz for a ${difficulty} level student studying ${subject}. The specific topic is "${topic}". Generate 5 multiple choice questions.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "A list of 4 possible answers"
              },
              correctAnswerIndex: { 
                type: Type.INTEGER, 
                description: "The index (0-3) of the correct answer in the options array" 
              },
              explanation: { 
                type: Type.STRING,
                description: "A short explanation of why the answer is correct"
              }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as QuizQuestion[];
    }
  } catch (e) {
    console.error("Failed to generate quiz", e);
  }
  return [];
};

export const summarizeNotes = async (content: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize the following study notes into key bullet points for quick revision:\n\n${content}`,
    });
    return response.text || "Could not generate summary.";
  } catch (e) {
    console.error("Summarization failed", e);
    return "Error generating summary.";
  }
};