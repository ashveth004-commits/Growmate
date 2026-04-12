import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, query, orderBy, addDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Plant, TimelineEvent, HealthIssue, CareSchedule } from '../types';
import { diagnosePlantProblem, getPlantChatResponse } from '../services/geminiService';
import { 
  Leaf, Droplets, Sun, Thermometer, Wind, Sprout, 
  Calendar as CalendarIcon, History, MessageCircle, 
  AlertCircle, CheckCircle2, Plus, Send, Loader2,
  ChevronRight, ArrowLeft, Info, Sparkles, Edit2, X, Save, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

export default function PlantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'care' | 'timeline' | 'chat'>('overview');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    species: '',
    location: ''
  });
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Diagnosis State
  const [diagnosing, setDiagnosing] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');

  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const plantRef = doc(db, 'plants', id);
    const unsubscribePlant = onSnapshot(plantRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Plant;
        setPlant({ id: doc.id, ...data } as Plant);
        setEditForm({
          name: data.name,
          species: data.species,
          location: data.location
        });
      } else {
        navigate('/');
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `plants/${id}`));

    const timelineQuery = query(collection(db, `plants/${id}/timeline`), orderBy('date', 'desc'));
    const unsubscribeTimeline = onSnapshot(timelineQuery, (snapshot) => {
      setTimeline(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimelineEvent)));
    });

    const healthQuery = query(collection(db, `plants/${id}/healthIssues`), orderBy('date', 'desc'));
    const unsubscribeHealth = onSnapshot(healthQuery, (snapshot) => {
      setHealthIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthIssue)));
    });

    return () => {
      unsubscribePlant();
      unsubscribeTimeline();
      unsubscribeHealth();
    };
  }, [id]);

  const handleDiagnose = async () => {
    if (!plant || !issueDescription.trim()) return;
    setDiagnosing(true);
    try {
      const diagnosis = await diagnosePlantProblem(plant.species, issueDescription);
      
      const issueData = {
        plantId: plant.id,
        date: new Date().toISOString(),
        issueType: 'AI Diagnosis',
        description: issueDescription,
        ...diagnosis,
        status: 'ongoing'
      };

      await addDoc(collection(db, `plants/${plant.id}/healthIssues`), issueData);
      await addDoc(collection(db, `plants/${plant.id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Health Alert',
        description: `Logged a health issue: ${diagnosis.possibleCause}`
      });

      setIssueDescription('');
    } catch (error) {
      console.error('Diagnosis error:', error);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plant || !chatMessage.trim() || chatLoading) return;

    const userMsg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const response = await getPlantChatResponse(plant, userMsg, []);
      setChatHistory(prev => [...prev, { role: 'assistant', content: response || 'Sorry, I couldn\'t process that.' }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id || !plant) return;
    setSaving(true);
    try {
      const plantRef = doc(db, 'plants', id);
      await updateDoc(plantRef, {
        name: editForm.name,
        species: editForm.species,
        location: editForm.location
      });

      await addDoc(collection(db, `plants/${id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Details Updated',
        description: `Updated plant details: ${editForm.name} (${editForm.species}) at ${editForm.location}`
      });

      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `plants/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !plant) return;
    
    setLoading(true);
    try {
      const plantRef = doc(db, 'plants', id);
      await deleteDoc(plantRef);
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `plants/${id}`);
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Leaf className="animate-bounce text-green-600 w-12 h-12" /></div>;
  if (!plant) return null;

  return (
    <div className="space-y-6 pb-20">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden">
        <div className="h-48 bg-stone-100 relative">
          <img 
            src={plant.photoUrl || `https://picsum.photos/seed/${plant.species}/1200/400`} 
            alt={plant.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
            <div className="text-white flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2 max-w-md">
                  <input
                    type="text"
                    className="w-full bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-4 py-2 text-white placeholder-white/50 outline-none focus:bg-white/30 transition-all font-bold text-2xl"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Plant Name"
                  />
                  <input
                    type="text"
                    className="w-full bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-4 py-1 text-stone-200 placeholder-white/50 outline-none focus:bg-white/30 transition-all italic"
                    value={editForm.species}
                    onChange={(e) => setEditForm({ ...editForm, species: e.target.value })}
                    placeholder="Species"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-bold tracking-tight truncate">{plant.name}</h1>
                  <p className="text-stone-200 italic text-lg truncate">{plant.species}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all"
                    title="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="bg-green-600 p-2 rounded-xl text-white hover:bg-green-700 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
                    title="Save"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all"
                    title="Edit Details"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-500/20 backdrop-blur-md p-2 rounded-xl border border-red-500/30 text-red-200 hover:bg-red-500/40 transition-all"
                    title="Delete Plant"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30 text-white text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                {plant.healthStatus}
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-b border-stone-100">
          {(['overview', 'care', 'timeline', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
                activeTab === tab 
                  ? "text-green-600 border-green-600" 
                  : "text-stone-400 border-transparent hover:text-stone-600"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="text-red-600 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Delete {plant.name}?</h3>
              <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                This will permanently remove this plant and all its history. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-green-600" />
                  About this Plant
                </h2>
                <p className="text-stone-600 leading-relaxed">
                  {plant.description}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">Age</p>
                    <p className="text-stone-900 font-bold">{plant.age}</p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">Lifespan</p>
                    <p className="text-stone-900 font-bold">{plant.expectedLifespan}</p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">Location</p>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-stone-900 font-bold outline-none focus:border-green-500 transition-all"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      />
                    ) : (
                      <p className="text-stone-900 font-bold">{plant.location}</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Health Tracker
                </h2>
                
                <div className="flex gap-4 mb-8">
                  <input 
                    type="text" 
                    placeholder="Describe a health issue (e.g. yellow leaves)..."
                    className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 outline-none transition-all"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                  />
                  <button 
                    onClick={handleDiagnose}
                    disabled={diagnosing || !issueDescription.trim()}
                    className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {diagnosing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Diagnose
                  </button>
                </div>

                <div className="space-y-4">
                  {healthIssues.map((issue) => (
                    <div key={issue.id} className="border border-stone-100 rounded-2xl p-4 bg-stone-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                          {format(parseISO(issue.date), 'MMM d, yyyy')}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          issue.status === 'resolved' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {issue.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-stone-900 mb-1">{issue.possibleCause}</h3>
                      <p className="text-sm text-stone-600 mb-3">{issue.suggestedSolution}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm">
                <h2 className="text-lg font-bold text-stone-900 mb-4">Fertilizer Timeline</h2>
                <div className="space-y-4">
                  {plant.fertilizerTimeline?.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                        <Sprout className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-900">{item.name}</p>
                        <p className="text-xs text-stone-500">{item.schedule}</p>
                        <p className="text-[10px] text-stone-400 mt-1 uppercase font-bold tracking-wider">Next: {item.nextDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-stone-900 rounded-3xl p-6 text-white">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Growth Prediction
                </h3>
                <p className="text-stone-400 text-sm leading-relaxed">
                  Based on current health and season, expect significant new leaf growth in the next 3-4 weeks. Keep sunlight consistent!
                </p>
              </section>
            </div>
          </motion.div>
        )}

        {activeTab === 'care' && (
          <motion.div
            key="care"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {plant.careGuide && Object.entries(plant.careGuide).map(([key, value]) => (
              <div key={key} className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-stone-50 flex items-center justify-center flex-shrink-0">
                  {key === 'watering' && <Droplets className="w-8 h-8 text-blue-500" />}
                  {key === 'sunlight' && <Sun className="w-8 h-8 text-yellow-500" />}
                  {key === 'temperature' && <Thermometer className="w-8 h-8 text-orange-500" />}
                  {key === 'humidity' && <Wind className="w-8 h-8 text-cyan-500" />}
                  {key === 'soil' && <Sprout className="w-8 h-8 text-stone-500" />}
                  {key === 'repotting' && <History className="w-8 h-8 text-purple-500" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 mb-1 capitalize">{key}</h3>
                  <p className="text-stone-500 leading-relaxed">{value as string}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative space-y-8 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-100">
              {timeline.map((event, idx) => (
                <div key={event.id} className="relative pl-12">
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white border-2 border-green-600 flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                      {format(parseISO(event.date), 'MMMM d, yyyy')}
                    </p>
                    <h3 className="font-bold text-stone-900 mb-1">{event.type}</h3>
                    <p className="text-stone-600 text-sm">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-3xl mx-auto h-[600px] flex flex-col bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center gap-3">
              <div className="bg-green-600 p-2 rounded-xl">
                <MessageCircle className="text-white w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">Plant Assistant</h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Ask anything about {plant.name}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-12">
                  <div className="bg-stone-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="text-stone-300 w-8 h-8" />
                  </div>
                  <p className="text-stone-500 text-sm max-w-xs mx-auto">
                    Hi! I'm your AI plant expert. Ask me about watering, sunlight, or any issues you're noticing with {plant.name}.
                  </p>
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={cn(
                  "flex",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-stone-900 text-white rounded-tr-none" 
                      : "bg-stone-100 text-stone-800 rounded-tl-none"
                  )}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-100 flex gap-2">
              <input 
                type="text" 
                placeholder="Type your question..."
                className="flex-1 px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:border-green-500 outline-none transition-all text-sm"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <button 
                type="submit"
                disabled={chatLoading || !chatMessage.trim()}
                className="bg-green-600 text-white p-3 rounded-2xl hover:bg-green-700 transition-all disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
