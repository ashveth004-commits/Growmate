import { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, Thermometer, Wind, AlertTriangle, Droplets, Sprout, Loader2, Sparkles } from 'lucide-react';
import { generateWeatherSuggestions } from '../services/geminiService';
import { Plant, WeatherSuggestion } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Props {
  plants: Plant[];
}

export default function WeatherAlerts({ plants }: Props) {
  const [weather, setWeather] = useState<any>(null);
  const [suggestion, setSuggestion] = useState<WeatherSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plants.length === 0) {
      setLoading(false);
      return;
    }

    const fetchWeatherAndSuggestions = async () => {
      try {
        setLoading(true);
        // 1. Get Location
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });

        const { latitude, longitude } = position.coords;

        // 2. Fetch Weather (Open-Meteo)
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m&timezone=auto`
        );
        const weatherData = await weatherRes.json();
        const current = weatherData.current;

        const simplifiedWeather = {
          temperature: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          isRaining: current.rain > 0 || current.showers > 0,
          windSpeed: current.wind_speed_10m,
          conditionCode: current.weather_code
        };

        setWeather(simplifiedWeather);

        // 3. Get AI Suggestions
        const aiSuggestions = await generateWeatherSuggestions(simplifiedWeather, plants);
        setSuggestion(aiSuggestions);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Could not fetch weather data. Please ensure location access is enabled.');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherAndSuggestions();
  }, [plants]);

  if (plants.length === 0) return null;

  return (
    <section className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-stone-50 bg-stone-50/50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-500" />
          Weather-Based Care
        </h2>
        {weather && (
          <div className="flex items-center gap-3 text-stone-500 text-sm font-medium">
            <span className="flex items-center gap-1">
              <Thermometer className="w-4 h-4" />
              {weather.temperature}°C
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="w-4 h-4" />
              {weather.humidity}%
            </span>
          </div>
        )}
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-stone-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm font-medium">Analyzing local weather conditions...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : suggestion ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-2">
                  <Droplets className="w-4 h-4" />
                  Watering
                </div>
                <p className="text-stone-700 text-sm leading-relaxed">{suggestion.watering}</p>
              </div>

              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase tracking-wider mb-2">
                  <Sprout className="w-4 h-4" />
                  Fertilizing
                </div>
                <p className="text-stone-700 text-sm leading-relaxed">{suggestion.fertilizing}</p>
              </div>

              <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Disease Risk: {suggestion.diseaseRisk.level}
                </div>
                <p className="text-stone-700 text-sm leading-relaxed">{suggestion.diseaseRisk.description}</p>
              </div>
            </div>

            <div className="bg-green-600 rounded-2xl p-4 text-white flex items-start gap-4 shadow-lg shadow-green-100">
              <div className="bg-white/20 p-2 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-green-100 mb-1">AI Daily Tip</p>
                <p className="text-sm font-medium leading-relaxed">{suggestion.generalTip}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
