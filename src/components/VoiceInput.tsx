import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { refineFarmerVoiceInput } from '../services/geminiService';
import { cn } from '../lib/utils';

interface VoiceInputProps {
  onResult: (text: string) => void;
  className?: string;
  placeholder?: string;
}

export default function VoiceInput({ onResult, className, placeholder = "Speak now..." }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const onResultRef = useRef(onResult);

  // Update ref when onResult changes
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-IN'; // Default to Indian English, though AI will handle dialects

      recog.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setIsProcessing(true);
        setError(null);

        try {
          const refinedText = await refineFarmerVoiceInput(transcript);
          onResultRef.current(refinedText);
        } catch (err) {
          console.error("AI Refinement error:", err);
          onResultRef.current(transcript); // Fallback to raw transcript
        } finally {
          setIsProcessing(false);
        }
      };

      recog.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setError("Could not hear you clearly. Please try again.");
      };

      recog.onend = () => {
        setIsListening(false);
      };

      setRecognition(recog);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setError(null);
      recognition.start();
      setIsListening(true);
    }
  }, [recognition, isListening]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleListening}
        disabled={isProcessing}
        className={cn(
          "p-3 rounded-full transition-all duration-300 relative",
          isListening ? "bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse" : 
          isProcessing ? "bg-stone-100 text-stone-400" :
          "bg-green-600 text-white shadow-lg shadow-green-100 hover:bg-green-700"
        )}
        title={isListening ? "Stop Listening" : "Start Voice Input"}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}

        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-xl shadow-xl border border-stone-100 flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3 text-green-500" />
              <span className="text-[10px] font-black text-stone-600 uppercase tracking-wider">AI Refining...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      
      <AnimatePresence>
        {(isListening || error) && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="ml-3 pointer-events-none"
          >
            {error ? (
              <span className="text-xs font-bold text-red-500">{error}</span>
            ) : (
              <span className="text-xs font-bold text-green-600 animate-pulse">{placeholder}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
