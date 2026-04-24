export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

export interface Plant {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  isIndoor: boolean;
  plantationDate: string;
  location: string;
  potSize?: string;
  photoUrl?: string;
  age?: string;
  expectedLifespan?: string;
  healthStatus?: string;
  description?: string;
  careGuide?: CareGuide;
  fertilizerTimeline?: FertilizerEvent[];
}

export interface CareGuide {
  watering: string;
  sunlight: string;
  temperature: string;
  humidity: string;
  soil: string;
  repotting: string;
}

export interface FertilizerEvent {
  name: string;
  quantity: string;
  schedule: string;
  nextDate: string;
}

export interface CareSchedule {
  id: string;
  plantId: string;
  type: 'watering' | 'fertilizing' | 'repotting' | 'pruning';
  frequency: string;
  nextDate: string;
  reminderEnabled: boolean;
}

export interface FertilizerLog {
  id: string;
  plantId: string;
  date: string;
  fertilizerName: string;
  quantity: string;
  status: 'applied' | 'skipped' | 'snoozed';
  fertilizerType: 'Liquid' | 'Granular' | 'Slow-Release' | 'Organic';
  notes?: string;
}

export interface WateringLog {
  id: string;
  plantId: string;
  date: string;
  status: string;
}

export interface HealthIssue {
  id: string;
  plantId: string;
  date: string;
  issueType: string;
  description: string;
  possibleCause: string;
  suggestedSolution: string;
  riskLevel?: string;
  status: 'resolved' | 'ongoing';
}

export interface TimelineEvent {
  id: string;
  plantId: string;
  date: string;
  type: string;
  description: string;
}

export interface AIInsight {
  id: string;
  plantId: string;
  date: string;
  type: 'prediction' | 'tip' | 'alert';
  content: string;
}

export interface GrowthLog {
  id: string;
  plantId: string;
  date: string;
  height: number;
  foliage: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  isRaining: boolean;
  windSpeed: number;
}

export interface WeatherSuggestion {
  watering: string;
  fertilizing: string;
  diseaseRisk: {
    level: 'Low' | 'Medium' | 'High';
    description: string;
  };
  generalTip: string;
}

export interface CropPredictionInput {
  landSize: number;
  landUnit: 'acres' | 'hectares' | 'sqft';
  cropType: string;
  weatherContext?: string;
}

export interface CropPredictionResult {
  expectedYield: string;
  expectedYieldValue: number;
  yieldUnit: string;
  profitEstimation: string;
  currencySymbol: string;
  estimatedRevenue: number;
  estimatedCosts: number;
  factors: string[];
  recommendations: string[];
}
