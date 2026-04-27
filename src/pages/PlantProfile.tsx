import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, query, orderBy, addDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plant, TimelineEvent, HealthIssue, CareSchedule, WateringLog, FertilizerLog } from '../types';
import { diagnosePlantProblem, getPlantChatResponse, getPlantChatResponseStream } from '../services/geminiService';
import { 
  Leaf, Droplets, Sun, Thermometer, Wind, Sprout, 
  Calendar as CalendarIcon, History, MessageCircle, 
  AlertCircle, CheckCircle2, Plus, Send, Loader2, Ruler, MapPin, Target,
  ChevronRight, ArrowLeft, Info, Sparkles, Edit2, X, Save, Trash2,
  Camera, Scissors, Bell, BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow, parseISO, intervalToDuration } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import GrowthChart from '../components/GrowthChart';
import VoiceInput from '../components/VoiceInput';

export default function PlantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);
  const [wateringLogs, setWateringLogs] = useState<WateringLog[]>([]);
  const [fertilizerLogs, setFertilizerLogs] = useState<FertilizerLog[]>([]);
  const [schedules, setSchedules] = useState<CareSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'care' | 'timeline' | 'history' | 'chat'>('overview');
  const [otherActivityForm, setOtherActivityForm] = useState({
    type: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    species: '',
    location: '',
    plantationDate: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Diagnosis State
  const [diagnosing, setDiagnosing] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');

  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ id: string, role: string, content: string, timestamp: Date }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  // Measurement Logging State
  const [measurementForm, setMeasurementForm] = useState({
    height: '',
    foliage: '5'
  });
  const [loggingGrowth, setLoggingGrowth] = useState(false);

  // Care Logging State
  const [wateringForm, setWateringForm] = useState({
    status: 'Applied' as string,
    amount: '',
    method: 'Top Watering',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [fertilizingForm, setFertilizingForm] = useState({
    fertilizerName: '',
    quantity: '',
    fertilizerType: 'Liquid' as 'Liquid' | 'Granular' | 'Slow-Release' | 'Organic',
    notes: '',
    status: 'applied' as 'applied' | 'skipped' | 'snoozed',
    date: new Date().toISOString().split('T')[0]
  });
  const [loggingCare, setLoggingCare] = useState(false);

  // Reminders/Schedules State
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    type: 'watering' as CareSchedule['type'],
    customTaskName: '',
    frequency: 'Weekly',
    customFrequencyValue: '1',
    customFrequencyUnit: 'days',
    nextDate: new Date().toISOString().split('T')[0],
    reminderEnabled: true
  });
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const userId = auth.currentUser?.uid || (isGuest ? 'guest-123' : null);
    
    if (!id || !userId) return;

    const plantRef = doc(db, 'plants', id);
    const unsubscribePlant = onSnapshot(plantRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Plant;
        setPlant({ id: doc.id, ...data } as Plant);
        setEditForm({
          name: data.name,
          species: data.species,
          location: data.location,
          plantationDate: data.plantationDate || '',
          latitude: data.latitude,
          longitude: data.longitude
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

    const wateringQuery = query(collection(db, `plants/${id}/wateringLogs`), orderBy('date', 'desc'));
    const unsubscribeWatering = onSnapshot(wateringQuery, (snapshot) => {
      setWateringLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WateringLog)));
    });

    const fertilizerQuery = query(collection(db, `plants/${id}/fertilizerLogs`), orderBy('date', 'desc'));
    const unsubscribeFertilizer = onSnapshot(fertilizerQuery, (snapshot) => {
      setFertilizerLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FertilizerLog)));
    });

    const schedulesQuery = query(collection(db, `plants/${id}/schedules`), orderBy('nextDate', 'asc'));
    const unsubscribeSchedules = onSnapshot(schedulesQuery, (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CareSchedule)));
    });

    return () => {
      unsubscribePlant();
      unsubscribeTimeline();
      unsubscribeHealth();
      unsubscribeWatering();
      unsubscribeFertilizer();
      unsubscribeSchedules();
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
        possibleCause: diagnosis.possibleCause,
        suggestedSolution: diagnosis.suggestedSolution,
        riskLevel: diagnosis.riskLevel,
        status: 'ongoing' as const,
        loggedBy: 'AI Assistant'
      };

      await addDoc(collection(db, `plants/${plant.id}/healthIssues`), issueData);
      
      // Update overall plant health status
      const plantRef = doc(db, 'plants', plant.id);
      const newStatus = diagnosis.riskLevel === 'high' ? 'Critical' : 'Issues Detected';
      await updateDoc(plantRef, {
        healthStatus: newStatus
      });

      await addDoc(collection(db, `plants/${plant.id}/timeline`), {
        date: new Date().toISOString(),
        type: 'AI Health Assessment',
        description: `New AI Diagnosis logged for: "${issueDescription}". Possible Cause: ${diagnosis.possibleCause}. Recommended: ${diagnosis.suggestedSolution}`,
        issueRef: issueData
      });

      setIssueDescription('');
    } catch (error) {
      console.error('Diagnosis error:', error);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    if (!id) return;
    try {
      const issueRef = doc(db, `plants/${id}/healthIssues`, issueId);
      await updateDoc(issueRef, {
        status: 'resolved' as const,
        resolvedAt: new Date().toISOString()
      });
      
      // Check if all issues are resolved to potentially update plant health status
      const unresolved = healthIssues.filter(i => i.id !== issueId && i.status === 'ongoing');
      if (unresolved.length === 0) {
        const plantRef = doc(db, 'plants', id);
        await updateDoc(plantRef, {
          healthStatus: 'Healthy'
        });
      }

      await addDoc(collection(db, `plants/${id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Health Resolved',
        description: `A health issue has been marked as resolved.`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `plants/${id}/healthIssues/${issueId}`);
    }
  };

  const handleLogOtherActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !plant || !otherActivityForm.type) return;
    setLoggingCare(true);
    try {
      await addDoc(collection(db, `plants/${id}/timeline`), {
        date: new Date(otherActivityForm.date).toISOString(),
        type: otherActivityForm.type,
        description: otherActivityForm.notes || `Logged activity: ${otherActivityForm.type}`
      });
      setOtherActivityForm({
        type: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `plants/${id}/timeline`);
    } finally {
      setLoggingCare(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plant || !chatMessage.trim() || chatLoading) return;

    const userMsg = chatMessage;
    const userMsgId = Date.now().toString();
    setChatMessage('');
    setChatHistory(prev => [...prev, { id: userMsgId, role: 'user', content: userMsg, timestamp: new Date() }]);
    setChatLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setChatHistory(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      let fullResponse = '';
      await getPlantChatResponseStream(plant, userMsg, (chunk) => {
        fullResponse += chunk;
        setChatHistory(prev => prev.map(msg => 
          msg.id === assistantMsgId ? { ...msg, content: fullResponse } : msg
        ));
      });
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prev => prev.map(msg => 
        msg.id === assistantMsgId ? { ...msg, content: 'Sorry, I couldn\'t process that.' } : msg
      ));
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
        location: editForm.location,
        plantationDate: editForm.plantationDate,
        latitude: editForm.latitude || null,
        longitude: editForm.longitude || null
      });

      await addDoc(collection(db, `plants/${id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Details Updated',
        description: `Updated plant details: ${editForm.name}. Plantation date corrected to ${editForm.plantationDate}.`
      });

      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `plants/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogGrowth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !plant || !measurementForm.height) return;
    setLoggingGrowth(true);
    try {
      const logData = {
        plantId: id,
        date: new Date().toISOString(),
        height: parseFloat(measurementForm.height),
        foliage: parseInt(measurementForm.foliage)
      };

      await addDoc(collection(db, `plants/${id}/growthLogs`), logData);
      
      await addDoc(collection(db, `plants/${id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Growth Measured',
        description: `Recorded physical growth: ${measurementForm.height}cm height with foliage density of ${measurementForm.foliage}/10.`
      });

      setMeasurementForm({ height: '', foliage: '5' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `plants/${id}/growthLogs`);
    } finally {
      setLoggingGrowth(false);
    }
  };

  const handleLogWatering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !plant) return;
    setLoggingCare(true);
    try {
      const logData = {
        plantId: id,
        date: new Date(wateringForm.date).toISOString(),
        status: wateringForm.status,
        amount: wateringForm.amount,
        method: wateringForm.method,
        notes: wateringForm.notes
      };
      await addDoc(collection(db, `plants/${id}/wateringLogs`), logData);
      await addDoc(collection(db, `plants/${id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Watering Logged',
        description: `Watering event logged: ${wateringForm.status} (${wateringForm.amount || 'No amount specified'}) using ${wateringForm.method}`
      });
      setWateringForm({
        status: 'Applied',
        amount: '',
        method: 'Top Watering',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `plants/${id}/wateringLogs`);
    } finally {
      setLoggingCare(false);
    }
  };

  const handleLogFertilizing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !plant || !fertilizingForm.fertilizerName || !fertilizingForm.fertilizerType) return;
    setLoggingCare(true);
    try {
      const logData = {
        plantId: id,
        date: new Date(fertilizingForm.date).toISOString(),
        fertilizerName: fertilizingForm.fertilizerName,
        fertilizerType: fertilizingForm.fertilizerType,
        quantity: fertilizingForm.quantity,
        notes: fertilizingForm.notes,
        status: fertilizingForm.status
      };
      await addDoc(collection(db, `plants/${id}/fertilizerLogs`), logData);
      await addDoc(collection(db, `plants/${id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Fertilizing Logged',
        description: `Fertilizing event logged: ${fertilizingForm.fertilizerName} (${fertilizingForm.fertilizerType}${fertilizingForm.quantity ? `, ${fertilizingForm.quantity}` : ''}) status ${fertilizingForm.status}. ${fertilizingForm.notes ? `Notes: ${fertilizingForm.notes}` : ''}`
      });
      setFertilizingForm(prev => ({ 
        ...prev, 
        fertilizerName: '', 
        quantity: '', 
        notes: '',
        fertilizerType: 'Liquid',
        date: new Date().toISOString().split('T')[0] 
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `plants/${id}/fertilizerLogs`);
    } finally {
      setLoggingCare(false);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingReminder(true);
    try {
      const finalFrequency = reminderForm.frequency === 'Custom' 
        ? `Every ${reminderForm.customFrequencyValue} ${reminderForm.customFrequencyUnit}`
        : reminderForm.frequency;

      const finalType = reminderForm.type === 'other' ? reminderForm.customTaskName : reminderForm.type;

      const reminderData = {
        plantId: id,
        type: finalType,
        frequency: finalFrequency,
        reminderEnabled: reminderForm.reminderEnabled,
        nextDate: new Date(reminderForm.nextDate).toISOString()
      };
      await addDoc(collection(db, `plants/${id}/schedules`), reminderData);
      await addDoc(collection(db, `plants/${id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Reminder Added',
        description: `Added ${finalType} reminder: ${finalFrequency}, next on ${reminderForm.nextDate}`
      });
      setShowReminderForm(false);
      setReminderForm({
        type: 'watering',
        customTaskName: '',
        frequency: 'Weekly',
        customFrequencyValue: '1',
        customFrequencyUnit: 'days',
        nextDate: new Date().toISOString().split('T')[0],
        reminderEnabled: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `plants/${id}/schedules`);
    } finally {
      setSavingReminder(false);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, `plants/${id}/schedules`, reminderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `plants/${id}/schedules/${reminderId}`);
    }
  };

  const handleToggleReminder = async (reminderId: string, currentStatus: boolean) => {
    if (!id) return;
    try {
      const reminderRef = doc(db, `plants/${id}/schedules`, reminderId);
      await updateDoc(reminderRef, {
        reminderEnabled: !currentStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `plants/${id}/schedules/${reminderId}`);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !plant) return;

    setUploadingPhoto(true);
    try {
      let finalPhotoUrl = '';

      if (storage) {
        // Use Firebase Storage if available
        const isGuest = localStorage.getItem('isGuest') === 'true';
        const userId = auth.currentUser?.uid || (isGuest ? 'guest-123' : 'unknown');
        
        const uploadTask = async () => {
          const storageRef = ref(storage, `plants/${userId}/${id}/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          return await getDownloadURL(snapshot.ref);
        };

        try {
          finalPhotoUrl = await Promise.race([
            uploadTask(),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Fast Timeout')), 5000))
          ]);
        } catch (err: any) {
          console.log("Using optimized update fallback for photo.");
          
          const compressImage = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const MAX_SIZE = 800;
                  let width = img.width;
                  let height = img.height;
                  if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                  } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
                img.onerror = reject;
              };
              reader.onerror = reject;
            });
          };
          
          finalPhotoUrl = await compressImage(file);
        }
      } else {
        // Fallback to base64 if storage is not configured
        const reader = new FileReader();
        finalPhotoUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      if (finalPhotoUrl) {
        const plantRef = doc(db, 'plants', id);
        await updateDoc(plantRef, {
          photoUrl: finalPhotoUrl
        });

        await addDoc(collection(db, `plants/${id}/timeline`), {
          date: new Date().toISOString(),
          type: 'Photo Updated',
          description: `Updated plant photo.`,
          photoUrl: finalPhotoUrl // Also store in timeline
        });
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !plant) return;
    
    setIsDeleting(true);
    try {
      const plantRef = doc(db, 'plants', id);
      await deleteDoc(plantRef);
      navigate('/');
    } catch (error) {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      console.error('Delete error:', error);
      alert('Failed to delete plant. Please check permissions.');
    }
  };

  // Age calculation helper
  const getAccurateAge = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      const start = parseISO(dateString);
      const now = new Date();
      const duration = intervalToDuration({ start, end: now });
      
      const parts = [];
      if (duration.years) parts.push(`${duration.years} ${duration.years === 1 ? 'year' : 'years'}`);
      if (duration.months) parts.push(`${duration.months} ${duration.months === 1 ? 'month' : 'months'}`);
      if (duration.days) parts.push(`${duration.days} ${duration.days === 1 ? 'day' : 'days'}`);
      
      if (parts.length === 0) return '0 days';
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
      
      return `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
    } catch (e) {
      return null;
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
        <div className="h-64 bg-stone-100 relative group">
          <img 
            src={plant.photoUrl || `https://picsum.photos/seed/${plant.species}/1200/400`} 
            alt={plant.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Edit Photo Button */}
          <div className="absolute top-6 right-8">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="bg-black/30 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-black/50 transition-all shadow-xl group/btn"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              )}
              {uploadingPhoto ? 'Uploading...' : 'Update Plant Photo'}
            </button>
          </div>

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
          {(['overview', 'care', 'timeline', 'history', 'chat'] as const).map((tab) => (
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
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
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
              {/* Prominent Vitals Card */}
              <div className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-[4rem] -mr-8 -mt-8 opacity-50" />
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                      <Sprout className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Plant Age</p>
                      <h3 className="text-xl font-black text-stone-900 leading-tight">
                        {getAccurateAge(plant.plantationDate) || 'Freshly Planted'}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center",
                      plant.healthStatus === 'Excellent' || plant.healthStatus === 'Healthy' ? "bg-blue-100 text-blue-600" :
                      plant.healthStatus === 'Issues Detected' ? "bg-orange-100 text-orange-600" :
                      "bg-red-100 text-red-600"
                    )}>
                      {plant.healthStatus === 'Excellent' || plant.healthStatus === 'Healthy' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Current Health</p>
                      <h3 className="text-xl font-black text-stone-900 leading-tight">{plant.healthStatus}</h3>
                    </div>
                  </div>
                </div>
              </div>

              {!plant.plantationDate && !isEditing && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-orange-50 border border-orange-100 rounded-3xl p-6 flex items-start gap-4"
                >
                  <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-900 mb-1">Missing Plantation Date</h3>
                    <p className="text-sm text-stone-600 mb-4">Adding a plantation date helps us track growth accuracy and provide better care advice.</p>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-orange-600 uppercase tracking-widest hover:text-orange-700 transition-colors"
                    >
                      + Add Plantation Date
                    </button>
                  </div>
                </motion.div>
              )}

              <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-green-600" />
                  About this Plant
                </h2>
                <p className="text-stone-600 leading-relaxed">
                  {plant.description}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">Expected Lifespan</p>
                    <p className="text-stone-900 font-bold">{plant.expectedLifespan || 'Unknown'}</p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">Current Age</p>
                    <p className="text-stone-900 font-bold">
                      {getAccurateAge(plant.plantationDate) || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">Planted On</p>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-stone-900 font-bold outline-none focus:border-green-500 transition-all text-xs"
                        value={editForm.plantationDate}
                        onChange={(e) => setEditForm({ ...editForm, plantationDate: e.target.value })}
                      />
                    ) : (
                      <p className="text-stone-900 font-bold">
                        {plant.plantationDate ? format(parseISO(plant.plantationDate), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl relative group/loc transition-all",
                    plant.latitude ? "bg-green-50/50 border border-green-100 ring-4 ring-green-500/5 shadow-sm" : "bg-stone-50 border border-transparent"
                  )}>
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                      Location & GPS
                      {!isEditing && plant.latitude && (
                        <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          GPS ACTIVE
                        </span>
                      )}
                    </p>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">General Location Name</label>
                          <input
                            type="text"
                            className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-stone-900 font-bold outline-none focus:border-green-500 transition-all text-xs"
                            value={editForm.location}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            placeholder="e.g. Balcony, Garden Bed A"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Latitude</label>
                            <input
                              type="number"
                              step="any"
                              className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-stone-900 font-bold outline-none focus:border-green-500 transition-all text-xs"
                              value={editForm.latitude || ''}
                              onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="0.0000"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Longitude</label>
                            <input
                              type="number"
                              step="any"
                              className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-stone-900 font-bold outline-none focus:border-green-500 transition-all text-xs"
                              value={editForm.longitude || ''}
                              onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="0.0000"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  const lat = pos.coords.latitude;
                                  const lng = pos.coords.longitude;
                                  setEditForm(prev => ({ 
                                    ...prev, 
                                    latitude: lat, 
                                    longitude: lng,
                                    // Update location text if it's generic or empty
                                    location: prev.location && prev.location !== 'GPS Location' ? prev.location : `GPS Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`
                                  }));
                                },
                                (err) => {
                                  console.error("Geolocation error:", err);
                                  alert("Could not get location. Please ensure GPS is enabled and permissions are granted.");
                                }
                              );
                            } else {
                              alert("Geolocation is not supported by your browser.");
                            }
                          }}
                          className="w-full py-2 text-[10px] font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <MapPin className="w-3 h-3" />
                          {editForm.latitude ? 'Update GPS Data ✓' : 'Capture Current GPS'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className={cn(
                          "font-bold",
                          plant.location ? "text-stone-900" : "text-stone-300 italic"
                        )}>
                          {plant.location || 'Set general location...'}
                        </p>
                        {plant.latitude && plant.longitude ? (
                          <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono">
                            <span>Lat: {plant.latitude.toFixed(4)}</span>
                            <span>Lng: {plant.longitude.toFixed(4)}</span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-stone-300 italic">No precisely pinned location</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Google Maps Section */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      Precise Location
                    </h3>
                  </div>
                  
                  <div className="h-64 bg-stone-100 rounded-3xl overflow-hidden border border-stone-100 relative group">
                    {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                        <Map
                          style={{width: '100%', height: '100%'}}
                          defaultCenter={
                            plant.latitude && plant.longitude 
                              ? {lat: plant.latitude, lng: plant.longitude}
                              : {lat: 20.5937, lng: 78.9629} // India center fallback
                          }
                          defaultZoom={plant.latitude ? 15 : 4}
                          gestureHandling={'greedy'}
                          disableDefaultUI={true}
                          mapId="plant_location_map"
                        >
                          {plant.latitude && plant.longitude && (
                            <AdvancedMarker position={{lat: plant.latitude, lng: plant.longitude}}>
                              <Pin background={'#16a34a'} glyphColor={'#fff'} borderColor={'#166534'} />
                            </AdvancedMarker>
                          )}
                        </Map>
                      </APIProvider>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-stone-50">
                        <MapPin className="w-8 h-8 text-stone-300 mb-2" />
                        <p className="text-sm font-bold text-stone-400">Map unavailable</p>
                        <p className="text-[10px] text-stone-400 mt-1">Please configure VITE_GOOGLE_MAPS_API_KEY in settings</p>
                      </div>
                    )}
                    
                    {!plant.latitude && !isEditing && import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
                      <div className="absolute inset-0 bg-stone-900/10 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                        <div className="bg-white p-6 rounded-3xl shadow-xl max-w-xs transition-transform hover:scale-105">
                          <MapPin className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                          <p className="text-sm font-bold text-stone-900 mb-1">GPS Location Empty</p>
                          <p className="text-[10px] text-stone-500 mb-4 leading-relaxed">Pinpoint your plant on the map to get hyper-local climate insights.</p>
                          <button 
                            onClick={async () => {
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(async (pos) => {
                                  try {
                                    if (!id) return;
                                    await updateDoc(doc(db, 'plants', id), {
                                      latitude: pos.coords.latitude,
                                      longitude: pos.coords.longitude
                                    });
                                  } catch (err) {
                                    console.error("Error updating GPS:", err);
                                  }
                                }, (err) => {
                                  alert("Please enable GPS/Location permissions to capture location.");
                                });
                              }
                            }}
                            className="w-full bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Sparkles className="w-3 h-3" />
                            Capture Current GPS
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-green-600" />
                    Growth Tracking
                  </h2>
                </div>
                <form onSubmit={handleLogGrowth} className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
                  <div className="sm:col-span-4 space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Height (cm)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.1"
                        required
                        placeholder="0.0"
                        className="w-full pl-4 pr-12 py-3 rounded-2xl bg-stone-50 border border-stone-100 focus:border-green-500 outline-none transition-all font-bold"
                        value={measurementForm.height}
                        onChange={(e) => setMeasurementForm(prev => ({ ...prev, height: e.target.value }))}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">CM</span>
                    </div>
                  </div>
                  <div className="sm:col-span-5 space-y-2">
                    <div className="flex justify-between items-center mb-1 ml-1">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Foliage Density</label>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">{measurementForm.foliage}/10</span>
                    </div>
                    <div className="px-2">
                      <input 
                        type="range" 
                        min="1" 
                        max="10"
                        className="w-full accent-green-600 cursor-pointer h-2 bg-stone-100 rounded-lg appearance-none"
                        value={measurementForm.foliage}
                        onChange={(e) => setMeasurementForm(prev => ({ ...prev, foliage: e.target.value }))}
                      />
                      <div className="flex justify-between mt-1 px-1">
                        <span className="text-[10px] font-bold text-stone-300">SPARSE</span>
                        <span className="text-[10px] font-bold text-stone-300">DENSE</span>
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <button 
                      type="submit"
                      disabled={loggingGrowth}
                      className="w-full bg-green-600 text-white py-3.5 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loggingGrowth ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Save Measurements
                    </button>
                  </div>
                </form>
              </section>

              <GrowthChart plantId={plant.id} />

              <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Health History Log
                </h2>
                
                <div className="flex gap-4 mb-8 items-center">
                  <VoiceInput 
                    onResult={(text) => setIssueDescription(prev => prev + (prev ? ' ' : '') + text)}
                    placeholder="Describe the issue..."
                  />
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
                    <div key={issue.id} className={cn(
                      "border rounded-2xl p-6 transition-all",
                      issue.status === 'resolved' ? "bg-stone-50 border-stone-100 opacity-75" : "bg-white border-stone-100 shadow-sm"
                    )}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            issue.status === 'resolved' ? "bg-stone-200 text-stone-500" : "bg-green-100 text-green-600"
                          )}>
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-0.5">
                              {format(parseISO(issue.date), 'MMMM d, yyyy')}
                            </span>
                            <h3 className={cn(
                              "font-bold text-lg leading-tight",
                              issue.status === 'resolved' ? "text-stone-500" : "text-stone-900"
                            )}>
                              {issue.possibleCause}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {issue.riskLevel && (
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full",
                              issue.riskLevel === 'high' ? "bg-red-50 text-red-700" : 
                              issue.riskLevel === 'medium' ? "bg-yellow-50 text-yellow-700" : 
                              "bg-blue-50 text-blue-700"
                            )}>
                              {issue.riskLevel} Level
                            </span>
                          )}
                          <button 
                            onClick={() => issue.status === 'ongoing' && handleResolveIssue(issue.id)}
                            disabled={issue.status === 'resolved'}
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all",
                              issue.status === 'resolved' 
                                ? "bg-green-50 text-green-600 cursor-default" 
                                : "bg-stone-900 text-white hover:bg-green-600"
                            )}
                          >
                            {issue.status === 'resolved' ? 'Resolved' : 'Mark Resolved'}
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Observation</p>
                          <p className="text-sm text-stone-600 italic">"{issue.description}"</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Suggested Solution
                          </p>
                          <p className={cn(
                            "text-sm leading-relaxed",
                            issue.status === 'resolved' ? "text-stone-500" : "text-stone-800 font-medium"
                          )}>
                            {issue.suggestedSolution}
                          </p>
                        </div>
                      </div>
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
            className="space-y-8"
          >
            {/* Care Guide Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Custom Reminders Section */}
            <section className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/30">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-2xl text-green-700">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-stone-900">Custom Care Reminders</h2>
                    <p className="text-sm text-stone-500">Set recurring tasks for this plant.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReminderForm(!showReminderForm)}
                  className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {showReminderForm ? 'Cancel' : 'Add Reminder'}
                </button>
              </div>

              {showReminderForm && (
                <div className="p-8 bg-stone-50/50 border-b border-stone-100">
                  <form onSubmit={handleAddReminder} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className={cn(
                      "space-y-2",
                      reminderForm.type === 'other' ? "md:col-span-2" : "md:col-span-1"
                    )}>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Task Type</label>
                      <div className="flex gap-2">
                        <select 
                          className={cn(
                            "px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold",
                            reminderForm.type === 'other' ? "flex-1" : "w-full"
                          )}
                          value={reminderForm.type}
                          onChange={(e) => setReminderForm(prev => ({ ...prev, type: e.target.value as any }))}
                        >
                          <option value="watering">Watering</option>
                          <option value="fertilizing">Fertilizing</option>
                          <option value="repotting">Repotting</option>
                          <option value="pruning">Pruning</option>
                          <option value="other">Other</option>
                        </select>
                        {reminderForm.type === 'other' && (
                          <input 
                            type="text"
                            placeholder="Task name"
                            required
                            className="flex-[2] px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                            value={reminderForm.customTaskName}
                            onChange={(e) => setReminderForm(prev => ({ ...prev, customTaskName: e.target.value }))}
                          />
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "space-y-2",
                      reminderForm.frequency === 'Custom' ? "md:col-span-1" : "md:col-span-1"
                    )}>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Frequency</label>
                      <select 
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                        value={reminderForm.frequency}
                        onChange={(e) => setReminderForm(prev => ({ ...prev, frequency: e.target.value }))}
                      >
                        <option value="Daily">Daily</option>
                        <option value="Every 2 Days">Every 2 Days</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <div className={cn(
                      "space-y-2",
                      reminderForm.frequency === 'Custom' ? "md:col-span-1" : "md:col-span-1"
                    )}>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Starting On</label>
                      <input 
                        type="date"
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                        value={reminderForm.nextDate}
                        onChange={(e) => setReminderForm(prev => ({ ...prev, nextDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Notifications</label>
                      <button
                        type="button"
                        onClick={() => setReminderForm(prev => ({ ...prev, reminderEnabled: !prev.reminderEnabled }))}
                        className={cn(
                          "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border transition-all font-bold text-sm",
                          reminderForm.reminderEnabled 
                            ? "bg-green-50 border-green-200 text-green-700" 
                            : "bg-stone-50 border-stone-200 text-stone-500"
                        )}
                      >
                        {reminderForm.reminderEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        {reminderForm.reminderEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                    {reminderForm.frequency === 'Custom' && (
                      <div className="md:col-span-1 space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Every</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <input 
                              type="number"
                              min="1"
                              className="w-full px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                              value={reminderForm.customFrequencyValue}
                              onChange={(e) => setReminderForm(prev => ({ ...prev, customFrequencyValue: e.target.value }))}
                            />
                          </div>
                          <div className="flex-1">
                            <select 
                              className="w-full px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                              value={reminderForm.customFrequencyUnit}
                              onChange={(e) => setReminderForm(prev => ({ ...prev, customFrequencyUnit: e.target.value }))}
                            >
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                              <option value="months">Months</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={cn(
                      "flex items-end",
                      reminderForm.frequency === 'Custom' || reminderForm.type === 'other' ? "md:col-span-4 mt-2" : "md:col-span-4 mt-2"
                    )}>
                      <button 
                        type="submit"
                        disabled={savingReminder}
                        className="w-full bg-stone-900 text-white py-3 rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {savingReminder ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Reminder
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="divide-y divide-stone-100">
                {schedules.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-stone-400 italic text-sm">No care reminders set yet. Add one to see it in your calendar!</p>
                  </div>
                ) : (
                  schedules.map(reminder => (
                    <div key={reminder.id} className="p-6 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          reminder.type === 'watering' ? "bg-blue-50 text-blue-600" :
                          reminder.type === 'fertilizing' ? "bg-orange-50 text-orange-600" :
                          reminder.type === 'repotting' ? "bg-purple-50 text-purple-600" :
                          "bg-green-50 text-green-600"
                        )}>
                          {reminder.type === 'watering' && <Droplets className="w-6 h-6" />}
                          {reminder.type === 'fertilizing' && <Sun className="w-6 h-6" />}
                          {reminder.type === 'repotting' && <History className="w-6 h-6" />}
                          {reminder.type === 'pruning' && <Scissors className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className={cn(
                            "font-bold capitalize",
                            reminder.reminderEnabled ? "text-stone-900" : "text-stone-400"
                          )}>{reminder.type}</h4>
                          <p className="text-sm text-stone-500">{reminder.frequency} • Next: {format(parseISO(reminder.nextDate), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleReminder(reminder.id, reminder.reminderEnabled)}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            reminder.reminderEnabled 
                              ? "bg-green-50 text-green-600 hover:bg-green-100" 
                              : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                          )}
                          title={reminder.reminderEnabled ? "Disable Reminder" : "Enable Reminder"}
                        >
                          {reminder.reminderEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                        </button>
                        <button 
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Remove Reminder"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Logging Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Watering Log Form & History */}
              <div className="space-y-6">
                <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                  <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-500" />
                    Log Watering
                  </h2>
                  <form onSubmit={handleLogWatering} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Date</label>
                        <input 
                          type="date"
                          required
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-blue-500 outline-none transition-all text-sm"
                          value={wateringForm.date}
                          onChange={(e) => setWateringForm(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Volume / Amount</label>
                        <input 
                          type="text"
                          placeholder="e.g. 500ml"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-blue-500 outline-none transition-all text-sm"
                          value={wateringForm.amount}
                          onChange={(e) => setWateringForm(prev => ({ ...prev, amount: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Watering Method</label>
                        <select 
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-blue-500 outline-none transition-all text-sm"
                          value={wateringForm.method}
                          onChange={(e) => setWateringForm(prev => ({ ...prev, method: e.target.value }))}
                        >
                          <option value="Top Watering">Top Watering</option>
                          <option value="Bottom Watering">Bottom Watering</option>
                          <option value="Misting">Misting</option>
                          <option value="Submersion">Submersion</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Initial Status</label>
                        <select 
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-blue-500 outline-none transition-all text-sm"
                          value={wateringForm.status}
                          onChange={(e) => setWateringForm(prev => ({ ...prev, status: e.target.value }))}
                        >
                          <option value="Applied">Applied</option>
                          <option value="Slightly Moistened">Slightly Moistened</option>
                          <option value="Deep Watering">Deep Watering</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Notes (Optional)</label>
                      <input 
                        type="text"
                        placeholder="e.g. Added liquid fertilizer or used rain water"
                        className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-blue-500 outline-none transition-all text-sm"
                        value={wateringForm.notes}
                        onChange={(e) => setWateringForm(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loggingCare}
                      className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loggingCare ? <Loader2 className="w-5 h-5 animate-spin" /> : <Droplets className="w-5 h-5" />}
                      Record Watering
                    </button>
                  </form>
                </section>

                <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                  <h3 className="text-lg font-bold text-stone-900 mb-6">Watering History</h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                    {wateringLogs.length === 0 ? (
                      <p className="text-stone-400 text-sm italic text-center py-8">No watering events logged yet.</p>
                    ) : (
                      wateringLogs.map(log => (
                        <div key={log.id} className="p-4 rounded-2xl bg-stone-50/50 border border-stone-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{format(parseISO(log.date), 'MMMM d, yyyy')}</p>
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase">
                              {log.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-stone-900">{log.method || 'Top Watering'}</span>
                                {log.amount && <span className="text-xs text-stone-500">• {log.amount}</span>}
                              </div>
                              {log.notes && <p className="text-xs text-stone-400 italic">"{log.notes}"</p>}
                            </div>
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                              <Droplets className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              {/* Fertilizing Log Form & History */}
              <div className="space-y-6">
                <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                  <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                    <Sun className="w-5 h-5 text-orange-500" />
                    Log Fertilizing
                  </h2>
                  <form onSubmit={handleLogFertilizing} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Date</label>
                        <input 
                          type="date"
                          required
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-orange-500 outline-none transition-all text-sm"
                          value={fertilizingForm.date}
                          onChange={(e) => setFertilizingForm(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Status</label>
                        <select 
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-orange-500 outline-none transition-all text-sm"
                          value={fertilizingForm.status}
                          onChange={(e) => setFertilizingForm(prev => ({ ...prev, status: e.target.value as any }))}
                        >
                          <option value="applied">Applied</option>
                          <option value="skipped">Skipped</option>
                          <option value="snoozed">Snoozed</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Fertilizer Name</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. NPK 10-10-10"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-orange-500 outline-none transition-all text-sm font-medium"
                          value={fertilizingForm.fertilizerName}
                          onChange={(e) => setFertilizingForm(prev => ({ ...prev, fertilizerName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Fertilizer Type</label>
                        <select 
                          required
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-orange-500 outline-none transition-all text-sm font-medium"
                          value={fertilizingForm.fertilizerType}
                          onChange={(e) => setFertilizingForm(prev => ({ ...prev, fertilizerType: e.target.value as any }))}
                        >
                          <option value="Liquid">Liquid</option>
                          <option value="Granular">Granular</option>
                          <option value="Slow-Release">Slow-Release</option>
                          <option value="Organic">Organic</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Quantity</label>
                        <input 
                          type="text"
                          placeholder="e.g. 50g or 2ml/L"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-orange-500 outline-none transition-all text-sm font-medium"
                          value={fertilizingForm.quantity}
                          onChange={(e) => setFertilizingForm(prev => ({ ...prev, quantity: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Notes (Optional)</label>
                        <input 
                          type="text"
                          placeholder="e.g. Mixed with watering"
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-100 focus:border-orange-500 outline-none transition-all text-sm font-medium"
                          value={fertilizingForm.notes}
                          onChange={(e) => setFertilizingForm(prev => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={loggingCare || !fertilizingForm.fertilizerName}
                      className="w-full bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loggingCare ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sun className="w-5 h-5" />}
                      Record Fertilizing
                    </button>
                  </form>
                </section>

                <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                  <h3 className="text-lg font-bold text-stone-900 mb-6">Fertilizing History</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                    {fertilizerLogs.length === 0 ? (
                      <p className="text-stone-400 text-sm italic text-center py-8">No fertilizing events logged yet.</p>
                    ) : (
                      fertilizerLogs.map(log => (
                        <div key={log.id} className="p-4 rounded-2xl bg-stone-50/50 border border-stone-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                              {format(parseISO(log.date), 'MMMM d, yyyy')}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                              log.status === 'applied' ? "bg-orange-100 text-orange-700" : "bg-stone-200 text-stone-600"
                            )}>
                              {log.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-stone-900">{log.fertilizerName}</h4>
                                <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full uppercase">
                                  {log.fertilizerType}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                {log.quantity && <p className="text-xs text-stone-500 font-medium">Quantity: {log.quantity}</p>}
                                {log.notes && <p className="text-xs text-stone-400 italic">"{log.notes}"</p>}
                              </div>
                            </div>
                            <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                              <Sprout className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* Log Other Activity Form */}
            <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-stone-100 p-3 rounded-2xl text-stone-600">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Log Other Activity</h2>
                  <p className="text-sm text-stone-500">Record pruning, pest control, or any other care task.</p>
                </div>
              </div>
              <form onSubmit={handleLogOtherActivity} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Activity Type</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Pruning, Pest Control"
                      className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-100 focus:border-green-500 shadow-sm outline-none transition-all text-sm font-bold"
                      value={otherActivityForm.type}
                      onChange={(e) => setOtherActivityForm(prev => ({ ...prev, type: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Date</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-100 focus:border-green-500 shadow-sm outline-none transition-all text-sm font-bold"
                      value={otherActivityForm.date}
                      onChange={(e) => setOtherActivityForm(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Notes (Optional)</label>
                    <input 
                      type="text"
                      placeholder="Details about the activity..."
                      className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-100 focus:border-green-500 shadow-sm outline-none transition-all text-sm font-bold"
                      value={otherActivityForm.notes}
                      onChange={(e) => setOtherActivityForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={loggingCare || !otherActivityForm.type}
                  className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loggingCare ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Record Activity
                </button>
              </form>
            </section>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex flex-col gap-6">
              <section className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-3 rounded-2xl text-green-700">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-stone-900 tracking-tight">Plant Care History</h2>
                      <p className="text-sm text-stone-500 font-medium">Unified view of all care activities.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    ...wateringLogs.map(l => ({ ...l, logType: 'watering' })), 
                    ...fertilizerLogs.map(l => ({ ...l, logType: 'fertilizing' })),
                    ...timeline.filter(e => !['Plant Added', 'Reminder Added', 'Watering Logged', 'Fertilizer Logged'].includes(e.type)).map(e => ({ ...e, logType: 'other' }))
                  ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((log, idx) => (
                    <div key={idx} className="group p-6 rounded-3xl bg-stone-50 border border-stone-100 hover:border-green-200 hover:bg-white hover:shadow-xl hover:shadow-green-900/5 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                          (log as any).logType === 'watering' ? "bg-blue-100 text-blue-600" :
                          (log as any).logType === 'fertilizing' ? "bg-orange-100 text-orange-600" :
                          "bg-stone-200 text-stone-600"
                        )}>
                          {(log as any).logType === 'watering' && <Droplets className="w-6 h-6" />}
                          {(log as any).logType === 'fertilizing' && <Sun className="w-6 h-6" />}
                          {(log as any).logType === 'other' && <Leaf className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              {format(parseISO(log.date), 'EEEE, MMMM d, yyyy')}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                              (log as any).logType === 'watering' ? "bg-blue-50 text-blue-700" :
                              (log as any).logType === 'fertilizing' ? "bg-orange-50 text-orange-700" :
                              "bg-stone-100 text-stone-700"
                            )}>
                              {(log as any).logType}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-stone-900 mb-1">
                            {(log as any).logType === 'watering' ? (log as any).status :
                             (log as any).logType === 'fertilizing' ? (log as any).fertilizerName :
                             (log as any).type}
                          </h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {(log as any).logType === 'watering' && (
                              <>
                                {(log as any).amount && <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5"><Droplets className="w-3 h-3 text-stone-300" /> {(log as any).amount}</p>}
                                {(log as any).method && <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5"><MapPin className="w-3 h-3 text-stone-300" /> {(log as any).method}</p>}
                              </>
                            )}
                            {(log as any).logType === 'fertilizing' && (
                              <>
                                <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5"><Target className="w-3 h-3 text-stone-300" /> {(log as any).fertilizerType}</p>
                                {(log as any).quantity && <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5"><Scissors className="w-3 h-3 text-stone-300" /> {(log as any).quantity}</p>}
                              </>
                            )}
                            {(log as any).description && (log as any).logType === 'other' && (
                              <p className="text-xs text-stone-500 italic">"{(log as any).description}"</p>
                            )}
                            {(log as any).notes && (log as any).logType !== 'other' && (
                              <p className="text-xs text-stone-400 italic">"{(log as any).notes}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
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
              {chatHistory.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex flex-col",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "bg-stone-900 text-white rounded-tr-none" 
                      : "bg-stone-100 text-stone-800 rounded-tl-none border border-stone-200"
                  )}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 px-1 font-medium">
                    {format(msg.timestamp, 'h:mm a')}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
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

            <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-100 flex gap-2 items-center">
              <input 
                type="text" 
                placeholder="Type your question..."
                className="flex-1 px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:border-green-500 outline-none transition-all text-sm"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <VoiceInput 
                onResult={(text) => setChatMessage(prev => prev + (prev ? ' ' : '') + text)}
                placeholder="Speak your question..."
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
