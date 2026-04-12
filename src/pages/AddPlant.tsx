import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generatePlantProfile } from '../services/geminiService';
import { Leaf, MapPin, Calendar as CalendarIcon, Camera, Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

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
    potSize: ''
  });

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
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      // 1. Upload Image if exists
      let photoUrl = '';
      if (imageFile && storage) {
        const storageRef = ref(storage, `plants/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        photoUrl = await getDownloadURL(snapshot.ref);
      } else if (imageFile && !storage) {
        console.warn('Firebase Storage is not available. Skipping image upload.');
      }

      // 2. Generate AI Profile
      const aiProfile = await generatePlantProfile(formData.species, formData.plantationDate);

      // 3. Save to Firestore
      const plantData = {
        ...formData,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        ...aiProfile,
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
              <label className="text-sm font-bold text-stone-700 ml-1">Plant Name</label>
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
              <label className="text-sm font-bold text-stone-700 ml-1">Species / Type</label>
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
            </div>
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
