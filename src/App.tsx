import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { Leaf, LayoutDashboard, Calendar as CalendarIcon, User as UserIcon, Plus, LogOut, MessageCircle, TrendingUp, ShoppingBag, Video, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { LanguageProvider, useTranslation } from './context/LanguageContext';

// Pages (to be created)
import Dashboard from './pages/Dashboard';
import AddPlant from './pages/AddPlant';
import PlantProfile from './pages/PlantProfile';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';
import Login from './pages/Login';
import CropPredictor from './pages/CropPredictor';
import Marketplace from './pages/Marketplace';
import FarmerGPT from './pages/FarmerGPT';
import PlantationGuide from './pages/PlantationGuide';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (isGuest) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const isGuest = localStorage.getItem('isGuest') === 'true';
  if (loading) return <div className="flex items-center justify-center h-screen"><Leaf className="animate-bounce text-green-600 w-12 h-12" /></div>;
  if (!user && !isGuest) return <Navigate to="/login" />;

  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { t, language, setLanguage } = useTranslation();
  const isGuest = localStorage.getItem('isGuest') === 'true';

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUser(user));
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('isGuest');
    await signOut(auth);
    navigate('/login');
  };

  const displayUser = user || (isGuest ? {
    displayName: 'Guest User',
    email: 'guest@example.com',
    uid: 'guest-123',
    photoURL: null,
    phoneNumber: null
  } : null);

  const displayName = displayUser?.displayName || displayUser?.phoneNumber || 'User';
  const displayEmail = displayUser?.email || (displayUser?.phoneNumber ? 'Phone Verified' : '');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'mr', name: 'मराठी' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'te', name: 'తెలుగు' }
  ] as const;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-stone-200 flex flex-col sticky top-0 z-50 md:h-screen">
        <div className="p-6 flex items-center gap-2">
          <div className="bg-green-600 p-2 rounded-xl">
            <Leaf className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">GrowMate</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <LayoutDashboard className="w-5 h-5" />
            {t('dashboard')}
          </Link>
          <Link to="/farmer-gpt" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <MessageCircle className="w-5 h-5 text-green-600" />
            {t('farmer_gpt')}
          </Link>
          <Link to="/guide" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <Video className="w-5 h-5" />
            {t('plantation_guide')}
          </Link>
          <Link to="/calendar" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <CalendarIcon className="w-5 h-5" />
            {t('calendar')}
          </Link>
          <Link to="/crop-predictor" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <TrendingUp className="w-5 h-5" />
            {t('crop_predictor')}
          </Link>
          <Link to="/marketplace" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <ShoppingBag className="w-5 h-5" />
            {t('marketplace')}
          </Link>
          <Link to="/add-plant" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <Plus className="w-5 h-5" />
            {t('add_plant')}
          </Link>
          <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <UserIcon className="w-5 h-5" />
            {t('profile')}
          </Link>
        </nav>

        <div className="p-4 space-y-4 border-t border-stone-100">
          {/* Language Selector */}
          <div className="px-4">
            <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              <Languages className="w-3 h-3" />
              {t('language')}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    "py-2 rounded-lg text-xs font-bold transition-all border",
                    language === lang.code 
                      ? "bg-green-600 text-white border-green-600 shadow-md" 
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  )}
                  title={lang.name}
                >
                  {lang.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <img src={displayUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayUser?.uid}`} alt="Avatar" className="w-8 h-8 rounded-full border border-stone-200" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{displayName}</p>
              <p className="text-xs text-stone-500 truncate">{displayEmail}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium">
            <LogOut className="w-5 h-5" />
            {t('logout')}
          </button>
          <p className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em] text-center">
            an ashveth creation
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/add-plant" element={<ProtectedRoute><Layout><AddPlant /></Layout></ProtectedRoute>} />
          <Route path="/plant/:id" element={<ProtectedRoute><Layout><PlantProfile /></Layout></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Layout><Calendar /></Layout></ProtectedRoute>} />
          <Route path="/crop-predictor" element={<ProtectedRoute><Layout><CropPredictor /></Layout></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><Layout><Marketplace /></Layout></ProtectedRoute>} />
          <Route path="/farmer-gpt" element={<ProtectedRoute><Layout><FarmerGPT /></Layout></ProtectedRoute>} />
          <Route path="/guide" element={<ProtectedRoute><Layout><PlantationGuide /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
