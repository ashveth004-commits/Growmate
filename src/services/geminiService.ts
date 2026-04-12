import { GoogleGenAI, Type } from "@google/genai";
import { Plant, CareGuide, FertilizerEvent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generatePlantProfile(species: string, plantationDate: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a detailed plant care profile for the species: ${species}. The plant was planted on ${plantationDate}.
    Provide the following in JSON format:
    - expectedLifespan: string (e.g., "10-15 years")
    - description: string (short AI description)
    - careGuide: { watering: string, sunlight: string, temperature: string, humidity: string, soil: string, repotting: string }
    - fertilizerTimeline: Array<{ name: string, quantity: string, schedule: string, nextDate: string }>
    - growthExpectations: string
    - seasonalCareTips: string`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          expectedLifespan: { type: Type.STRING },
          description: { type: Type.STRING },
          careGuide: {
            type: Type.OBJECT,
            properties: {
              watering: { type: Type.STRING },
              sunlight: { type: Type.STRING },
              temperature: { type: Type.STRING },
              humidity: { type: Type.STRING },
              soil: { type: Type.STRING },
              repotting: { type: Type.STRING }
            },
            required: ["watering", "sunlight", "temperature", "humidity", "soil", "repotting"]
          },
          fertilizerTimeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.STRING },
                schedule: { type: Type.STRING },
                nextDate: { type: Type.STRING }
              },
              required: ["name", "quantity", "schedule", "nextDate"]
            }
          },
          growthExpectations: { type: Type.STRING },
          seasonalCareTips: { type: Type.STRING }
        },
        required: ["expectedLifespan", "description", "careGuide", "fertilizerTimeline", "growthExpectations", "seasonalCareTips"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function diagnosePlantProblem(species: string, issueDescription: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Diagnose a plant problem for a ${species}. User description: "${issueDescription}".
    Provide the following in JSON format:
    - possibleCause: string
    - suggestedSolution: string
    - riskLevel: string (low, medium, high)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          possibleCause: { type: Type.STRING },
          suggestedSolution: { type: Type.STRING },
          riskLevel: { type: Type.STRING }
        },
        required: ["possibleCause", "suggestedSolution", "riskLevel"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function getPlantChatResponse(plant: Plant, message: string, history: { role: string, parts: { text: string }[] }[]) {
  const systemInstruction = `You are a professional plant care assistant for a specific plant: ${plant.name} (${plant.species}).
  Plant Context:
  - Location: ${plant.location} (${plant.isIndoor ? 'Indoor' : 'Outdoor'})
  - Age: ${plant.age}
  - Health Status: ${plant.healthStatus}
  - Care Guide: ${JSON.stringify(plant.careGuide)}
  - Fertilizer Schedule: ${JSON.stringify(plant.fertilizerTimeline)}
  
  Answer the user's questions about this specific plant using the provided context. Be helpful, encouraging, and accurate.`;

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
    }
  });

  // Since chat.sendMessage only accepts message, we might need to handle history differently if needed, 
  // but for a simple implementation we can just send the message.
  // If we want history, we'd need to pass it to ai.chats.create if the SDK supports it, or just use generateContent.
  
  const response = await chat.sendMessage({ message });
  return response.text;
}
