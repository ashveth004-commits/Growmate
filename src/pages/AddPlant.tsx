import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { processAndUploadImage } from '../lib/imageUtils';
import { generatePlantProfile } from '../services/geminiService';
import { 
  Leaf, MapPin, Calendar as CalendarIcon, Camera, Loader2, 
  Sparkles, X, AlertCircle, Plus, Droplets, Sun, 
  History, Scissors, Bell, BellOff, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import VoiceInput from '../components/VoiceInput';

export default function AddPlant() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    isIndoor: true,
    plantationDate: new Date().toISOString().split('T')[0],
    age: '',
    location: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    potSize: '',
    description: '',
    expectedLifespan: ''
  });
  const [careGuide, setCareGuide] = useState({
    watering: '',
    sunlight: '',
    temperature: '',
    humidity: '',
    soil: '',
    repotting: ''
  });
  const [reminders, setReminders] = useState<{
    type: string;
    customTaskName: string;
    frequency: string;
    customValue: string;
    customUnit: string;
    nextDate: string;
    enabled: boolean;
  }[]>([]);
  const [newReminder, setNewReminder] = useState({
    type: 'watering',
    customTaskName: '',
    frequency: 'Weekly',
    customValue: '1',
    customUnit: 'days',
    nextDate: new Date().toISOString().split('T')[0],
    enabled: true
  });
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAI = async () => {
    if (!formData.species || formData.species.trim() === '') {
      setAiError("Please enter a species name first so AI can identify your plant.");
      return;
    }
    setGeneratingAI(true);
    setAiError(null);
    try {
      const aiProfile = await generatePlantProfile(formData.species, formData.plantationDate);
      if (aiProfile.careGuide) {
        setCareGuide(aiProfile.careGuide);
      }
      setFormData(prev => ({ 
        ...prev, 
        description: aiProfile.description || '',
        expectedLifespan: aiProfile.expectedLifespan || '',
        ...aiProfile 
      }));
    } catch (err: any) {
      console.error('Error generating AI profile:', err);
      setAiError("AI was unable to generate a profile right now. You can still enter details manually.");
      
      // Gracefully fill with 'N/A' or defaults if they are currently empty
      setCareGuide(prev => ({
        watering: prev.watering || 'N/A',
        sunlight: prev.sunlight || 'N/A',
        temperature: prev.temperature || 'N/A',
        humidity: prev.humidity || 'N/A',
        soil: prev.soil || 'N/A',
        repotting: prev.repotting || 'N/A'
      }));
      setFormData(prev => ({
        ...prev,
        expectedLifespan: prev.expectedLifespan || 'N/A',
        description: prev.description || 'Manual entry required.'
      }));
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddReminder = () => {
    setReminders([...reminders, { ...newReminder }]);
    setNewReminder({
      type: 'watering',
      customTaskName: '',
      frequency: 'Weekly',
      customValue: '1',
      customUnit: 'days',
      nextDate: new Date().toISOString().split('T')[0],
      enabled: true
    });
  };

  const handleRemoveReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const userId = auth.currentUser?.uid || (isGuest ? 'guest-123' : null);
    
    if (!userId) return;

    setLoading(true);
    setError(null);
    console.log('Starting plant submission...');
    try {
      // 1. Upload Image if exists
      let photoUrl = '';
      if (imageFile) {
        console.log('Processing image with robust processor...');
        setLoading(true);
        const imageResult = await processAndUploadImage(
          imageFile, 
          storage, 
          `plants/${userId}/${Date.now()}_${imageFile.name}`
        );
        
        if (imageResult.url) {
          photoUrl = imageResult.url;
          console.log(`Image saved via ${imageResult.method}`);
        } else if (imageResult.error) {
          console.error('Image processing error:', imageResult.error);
          // We continue but the user should know if it was a total failure
        }
      }

      // 2. Prepare Final Data
      console.log('Preparing plant data...');
      const mergedCareGuide = {
        watering: careGuide.watering || 'N/A',
        sunlight: careGuide.sunlight || 'N/A',
        temperature: careGuide.temperature || 'N/A',
        humidity: careGuide.humidity || 'N/A',
        soil: careGuide.soil || 'N/A',
        repotting: careGuide.repotting || 'N/A'
      };

      // 3. Save to Firestore
      const plantData = {
        name: formData.name.trim(),
        species: formData.species.trim(),
        isIndoor: formData.isIndoor,
        plantationDate: formData.plantationDate,
        location: formData.location || 'Unknown',
        potSize: formData.potSize || 'Standard',
        description: formData.description.trim() || 'No description provided.',
        expectedLifespan: formData.expectedLifespan || 'N/A',
        latitude: formData.latitude !== undefined ? formData.latitude : null,
        longitude: formData.longitude !== undefined ? formData.longitude : null,
        ownerId: userId,
        createdAt: serverTimestamp(),
        careGuide: mergedCareGuide,
        photoUrl,
        healthStatus: 'Healthy',
        age: formData.age || 'Just started',
        fertilizerTimeline: [] // Will be populated later or via AI auto-fill
      };

      console.log('Saving plant to Firestore...');
      const docRef = await addDoc(collection(db, 'plants'), plantData);
      console.log('Plant saved with ID:', docRef.id);

      if (!docRef.id) {
        throw new Error("Failed to generate a valid document ID.");
      }

      // 4. Add Reminders
      if (reminders.length > 0) {
        console.log(`Adding ${reminders.length} reminders...`);
        for (const reminder of reminders) {
          const finalFrequency = reminder.frequency === 'Custom' 
            ? `Every ${reminder.customValue} ${reminder.customUnit}`
            : reminder.frequency;
          
          const finalType = reminder.type === 'other' ? reminder.customTaskName : reminder.type;

          await addDoc(collection(db, `plants/${docRef.id}/schedules`), {
            plantId: docRef.id,
            type: finalType,
            frequency: finalFrequency,
            reminderEnabled: reminder.enabled,
            nextDate: reminder.nextDate ? new Date(reminder.nextDate).toISOString() : new Date().toISOString()
          });
        }
        console.log('Reminders added.');
      }
      
      // 5. Add initial timeline event
      console.log('Adding initial timeline event...');
      await addDoc(collection(db, `plants/${docRef.id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Plant Added',
        description: `Added ${formData.name} to the collection.`
      });
      console.log('Timeline event added.');

      // Navigate to the newly created plant profile
      console.log('Navigating to plant profile...');
      navigate(`/plant/${docRef.id}`);
    } catch (err: any) {
      console.error('Error adding plant:', err);
      let errorMessage = 'Failed to add plant. ';
      
      try {
        const parsedError = JSON.parse(err.message);
        errorMessage += parsedError.error || 'Please check your connection and try again.';
      } catch (e) {
        errorMessage += err.message || 'Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Add New Plant</h1>
        <p className="text-stone-500 mt-1">Tell us about your new green friend and our AI will generate a custom care profile.</p>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8"
      >
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Section 1: Visual Identity */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-stone-900">Visual Identity</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 ml-1">Plant Photo</label>
              <div className="flex items-center gap-6">
                <div 
                  className={cn(
                    "w-32 h-32 rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center relative overflow-hidden group transition-all",
                    imagePreview ? "border-solid border-green-500" : "hover:border-green-400 hover:bg-stone-50"
                  )}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera className="w-8 h-8 text-stone-300 mb-2 group-hover:text-green-500 transition-colors" />
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider group-hover:text-green-600 transition-colors">Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Upload a clear photo of your plant. This helps our AI better understand its current state and growth progress.
                  </p>
                  {!storage && (
                    <p className="text-[10px] text-orange-600 font-bold mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Storage service is currently unavailable. Photos cannot be saved.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Basic Information */}
          <section className="space-y-6 pt-8 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-stone-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-stone-700 ml-1">Plant Name</label>
                  <VoiceInput 
                    onResult={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Say plant name..."
                  />
                </div>
                <input
                  required
                  type="text"
                  placeholder="e.g. My Monstera"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-stone-700 ml-1">Species / Type</label>
                  <VoiceInput 
                    onResult={(text) => setFormData({ ...formData, species: text })}
                    placeholder="Say species name..."
                  />
                </div>
                <input
                  required
                  type="text"
                  placeholder="e.g. Monstera Deliciosa"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                  value={formData.species}
                  onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Section 3: Environment & Location */}
          <section className="space-y-6 pt-8 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-stone-900">Environment & Location</h2>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-stone-700 ml-1">Environment Preference</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isIndoor: true })}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold transition-all border-2",
                    formData.isIndoor 
                      ? "bg-green-50 border-green-600 text-green-700" 
                      : "bg-white border-stone-100 text-stone-500 hover:border-stone-200"
                  )}
                >
                  Indoor
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isIndoor: false })}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold transition-all border-2",
                    !formData.isIndoor 
                      ? "bg-green-50 border-green-600 text-green-700" 
                      : "bg-white border-stone-100 text-stone-500 hover:border-stone-200"
                  )}
                >
                  Outdoor
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 ml-1">Specific Location</label>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="e.g. Living Room, North Garden"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            latitude: pos.coords.latitude, 
                            longitude: pos.coords.longitude,
                            location: prev.location && prev.location !== 'GPS Location' ? prev.location : `GPS Location (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`
                          }));
                        },
                        (err) => {
                          console.error("Geolocation error:", err);
                          alert("Could not get location. Please ensure GPS is enabled.");
                        }
                      );
                    }
                  }}
                  className={cn(
                    "w-full py-3 text-xs font-bold rounded-2xl transition-all uppercase tracking-widest",
                    formData.latitude 
                      ? "bg-blue-50 text-blue-600 border border-blue-100" 
                      : "bg-stone-50 text-stone-500 border border-stone-100 hover:bg-stone-100"
                  )}
                >
                  {formData.latitude ? '📍 GPS Coordinates Captured' : '📍 Capture Current GPS Location'}
                </button>

                {formData.latitude !== undefined && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 ml-1 uppercase">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full px-4 py-3 rounded-xl border border-stone-100 bg-stone-50/50 text-xs font-bold outline-none"
                        value={formData.latitude || ''}
                        readOnly
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 ml-1 uppercase">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full px-4 py-3 rounded-xl border border-stone-100 bg-stone-50/50 text-xs font-bold outline-none"
                        value={formData.longitude || ''}
                        readOnly
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: Growth Details */}
          <section className="space-y-6 pt-8 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-stone-900">Growth Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 ml-1">Current Age</label>
                <input
                  type="text"
                  placeholder="e.g. 2 months"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 ml-1">Plantation Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input
                    type="date"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                    value={formData.plantationDate}
                    onChange={(e) => setFormData({ ...formData, plantationDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 ml-1">Expected Lifespan</label>
                <input
                  type="text"
                  placeholder="e.g. 5-10 years"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                  value={formData.expectedLifespan}
                  onChange={(e) => setFormData({ ...formData, expectedLifespan: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 ml-1">Pot Size / Type</label>
                <input
                  type="text"
                  placeholder="e.g. 10 inch ceramic"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                  value={formData.potSize}
                  onChange={(e) => setFormData({ ...formData, potSize: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 ml-1">Description</label>
              <textarea
                rows={3}
                placeholder="Give a brief story or description of your plant..."
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </section>

          {/* Section 5: AI Care Guide */}
          <section className="space-y-6 pt-8 border-t border-stone-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-bold text-stone-900">AI Care Intelligence</h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={generatingAI}
                  className={cn(
                    "flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50",
                    generatingAI 
                      ? "bg-green-100 text-green-700 animate-pulse" 
                      : "bg-stone-900 text-white hover:bg-stone-800 shadow-lg shadow-stone-200"
                  )}
                >
                  {generatingAI ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {generatingAI ? 'AI is thinking...' : 'Auto-fill Care Guide'}
                </button>
                <AnimatePresence>
                  {aiError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100"
                    >
                      {aiError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <p className="text-xs text-stone-400 -mt-4 ml-1 mb-6">Customize these instructions or let our AI analyze the species for you.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {[
                { id: 'watering', label: 'Watering', placeholder: 'e.g. Water when top inch of soil is dry.' },
                { id: 'sunlight', label: 'Sunlight', placeholder: 'e.g. Thrives in bright, indirect sunlight.' },
                { id: 'temperature', label: 'Temperature', placeholder: 'e.g. Best kept between 18-24°C.' },
                { id: 'humidity', label: 'Humidity', placeholder: 'e.g. Prefers high humidity (60%+).' },
                { id: 'soil', label: 'Soil Type', placeholder: 'e.g. Peat-based mix with perlite.' },
                { id: 'repotting', label: 'Repotting', placeholder: 'e.g. Repot when roots circle the base.' },
              ].map((field) => (
                <div key={field.id} className="space-y-1.5 focus-within:z-10 group relative">
                  <AnimatePresence>
                    {generatingAI && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl"
                      >
                        <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest group-focus-within:text-green-600 transition-colors">
                      {field.label}
                    </label>
                    <VoiceInput 
                      onResult={(text) => setCareGuide(prev => ({ ...prev, [field.id]: (careGuide as any)[field.id] + ((careGuide as any)[field.id] ? ' ' : '') + text }))}
                      placeholder={`Speak ${field.label}...`}
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder={field.placeholder}
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none text-sm resize-none scrollbar-hide bg-stone-50/30 focus:bg-white",
                      generatingAI && "blur-[2px]"
                    )}
                    value={(careGuide as any)[field.id]}
                    onChange={(e) => setCareGuide({ ...careGuide, [field.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </section>
          
          {/* Section 6: Care Reminders */}
          <section className="space-y-6 pt-8 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-stone-900">Custom Care Reminders</h2>
            </div>
            
            <p className="text-xs text-stone-500 -mt-4 ml-1 mb-4">Set up your first care tasks. You can always add more later from the plant profile.</p>

            <div className="space-y-4">
              {/* Existing Reminders List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reminders.map((reminder, index) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={index}
                    className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-green-600">
                        {reminder.type === 'watering' && <Droplets className="w-5 h-5" />}
                        {reminder.type === 'fertilizing' && <Sun className="w-5 h-5" />}
                        {reminder.type === 'repotting' && <History className="w-5 h-5" />}
                        {reminder.type === 'pruning' && <Scissors className="w-5 h-5" />}
                        {reminder.type !== 'watering' && reminder.type !== 'fertilizing' && reminder.type !== 'repotting' && reminder.type !== 'pruning' && <Leaf className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 capitalize">{reminder.type === 'other' ? reminder.customTaskName : reminder.type}</h4>
                        <p className="text-[10px] text-stone-500 font-medium">
                          {reminder.frequency === 'Custom' 
                            ? `Every ${reminder.customValue} ${reminder.customUnit}`
                            : reminder.frequency} • Starts {reminder.nextDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        reminder.enabled ? "text-green-600 bg-green-50" : "text-stone-400 bg-stone-100"
                      )}>
                        {reminder.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveReminder(index)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Add Reminder Form */}
              <div className="p-6 rounded-3xl bg-green-50/30 border border-green-100/50 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Task To Track</label>
                    <div className="flex gap-2">
                      <select 
                        className={cn(
                          "px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold",
                          newReminder.type === 'other' ? "flex-1" : "w-full"
                        )}
                        value={newReminder.type}
                        onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
                      >
                        <option value="watering">Watering</option>
                        <option value="fertilizing">Fertilizing</option>
                        <option value="repotting">Repotting</option>
                        <option value="pruning">Pruning</option>
                        <option value="other">Other</option>
                      </select>
                      {newReminder.type === 'other' && (
                        <input 
                          type="text"
                          placeholder="Task name"
                          className="flex-[2] px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                          value={newReminder.customTaskName}
                          onChange={(e) => setNewReminder({ ...newReminder, customTaskName: e.target.value })}
                        />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Repeat Every</label>
                    <select 
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                      value={newReminder.frequency}
                      onChange={(e) => setNewReminder({ ...newReminder, frequency: e.target.value })}
                    >
                      <option value="Daily">Daily</option>
                      <option value="Every 2 Days">Every 2 Days</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-weekly">Bi-weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {newReminder.frequency === 'Custom' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Custom Interval</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          min="1"
                          className="w-16 px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                          value={newReminder.customValue}
                          onChange={(e) => setNewReminder({ ...newReminder, customValue: e.target.value })}
                        />
                        <select 
                          className="flex-1 px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                          value={newReminder.customUnit}
                          onChange={(e) => setNewReminder({ ...newReminder, customUnit: e.target.value })}
                        >
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Initial Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-stone-200 focus:border-green-500 outline-none transition-all text-sm font-bold"
                      value={newReminder.nextDate}
                      onChange={(e) => setNewReminder({ ...newReminder, nextDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Alerts</label>
                    <button
                      type="button"
                      onClick={() => setNewReminder({ ...newReminder, enabled: !newReminder.enabled })}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border transition-all font-bold text-sm",
                        newReminder.enabled 
                          ? "bg-white border-green-200 text-green-700" 
                          : "bg-stone-50 border-stone-200 text-stone-500"
                      )}
                    >
                      {newReminder.enabled ? <Bell className="w-4 h-4 text-green-600" /> : <BellOff className="w-4 h-4 text-stone-400" />}
                      {newReminder.enabled ? 'Notify Me' : 'No Alerts'}
                    </button>
                  </div>
                  {! (newReminder.frequency === 'Custom') && <div className="hidden md:block"></div>}
                  <div className="flex items-end">
                    <button 
                      type="button"
                      onClick={handleAddReminder}
                      className="w-full py-3.5 rounded-2xl bg-stone-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Reminder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {imageFile ? "Uploading & Saving..." : "Creating Profile..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Add Plant & Generate Profile
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
