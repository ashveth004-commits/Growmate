import { GoogleGenAI, Type } from "@google/genai";
import { Plant, CareGuide, FertilizerEvent } from "../types";

// Always initialize with the key from process.env.GEMINI_API_KEY
// In AI Studio Build, this is automatically provided via define in vite.config.ts
const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "") {
    // We don't throw here to avoid crashing at module load, but we should handle it in calls
    return "";
  }
  return key;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

function ensureApiKey() {
  const key = getApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY is missing. If you are on Vercel, please add it to your Environment Variables.");
  }
}

/**
 * Simple caching logic using sessionStorage
 * This helps avoid repeated AI calls for the same data within the same session.
 */
function getCachedData(key: string) {
  try {
    const cached = sessionStorage.getItem(`gm_cache_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache valid for 30 minutes
      if (Date.now() - timestamp < 30 * 60 * 1000) {
        return data;
      }
    }
  } catch (e) {
    console.warn("Cache read error:", e);
  }
  return null;
}

function setCachedData(key: string, data: any) {
  try {
    sessionStorage.setItem(`gm_cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("Cache write error:", e);
  }
}

function isQuotaError(err: any): boolean {
  const msg = err.message || "";
  const status = err.status || "";
  const code = err.code || "";
  
  const errString = typeof err === 'string' ? err : JSON.stringify(err);
  
  return (
    msg.includes("RESOURCE_EXHAUSTED") || 
    msg.includes("429") || 
    msg.includes("quota") ||
    status === "RESOURCE_EXHAUSTED" ||
    code === 429 ||
    errString.includes("RESOURCE_EXHAUSTED") ||
    errString.includes("429")
  );
}

function isApiDisabledError(err: any): boolean {
  const msg = err.message || "";
  const errString = typeof err === 'string' ? err : JSON.stringify(err);
  return (
    msg.includes("Gemini API has not been used") || 
    msg.includes("disabled") ||
    errString.includes("PERMISSION_DENIED") ||
    errString.includes("403")
  );
}

function handleAIError(err: any): string {
  if (isQuotaError(err)) {
    return "AI processing limit reached. Please try again in 60 seconds.";
  }
  if (isApiDisabledError(err)) {
    return "Gemini API is not enabled for this project. If you are on Vercel, please ensure 'Generative Language API' is enabled in your Google Cloud Console for the API key project.";
  }
  return "An error occurred while communicating with the AI. Please try again.";
}

function parseAIJSON(text: string) {
  try {
    let cleanText = text || "{}";
    if (cleanText.includes("```json")) {
      cleanText = cleanText.split("```json")[1].split("```")[0].trim();
    } else if (cleanText.includes("```")) {
      cleanText = cleanText.split("```")[1].split("```")[0].trim();
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("AI JSON Parse Error:", e, "Raw text:", text);
    throw new Error("Failed to parse AI response. Please try again.");
  }
}

export async function generatePlantProfile(species: string, plantationDate: string) {
  ensureApiKey();
  const cacheKey = `plant_profile_${species}_${plantationDate}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
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

    const data = parseAIJSON(response.text || "{}");
    setCachedData(cacheKey, data);
    return data;
  } catch (err: any) {
    console.error("Plant profile generation error:", err);
    
    const fallbackData = {
      expectedLifespan: "Unknown",
      description: handleAIError(err),
      careGuide: { watering: "N/A", sunlight: "N/A", temperature: "N/A", humidity: "N/A", soil: "N/A", repotting: "N/A" },
      fertilizerTimeline: [],
      growthExpectations: "Information currently unavailable.",
      seasonalCareTips: "Information currently unavailable."
    };
    
    return fallbackData;
  }
}

export async function diagnosePlantProblem(species: string, issueDescription: string) {
  ensureApiKey();
  try {
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

    return parseAIJSON(response.text || "{}");
  } catch (err: any) {
    console.error("Diagnosis error:", err);
    return {
      possibleCause: "AI Diagnostics Error",
      suggestedSolution: handleAIError(err),
      riskLevel: "medium"
    };
  }
}

export async function getPlantChatResponse(plant: Plant, message: string, history: { role: string, parts: { text: string }[] }[]) {
  ensureApiKey();
  const systemInstruction = `You are a professional plant care assistant for a specific plant: ${plant.name} (${plant.species}).
  Plant Context:
  - Location: ${plant.location} (${plant.isIndoor ? 'Indoor' : 'Outdoor'})
  - Age: ${plant.age}
  - Health Status: ${plant.healthStatus}
  - Care Guide: ${JSON.stringify(plant.careGuide)}
  - Fertilizer Schedule: ${JSON.stringify(plant.fertilizerTimeline)}
  
  Answer the user's questions about this specific plant using the provided context. Be helpful, encouraging, and accurate.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction,
      }
    });

    return response.text;
  } catch (err: any) {
    console.error("Chat response error:", err);
    return handleAIError(err);
  }
}

export async function getPlantChatResponseStream(plant: Plant, message: string, onChunk: (text: string) => void) {
  ensureApiKey();
  const systemInstruction = `You are a professional plant care assistant for a specific plant: ${plant.name} (${plant.species}).
  Plant Context:
  - Location: ${plant.location} (${plant.isIndoor ? 'Indoor' : 'Outdoor'})
  - Age: ${plant.age}
  - Health Status: ${plant.healthStatus}
  - Care Guide: ${JSON.stringify(plant.careGuide)}
  - Fertilizer Schedule: ${JSON.stringify(plant.fertilizerTimeline)}
  
  Answer the user's questions about this specific plant using the provided context. Be helpful, encouraging, and accurate.`;

  try {
    const result = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction,
      }
    });

    for await (const chunk of result) {
      onChunk(chunk.text || "");
    }
  } catch (err: any) {
    console.error("Chat Stream error:", err);
    onChunk(handleAIError(err));
  }
}

export async function generateWeatherSuggestions(weather: any, plants: Plant[]) {
  ensureApiKey();
  // Generate a cache key based on basic weather and plant collection
  const plantFingerprint = plants.map(p => p.species).sort().join(",");
  const weatherFingerprint = `${weather.temperature}_${weather.humidity}_${weather.conditionCode}`;
  const cacheKey = `weather_suggestions_${weatherFingerprint}_${plantFingerprint}`;
  
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
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

    const data = parseAIJSON(response.text || "{}");
    setCachedData(cacheKey, data);
    return data;
  } catch (err: any) {
    console.error("Weather Suggestion error:", err);
    if (isQuotaError(err)) {
      return {
        watering: "Adjust watering based on observed soil moisture.",
        fertilizing: "Fertilize if current conditions are mild.",
        diseaseRisk: { level: "Unknown", description: "AI analysis limit reached. Observe leaves for spots or pests manually." },
        generalTip: "Keep an eye on the local weather forecast and adjust care as needed."
      };
    }
    throw err;
  }
}

export async function predictCropYield(input: any, weather: any, location: { lat: number, lng: number } | null) {
  ensureApiKey();
  const cacheKey = `crop_yield_${input.cropType}_${input.landSize}_${input.landUnit}_${weather?.temperature_2m || 'noweather'}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const prompt = `Predict the crop yield and profit potential for the following parameters:
    - Land Size: ${input.landSize} ${input.landUnit}
    - Crop Type: ${input.cropType}
    - Location: ${location ? `Latitude ${location.lat}, Longitude ${location.lng}` : 'Unknown'}
    - Current Weather Data: ${weather ? JSON.stringify(weather) : 'Unavailable'}
    
    CRITICAL: Provide realistic, region-specific data based on the geographical location if known. 
    If the location is in India, use INR (₹) as the currency symbol and local market logic. 
    Otherwise, use USD ($).
    
    Ensure all number fields are actual numbers, not strings.
    The response MUST be a single, valid JSON object following this structure:
    - expectedYield: string (e.g. "150-200 kg" or "10-12 tons")
    - expectedYieldValue: number (the numeric representation of the yield mean)
    - yieldUnit: string (e.g. "kg", "tons", "quintals")
    - profitEstimation: string (a concise 2-3 sentence summary of profit potential and market outlook)
    - currencySymbol: string (e.g. "₹" or "$")
    - estimatedRevenue: number (total estimated revenue value)
    - estimatedCosts: number (total estimated production costs value)
    - factors: string[] (list 4-5 key factors affecting this prediction)
    - recommendations: string[] (list 4-5 actionable steps the farmer should take)`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            expectedYield: { type: Type.STRING },
            expectedYieldValue: { type: Type.NUMBER },
            yieldUnit: { type: Type.STRING },
            profitEstimation: { type: Type.STRING },
            currencySymbol: { type: Type.STRING },
            estimatedRevenue: { type: Type.NUMBER },
            estimatedCosts: { type: Type.NUMBER },
            factors: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: [
            "expectedYield", 
            "expectedYieldValue", 
            "yieldUnit", 
            "profitEstimation", 
            "currencySymbol", 
            "estimatedRevenue", 
            "estimatedCosts", 
            "factors", 
            "recommendations"
          ]
        }
      }
    });

    const text = result.text;
    if (!text) throw new Error("AI returned empty response");
    const data = parseAIJSON(text);
    setCachedData(cacheKey, data);
    return data;
  } catch (err: any) {
    console.error("Failed to predict crop yield:", err);
    throw new Error(handleAIError(err));
  }
}

export async function refineFarmerVoiceInput(rawTranscript: string) {
  ensureApiKey();
  try {
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

    const data = parseAIJSON(response.text || "{}");
    return data.refinedText || rawTranscript;
  } catch (err: any) {
    console.error("Voice refinement error:", err);
    if (isQuotaError(err)) {
      return rawTranscript; // Just return unrefined text as fallback
    }
    throw err;
  }
}

export async function getFarmerGPTResponse(message: string) {
  ensureApiKey();
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction,
      }
    });

    return response.text;
  } catch (err: any) {
    console.error("FarmerGPT response error:", err);
    return handleAIError(err);
  }
}

export async function getFarmerGPTResponseStream(message: string, onChunk: (text: string) => void) {
  ensureApiKey();
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

  try {
    const result = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction,
      }
    });

    for await (const chunk of result) {
      onChunk(chunk.text || "");
    }
  } catch (err: any) {
    console.error("FarmerGPT Stream error:", err);
    onChunk(handleAIError(err));
  }
}

export async function getPestTreatmentStream(query: string, onChunk: (text: string) => void) {
  ensureApiKey();
  const systemInstruction = `You are a specialist in agricultural pest and disease management. 
  Your primary task is to identify pests/diseases and provide detailed treatment methods including:
  1. Identification (physical description/symptoms).
  2. Affected crops.
  3. Chemical control methods (pesticides/fungicides).
  4. Organic/Traditional control methods.
  5. Preventive measures.
  
  Format your response clearly using markdown with headings, lists, and bold text for key terms. 
  Keep advice practical and safe. If you recommend chemicals, emphasize safety protocols.`;

  try {
    const result = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction,
      }
    });

    for await (const chunk of result) {
      onChunk(chunk.text || "");
    }
  } catch (err: any) {
    console.error("Pest Treatment Stream error:", err);
    onChunk(handleAIError(err));
  }
}

