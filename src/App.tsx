import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { Leaf, LayoutDashboard, Calendar as CalendarIcon, User as UserIcon, Plus, LogOut, MessageCircle, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Pages (to be created)
import Dashboard from './pages/Dashboard';
import AddPlant from './pages/AddPlant';
import PlantProfile from './pages/PlantProfile';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';
import Login from './pages/Login';
import CropPredictor from './pages/CropPredictor';

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
    photoURL: null
  } : null);

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

        <nav className="flex-1 px-4 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link to="/calendar" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <CalendarIcon className="w-5 h-5" />
            Calendar
          </Link>
          <Link to="/crop-predictor" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <TrendingUp className="w-5 h-5" />
            Crop Predictor
          </Link>
          <Link to="/add-plant" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <Plus className="w-5 h-5" />
            Add Plant
          </Link>
          <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 hover:text-green-600 rounded-xl transition-all font-medium">
            <UserIcon className="w-5 h-5" />
            Profile
          </Link>
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <img src={displayUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayUser?.uid}`} alt="Avatar" className="w-8 h-8 rounded-full border border-stone-200" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{displayUser?.displayName || 'User'}</p>
              <p className="text-xs text-stone-500 truncate">{displayUser?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/add-plant" element={<ProtectedRoute><Layout><AddPlant /></Layout></ProtectedRoute>} />
        <Route path="/plant/:id" element={<ProtectedRoute><Layout><PlantProfile /></Layout></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Layout><Calendar /></Layout></ProtectedRoute>} />
        <Route path="/crop-predictor" element={<ProtectedRoute><Layout><CropPredictor /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
