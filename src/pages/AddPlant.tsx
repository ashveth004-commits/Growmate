import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generatePlantProfile } from '../services/geminiService';
import { Leaf, MapPin, Calendar as CalendarIcon, Camera, Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
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
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleGenerateAI = async () => {
    if (!formData.species) return;
    setGeneratingAI(true);
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
    } catch (error) {
      console.error('Error generating AI profile:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const userId = auth.currentUser?.uid || (isGuest ? 'guest-123' : null);
    
    if (!userId) return;

    setLoading(true);
    try {
      // 1. Upload Image if exists
      let photoUrl = '';
      if (imageFile && storage) {
        const storageRef = ref(storage, `plants/${userId}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        photoUrl = await getDownloadURL(snapshot.ref);
      } else if (imageFile && !storage) {
        console.warn('Firebase Storage is not available. Skipping image upload.');
      }

      // 2. Prepare Final Data
      // If user hasn't generated AI profile yet, we do it in the background or use placeholders
      let aiProfile: any = formData.expectedLifespan ? { ...formData } : null;
      
      if (!aiProfile) {
        try {
          aiProfile = await generatePlantProfile(formData.species, formData.plantationDate);
        } catch (e) {
          console.warn("AI profile generation failed, using defaults");
          aiProfile = { careGuide: {} };
        }
      }

      // 3. Merge values correctly
      const finalCareGuide = { 
        ...(aiProfile?.careGuide || {}),
        ...Object.fromEntries(
          Object.entries(careGuide).filter(([_, v]) => v.trim() !== '')
        )
      };

      // 4. Save to Firestore
      const plantData = {
        ...formData,
        ...aiProfile,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        ownerId: userId,
        createdAt: serverTimestamp(),
        careGuide: finalCareGuide,
        photoUrl,
        healthStatus: 'Healthy',
        age: 'Just started'
      };

      const docRef = await addDoc(collection(db, 'plants'), plantData);
      
      // 3. Add initial timeline event
      await addDoc(collection(db, `plants/${docRef.id}/timeline`), {
        date: new Date().toISOString(),
        type: 'Plant Added',
        description: `Added ${formData.name} to the collection.`
      });

      navigate(`/plant/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'plants');
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

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 ml-1">Location</label>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="e.g. Living Room"
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
                    "w-full py-2 text-[10px] font-bold rounded-xl transition-all uppercase tracking-widest",
                    formData.latitude 
                      ? "bg-blue-50 text-blue-600 border border-blue-100" 
                      : "bg-stone-50 text-stone-500 border border-stone-100 hover:bg-stone-100"
                  )}
                >
                  {formData.latitude ? '📍 GPS Coordinates Captured' : '📍 Capture Current GPS Location'}
                </button>

                {formData.latitude !== undefined && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 ml-1 uppercase">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        className="w-full px-3 py-2 rounded-xl border border-stone-100 bg-stone-50/50 text-xs font-bold outline-none focus:border-green-500 transition-all"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-400 ml-1 uppercase">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        className="w-full px-3 py-2 rounded-xl border border-stone-100 bg-stone-50/50 text-xs font-bold outline-none focus:border-green-500 transition-all"
                        value={formData.longitude || ''}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                      />
                    </div>
                  </div>
                )}
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
              placeholder="Tell us a bit about this plant..."
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-stone-700 ml-1">Environment</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isIndoor: true })}
                className={cn(
                  "flex-1 py-3 rounded-2xl font-semibold transition-all border-2",
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
                  "flex-1 py-3 rounded-2xl font-semibold transition-all border-2",
                  !formData.isIndoor 
                    ? "bg-green-50 border-green-600 text-green-700" 
                    : "bg-white border-stone-100 text-stone-500 hover:border-stone-200"
                )}
              >
                Outdoor
              </button>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <label className="text-sm font-bold text-stone-700 ml-1">Care Guide Details</label>
                <p className="text-[10px] text-stone-400 ml-1">Customize the care instructions or use our AI to suggest them.</p>
              </div>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={generatingAI || !formData.species}
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
            </div>
            
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
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Generating AI Care Profile...
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
