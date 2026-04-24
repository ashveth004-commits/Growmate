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

export async function generateWeatherSuggestions(weather: any, plants: Plant[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Given the current weather data: ${JSON.stringify(weather)} 
    and the user's plant collection: ${JSON.stringify(plants.map(p => ({ name: p.name, species: p.species, isIndoor: p.isIndoor, location: p.location })))}
    
    Generate specific care suggestions in JSON format:
    - watering: string (how to adjust watering for these plants based on humidity/rain/temp)
    - fertilizing: string (is it a good time to fertilize? consider temp and season)
    - diseaseRisk: { level: string, description: string } (risk of pests or fungus based on humidity/temp)
    - generalTip: string (one actionable tip for today)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          watering: { type: Type.STRING },
          fertilizing: { type: Type.STRING },
          diseaseRisk: {
            type: Type.OBJECT,
            properties: {
              level: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["level", "description"]
          },
          generalTip: { type: Type.STRING }
        },
        required: ["watering", "fertilizing", "diseaseRisk", "generalTip"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function predictCropYield(input: any, weather: any) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Predict the crop yield and profit for the following parameters:
    - Land Size: ${input.landSize} ${input.landUnit}
    - Crop Type: ${input.cropType}
    - Current Weather Context: ${JSON.stringify(weather)}
    
    Provide a detailed prediction in JSON format:
    - expectedYield: string (e.g. "150-200 kg")
    - expectedYieldValue: number (the mean value)
    - yieldUnit: string (e.g. "kg")
    - profitEstimation: string (a summary of profit potential)
    - estimatedRevenue: number (in USD)
    - estimatedCosts: number (in USD)
    - factors: string[] (list of factors affecting this prediction like soil, weather, etc.)
    - recommendations: string[] (list of actionable steps to maximize yield)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          expectedYield: { type: Type.STRING },
          expectedYieldValue: { type: Type.NUMBER },
          yieldUnit: { type: Type.STRING },
          profitEstimation: { type: Type.STRING },
          estimatedRevenue: { type: Type.NUMBER },
          estimatedCosts: { type: Type.NUMBER },
          factors: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["expectedYield", "expectedYieldValue", "yieldUnit", "profitEstimation", "estimatedRevenue", "estimatedCosts", "factors", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function refineFarmerVoiceInput(rawTranscript: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert agricultural assistant. Your task is to process a farmer's voice-to-text transcript.
    - Fix all spelling and grammatical errors.
    - Interpret rural, informal, or regional agricultural terminology correctly (e.g., specific pesticide names, local units, or dialect-specific names for plant diseases).
    - Convert it into clear, professional, yet simple text.
    - CRITICAL: Do NOT change the original meaning or intent of the farmer.
    
    Raw transcript: "${rawTranscript}"
    
    Provide the refined text in JSON format:
    - refinedText: string`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          refinedText: { type: Type.STRING }
        },
        required: ["refinedText"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return data.refinedText || rawTranscript;
}

export async function getFarmerGPTResponse(message: string) {
  const systemInstruction = `You are Farmer GPT, an expert agricultural consultant with decades of experience in farming, horticulture, and plant science. 
  Your goal is to help farmers and gardeners with:
  1. Crop selection based on season and region.
  2. Soil health and preparation.
  3. Pest and disease identification and management.
  4. Irrigation strategies.
  5. Sustainable and organic farming practices.
  6. Market trends and agricultural technology.
  
  Keep your tone professional, advisory, and respectful of local farming traditions while providing modern scientific insights. 
  If a question is not about agriculture, gardening, or plants, politely redirect the user back to farming topics.`;

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text;
}
