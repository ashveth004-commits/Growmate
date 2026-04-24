import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Sparkles, Loader2, RefreshCw, Trash2, Sprout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import VoiceInput from '../components/VoiceInput';
import { getFarmerGPTResponse } from '../services/geminiService';
import { useTranslation } from '../context/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function FarmerGPT() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getFarmerGPTResponse(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || "I'm sorry, I couldn't process that request.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Error: I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-100">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-stone-900 tracking-tight">{t('farmer_gpt')}</h1>
            <p className="text-xs font-bold text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {t('ai_agri_expert')}
            </p>
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="p-3 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title={t('clear_chat')}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-stone-50/30"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-green-50 flex items-center justify-center text-green-600 mb-6">
                <Sprout className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-stone-900 mb-2">{t('how_can_help_farm')}</h2>
              <p className="text-stone-500 font-medium">{t('gpt_placeholder_msg')}</p>
              
              <div className="grid grid-cols-1 gap-3 w-full mt-8">
                {[
                  "What's the best crop for summer in red soil?",
                  "How to treat yellow spots on tomato leaves?",
                  "Best organic fertilizer for wheat?"
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-4 bg-white border border-stone-200 rounded-2xl text-left text-sm font-semibold text-stone-700 hover:border-green-500 hover:bg-green-50/50 transition-all shadow-sm"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "flex items-start gap-4",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                  message.role === 'user' ? "bg-stone-900 text-white" : "bg-green-600 text-white"
                )}>
                  {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={cn(
                  "max-w-[80%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm",
                  message.role === 'user' 
                    ? "bg-white border border-stone-200 text-stone-900 rounded-tr-none" 
                    : "bg-white border border-stone-100 text-stone-900 rounded-tl-none"
                )}>
                  <div className="markdown-body">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  <p className={cn(
                    "text-[10px] uppercase tracking-wider font-bold mt-2",
                    message.role === 'user' ? "text-stone-400" : "text-green-600/50"
                  )}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))
          )}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-stone-100 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t('gpt_thinking')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-6 border-t border-stone-100 bg-white">
        <div className="flex items-end gap-4 max-w-4xl mx-auto">
          <VoiceInput 
            onResult={(text) => setInput(prev => prev + (prev ? ' ' : '') + text)}
            placeholder={t('speak_query')}
            className="mb-1"
          />
          <div className="flex-1 relative">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t('ask_anything_farming')}
              className="w-full bg-stone-50 border border-stone-200 rounded-3xl px-6 py-4 pr-12 text-sm font-semibold text-stone-900 outline-none focus:border-green-500 focus:bg-white transition-all resize-none shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 bottom-3 p-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg shadow-green-100"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
