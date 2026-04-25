import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Search, Mic, Send, ChevronDown, ChevronUp, Bug, Sparkles } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { getPestTreatmentStream } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface PestInfo {
  id: string;
  name: string;
  crops: string;
  icon: string;
  details: string;
}

const PESTS: PestInfo[] = [
  {
    id: 'stem-borer',
    name: 'Stem Borer',
    crops: 'Rice, Maize',
    icon: '🐛',
    details: 'Stem borers are the most serious pests of maize in sub-Saharan Africa. They can cause yield losses of 20-40% or even total crop failure. \n\n**Symptoms:** \n* Small holes in leaves \n* Dead heart in young plants \n* Frass (droppings) near holes \n\n**Management:** \n* Use resistant varieties \n* Intercropping with silver leaf desmodium \n* Application of Neem-based pesticides'
  },
  {
    id: 'aphids',
    name: 'Aphids',
    crops: 'Wheat, Mustard, Vegetables',
    icon: '🪲',
    details: 'Aphids are small sap-sucking insects that can weaken plants and transmit viral diseases. \n\n**Symptoms:** \n* Curling or yellowing of leaves \n* Sticky honeydew on plant surfaces \n* Presence of ants around the plant \n\n**Management:** \n* Spraying with water to dislodge them \n* Use of ladybugs as natural predators \n* Neem oil spray or soap-water solution'
  },
  {
    id: 'bollworm',
    name: 'Bollworm',
    crops: 'Cotton, Chickpea, Tomato',
    icon: '🦗',
    details: 'Bollworms are a major threat to cotton and leguminous crops, feeding directly on the fruiting parts. \n\n**Symptoms:** \n* Large holes in bolls/pods \n* Shedding of flowers and bolls \n* Larvae visible on the plant \n\n**Management:** \n* Pheromone traps for monitoring \n* Spraying BT (Bacillus thuringiensis) \n* Manual collection of larvae in small farms'
  },
  {
    id: 'whitefly',
    name: 'Whitefly',
    crops: 'Cotton, Vegetables, Soybean',
    icon: '🦋',
    details: 'Whiteflies suck plant juices and are notorious for transmitting the Leaf Curl Virus. \n\n**Symptoms:** \n* Clouds of tiny white insects when disturbed \n* Yellowing and wilting of leaves \n* Black sooty mold on honeydew \n\n**Management:** \n* Yellow sticky traps \n* Avoid excessive nitrogen fertilizers \n* Use of Imidacloprid for severe infestations'
  }
];

export default function KnowledgeBase() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const handleAiSearch = async () => {
    if (!aiQuery.trim() || isAiLoading) return;

    setIsAiLoading(true);
    setAiResponse('');
    
    try {
      await getPestTreatmentStream(aiQuery, (chunk) => {
        setAiResponse(prev => prev + chunk);
      });
    } catch (error) {
      console.error("AI Search Error:", error);
      setAiResponse("Sorry, I couldn't fetch the information at this moment. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredPests = PESTS.filter(pest => 
    pest.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    pest.crops.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-[#1e3a2c]" />
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            {t('pest_treatment_guide')}
          </h1>
        </div>
        <p className="text-stone-500 font-medium">
          {t('search_pests_desc')}
        </p>
      </header>

      {/* AI Search Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#fcfaf7] border border-stone-200 rounded-[2rem] p-8 shadow-sm space-y-6"
      >
        <div className="flex items-center gap-3 text-stone-900 font-bold">
          <Sparkles className="w-5 h-5 text-green-600" />
          <span>{t('ask_ai_pest')}</span>
        </div>
        
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative group">
            <input 
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
              placeholder="e.g., How to treat rust in wheat?"
              className="w-full pl-5 pr-5 py-4 bg-[#f8f6f3] border border-stone-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/10 transition-all text-stone-900"
            />
          </div>
          <button className="p-4 bg-[#f8f6f3] text-stone-400 hover:text-green-600 hover:bg-stone-100 rounded-2xl transition-all">
            <Mic className="w-6 h-6" />
          </button>
          <button 
            onClick={handleAiSearch}
            disabled={isAiLoading || !aiQuery.trim()}
            className="bg-[#94b49f]/90 hover:bg-[#94b49f] disabled:bg-stone-300 text-white p-4 rounded-2xl transition-all shadow-lg shadow-green-900/5 feedback-active"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>

        <AnimatePresence>
          {aiResponse && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-6 bg-white border border-green-100 rounded-xl prose prose-stone prose-sm max-w-none"
            >
              <ReactMarkdown>{aiResponse}</ReactMarkdown>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Manual Search Section */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-green-600 transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <input 
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Search pests, crops..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-stone-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/5 transition-all"
        />
      </div>

      {/* Quick Reference Guide */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-stone-500 tracking-tight px-1">
          {t('quick_reference_guide')}
        </h2>
        
        <div className="space-y-4">
          {filteredPests.map((pest) => (
            <div 
              key={pest.id}
              className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden hover:border-green-100 transition-all duration-300"
            >
              <button 
                onClick={() => setExpandedId(expandedId === pest.id ? null : pest.id)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-stone-50/50 transition-colors"
              >
                <div className="flex items-center gap-5">
                  <div className="text-3xl bg-stone-50/50 w-16 h-16 flex items-center justify-center rounded-2xl border border-stone-50">
                    {pest.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 transition-colors">{pest.name}</h3>
                    <p className="text-sm text-stone-400 font-medium">{pest.crops}</p>
                  </div>
                </div>
                <div className={cn(
                  "p-2 rounded-lg transition-all",
                  expandedId === pest.id ? "bg-green-50 text-green-600 rotate-180" : "text-stone-300"
                )}>
                  <ChevronDown className="w-6 h-6" />
                </div>
              </button>

              <AnimatePresence>
                {expandedId === pest.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-stone-50"
                  >
                    <div className="p-6 bg-stone-50/30 prose prose-stone prose-sm max-w-none">
                      <ReactMarkdown>{pest.details}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {filteredPests.length === 0 && (
            <div className="py-12 text-center text-stone-500">
              <Bug className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p>No pests found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
