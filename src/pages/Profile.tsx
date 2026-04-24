import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { User as UserIcon, Mail, Shield, Settings, Bell, Leaf, Save, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isGuest = localStorage.getItem('isGuest') === 'true';

  useEffect(() => {
    const userId = auth.currentUser?.uid || (isGuest ? 'guest-123' : null);
    
    if (!userId) return;

    const fetchProfile = async () => {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else if (isGuest) {
        setProfile({
          uid: 'guest-123',
          email: 'guest@example.com',
          displayName: 'Guest User',
          photoURL: '',
          role: 'user',
          createdAt: new Date().toISOString()
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const displayUser = auth.currentUser || (isGuest ? {
    displayName: 'Guest User',
    email: 'guest@example.com',
    uid: 'guest-123',
    photoURL: null,
    phoneNumber: null
  } : null);

  const displayName = displayUser?.displayName || displayUser?.phoneNumber || 'User';
  const displayEmail = displayUser?.email || (displayUser?.phoneNumber ? 'Phone Verified' : '');

  if (loading) return <div className="flex items-center justify-center h-64"><Leaf className="animate-bounce text-green-600 w-8 h-8" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Profile & Settings</h1>
        <p className="text-stone-500 mt-1">Manage your account and plant care preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8 text-center">
            <div className="relative inline-block mb-4">
              <img 
                src={displayUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayUser?.uid}`} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full border-4 border-stone-50 shadow-inner"
              />
              <div className="absolute bottom-0 right-0 bg-green-600 p-2 rounded-full border-4 border-white">
                <Settings className="text-white w-4 h-4" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-stone-900">{displayName}</h2>
            <p className="text-stone-500 text-sm">{displayEmail}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-stone-600">
              <Shield className="w-3 h-3" />
              {profile?.role || 'User'}
            </div>
          </div>

          <nav className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <button className="w-full flex items-center gap-3 px-6 py-4 text-stone-900 hover:bg-stone-50 transition-all font-bold text-sm border-b border-stone-50">
              <UserIcon className="w-5 h-5 text-stone-400" />
              Personal Info
            </button>
            <button className="w-full flex items-center gap-3 px-6 py-4 text-stone-500 hover:bg-stone-50 transition-all font-bold text-sm border-b border-stone-50">
              <Bell className="w-5 h-5 text-stone-400" />
              Notifications
            </button>
            <button className="w-full flex items-center gap-3 px-6 py-4 text-stone-500 hover:bg-stone-50 transition-all font-bold text-sm">
              <Shield className="w-5 h-5 text-stone-400" />
              Privacy & Security
            </button>
          </nav>
        </div>

        <div className="md:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8">
            <h3 className="text-lg font-bold text-stone-900 mb-6">Personal Information</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input
                    type="text"
                    defaultValue={displayName === displayUser?.phoneNumber ? '' : displayName}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 focus:border-green-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input
                    disabled
                    type="email"
                    defaultValue={displayUser?.email || ''}
                    placeholder="No email provided"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 ml-1">Phone Number</label>
                <div className="relative">
                  <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input
                    disabled
                    type="tel"
                    defaultValue={displayUser?.phoneNumber || ''}
                    placeholder="No phone number provided"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed outline-none"
                  />
                </div>
              </div>
              <button className="flex items-center gap-2 bg-stone-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-stone-800 transition-all ml-auto">
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8">
            <h3 className="text-lg font-bold text-stone-900 mb-6">Notification Preferences</h3>
            <div className="space-y-4">
              {[
                { label: 'Watering Reminders', desc: 'Get notified when your plants need water.' },
                { label: 'Fertilizer Alerts', desc: 'Monthly schedule for your plants nutrition.' },
                { label: 'Health Warnings', desc: 'AI alerts when potential issues are detected.' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-stone-50 transition-all group">
                  <div>
                    <p className="font-bold text-stone-900">{item.label}</p>
                    <p className="text-xs text-stone-500">{item.desc}</p>
                  </div>
                  <div className="w-12 h-6 bg-green-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
