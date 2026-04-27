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
  latitude?: number;
  longitude?: number;
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
  type: 'watering' | 'fertilizing' | 'repotting' | 'pruning' | 'other' | string;
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
  amount?: string;
  method?: string;
  notes?: string;
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

export interface FarmDiaryEntry {
  id: string;
  userId: string;
  title: string;
  date: string;
  category: 'Planting' | 'Fertilizing' | 'Harvesting' | 'Expense' | 'Irrigation' | 'Pest Control' | 'General';
  expense?: number;
  income?: number;
  notes?: string;
  createdAt: string;
}
