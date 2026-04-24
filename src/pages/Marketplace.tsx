import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Plant } from '../types';
import { ShoppingBag, Loader2, ExternalLink, Leaf, Sparkles, TrendingUp } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface FertilizerRecommendation {
  name: string;
  brand: string;
  forPlant: string;
  benefits: string;
  estimatedPrice: string;
  buyLink: string;
  aiTip: string;
}

export default function Marketplace() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [fertilizers, setFertilizers] = useState<FertilizerRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchPlants = async () => {
      const isGuest = localStorage.getItem('isGuest') === 'true';
      const userId = auth.currentUser?.uid || (isGuest ? 'guest-123' : null);
      
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const plantsQuery = query(
          collection(db, 'plants'),
          where('ownerId', '==', userId)
        );
        const snapshot = await getDocs(plantsQuery);
        const plantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
        setPlants(plantsData);
        
        if (plantsData.length > 0) {
          getMarketplaceSuggestions(plantsData);
        } else {
          setLoading(false);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'plants');
        setLoading(false);
      }
    };

    fetchPlants();
  }, []);

  const getMarketplaceSuggestions = async (userPlants: Plant[]) => {
    setAnalyzing(true);
    const plantNames = userPlants.map(p => `${p.name} (${p.species})`).join(', ');
    
    try {
      const prompt = `Based on these plants in my garden: ${plantNames}, recommend 4-6 high-quality fertilizers available in the Indian market. 
      For each fertilizer, provide:
      1. Name of the fertilizer.
      2. A popular brand.
      3. Which of my plants it's best for.
      4. Key benefits.
      5. Estimated price range in Indian Rupees (INR) using the ₹ symbol.
      6. A local search link to buy it (Indian retailers).
      7. A unique AI tip on how to use it for the specific plants mentioned.
      Return the data as a clean JSON array.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                brand: { type: Type.STRING },
                forPlant: { type: Type.STRING },
                benefits: { type: Type.STRING },
                estimatedPrice: { type: Type.STRING },
                buyLink: { type: Type.STRING },
                aiTip: { type: Type.STRING },
              },
              required: ["name", "brand", "forPlant", "benefits", "estimatedPrice", "buyLink", "aiTip"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      setFertilizers(data);
    } catch (error) {
      console.error("AI Marketplace error:", error);
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-green-600 w-12 h-12 mb-4" />
        <p className="text-stone-500 animate-pulse font-medium">Curating your personalized marketplace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-2 rounded-xl text-green-700">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-[0.2em]">Smart Marketplace</span>
          </div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">Fertilizers</h1>
          <p className="text-stone-500 mt-2 max-w-lg">
            Nutrients perfectly matched to your specific plant collection, curated by GrowMate AI.
          </p>
        </div>
      </header>

      {plants.length === 0 ? (
        <div className="bg-white rounded-[3rem] border-2 border-dashed border-stone-200 p-16 text-center shadow-sm">
          <div className="bg-stone-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <Leaf className="text-stone-300 w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-4">Your Marketplace is Ready</h2>
          <p className="text-stone-500 mb-10 max-w-sm mx-auto leading-relaxed">
            Add your plants to the dashboard first, and we'll automatically generate a customized fertilizer catalog for you.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/add-plant'}
            className="bg-green-600 text-white px-10 py-5 rounded-3xl font-black text-lg hover:bg-green-700 transition-all shadow-2xl shadow-green-100 uppercase tracking-wider"
          >
            Add Your Plants
          </motion.button>
        </div>
      ) : (
        <>
          {analyzing && (
            <div className="bg-green-600/5 backdrop-blur-sm border border-green-100 rounded-3xl p-6 flex items-center gap-4 animate-pulse">
              <div className="bg-green-600 p-2 rounded-xl shadow-lg ring-4 ring-green-50">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-green-900">AI Nutrient Discovery</p>
                <p className="text-xs text-green-700">Analyzing {plants.length} species for optimal growth matches...</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {fertilizers.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="bg-white rounded-[3rem] border border-stone-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl hover:border-green-100 transition-all duration-500"
              >
                <div className="p-8 md:p-10 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-8">
                    <div className="bg-stone-50 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
                      {item.brand}
                    </div>
                    <div className="text-green-600 font-black text-lg">
                      {item.estimatedPrice}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-stone-900 mb-3 leading-tight group-hover:text-green-700 transition-colors">{item.name}</h3>
                  <div className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-50/50 px-4 py-2 rounded-xl w-fit">
                    <TrendingUp className="w-3 h-3" />
                    For: {item.forPlant}
                  </div>

                  <p className="text-stone-500 text-sm leading-relaxed mb-8 flex-1">
                    {item.benefits}
                  </p>

                  <div className="bg-stone-50/50 group-hover:bg-green-50/30 rounded-3xl p-6 relative overflow-hidden border border-stone-50 transition-colors">
                    <Sparkles className="absolute -right-4 -top-4 w-20 h-20 text-green-500/5" />
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-green-500" />
                      AI Insight
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed font-medium">
                      {item.aiTip}
                    </p>
                  </div>
                </div>

                <div className="px-8 pb-8 md:px-10 md:pb-10 mt-auto">
                  <a
                    href={item.buyLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-stone-900 text-white py-5 rounded-[2rem] font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-stone-100 group-hover:shadow-green-100"
                  >
                    Get it Now
                    <ExternalLink className="w-5 h-5 opacity-50" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
