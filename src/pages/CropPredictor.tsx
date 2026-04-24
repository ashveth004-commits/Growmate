import { useState, useEffect } from 'react';
import { Sprout, TrendingUp, DollarSign, Cloud, Loader2, Sparkles, Map, AlertCircle, Info } from 'lucide-react';
import { predictCropYield } from '../services/geminiService';
import { CropPredictionInput, CropPredictionResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTranslation } from '../context/LanguageContext';

export default function CropPredictor() {
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [result, setResult] = useState<CropPredictionResult | null>(null);
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CropPredictionInput>({
    landSize: 1,
    landUnit: 'acres',
    cropType: '',
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeather(null);
        
        let latitude = 19.0760; // Default: Mumbai
        let longitude = 72.8777;

        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              timeout: 5000,
              enableHighAccuracy: false
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          setLocation({ lat: latitude, lng: longitude });
        } catch (locationErr) {
          console.warn('Geolocation failed, using fallback location:', locationErr);
          setLocation({ lat: latitude, lng: longitude }); // Fallback
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
        const weatherRes = await fetch(url).catch(err => {
          console.error('Weather fetch error:', err);
          return null;
        });

        if (weatherRes && weatherRes.ok) {
          const data = await weatherRes.json();
          setWeather(data.current);
        }
      } catch (err) {
        console.error('Weather component error:', err);
      }
    };
    fetchWeather();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const prediction = await predictCropYield(formData, weather, location);
      setResult(prediction);
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{t('crop_yield_predictor_title')}</h1>
        <p className="text-stone-50 mt-1">{t('crop_predictor_desc')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2rem] border border-stone-100 shadow-sm p-8 h-fit"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 ml-1">{t('crop_type')}</label>
              <div className="relative">
                <Sprout className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input
                  required
                  type="text"
                  placeholder="e.g. Wheat, Tomatoes, Corn"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                  value={formData.cropType}
                  onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 ml-1">{t('land_size')}</label>
                <div className="relative">
                  <Map className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input
                    required
                    type="number"
                    step="0.1"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                    value={formData.landSize}
                    onChange={(e) => setFormData({ ...formData, landSize: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 ml-1">{t('unit')}</label>
                <select
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none bg-white"
                  value={formData.landUnit}
                  onChange={(e) => setFormData({ ...formData, landUnit: e.target.value as any })}
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="sqft">Sq Ft</option>
                </select>
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-start gap-3">
              <Cloud className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-stone-900 uppercase tracking-wider">{t('weather_context')}</p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {weather 
                    ? `Current: ${weather.temperature_2m}°C, ${weather.relative_humidity_2m}% Humidity. This will be used to refine the prediction.`
                    : 'Fetching local weather to improve prediction accuracy...'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-lg shadow-stone-100 flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {t('calculating_prediction')}
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  {t('predict_btn')}
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Results Section */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 bg-stone-50/50 rounded-[2rem] border-2 border-dashed border-stone-200"
              >
                <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  <TrendingUp className="text-stone-300 w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-2">{t('ready_to_analyze')}</h3>
                <p className="text-stone-500 text-sm max-w-xs">
                  Fill in your land details and crop type to see AI-powered yield and profit estimations.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Yield Card */}
                <div className="bg-green-600 rounded-[2rem] p-8 text-white shadow-xl shadow-green-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Sprout className="w-6 h-6" />
                    </div>
                    <span className="font-bold uppercase tracking-widest text-xs text-green-100">{t('expected_yield')}</span>
                  </div>
                  <div className="text-5xl font-black mb-2">{result.expectedYield}</div>
                  <p className="text-green-50 text-sm leading-relaxed opacity-90">
                    Estimated total harvest for {formData.landSize} {formData.landUnit} of {formData.cropType}.
                  </p>
                </div>

                {/* Profit Card */}
                <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-stone-100 p-2 rounded-xl">
                      <DollarSign className="w-6 h-6 text-stone-900" />
                    </div>
                    <span className="font-bold uppercase tracking-widest text-xs text-stone-500">{t('profit_estimation_label')}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">{t('est_revenue')}</p>
                      <p className="text-2xl font-bold text-stone-900">{result.currencySymbol}{result.estimatedRevenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">{t('est_costs')}</p>
                      <p className="text-2xl font-bold text-stone-900">{result.currencySymbol}{result.estimatedCosts.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mb-8 p-6 bg-stone-900 rounded-2xl text-white">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Estimated Net Profit</p>
                    <p className={cn(
                      "text-3xl font-black",
                      (result.estimatedRevenue - result.estimatedCosts) >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {result.currencySymbol}{(result.estimatedRevenue - result.estimatedCosts).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <p className="text-sm font-medium text-stone-700 leading-relaxed">
                      {result.profitEstimation}
                    </p>
                  </div>
                </div>

                {/* Factors & Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-3xl border border-stone-100 p-6">
                    <h4 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      {t('key_factors')}
                    </h4>
                    <ul className="space-y-2">
                      {result.factors.map((factor, i) => (
                        <li key={i} className="text-xs text-stone-600 flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-stone-300 mt-1.5 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white rounded-3xl border border-stone-100 p-6">
                    <h4 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      {t('ai_recommendations')}
                    </h4>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-stone-600 flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
