import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Bell, Shield, Settings, LogOut, ChevronRight, Mail, Phone, MapPin, Globe, Check, Download, Landmark, Briefcase, Shovel } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

export default function Profile() {
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isGuest = localStorage.getItem('isGuest') === 'true';

  const [notificationSettings, setNotificationSettings] = useState({
    careReminders: true,
    weatherAlerts: true,
    communityUpdates: false,
  });

  const [appSettings, setAppSettings] = useState({
    measurementUnit: 'kg',
  });

  const [farmerProfile, setFarmerProfile] = useState<Partial<UserProfile>>({
    farmerName: '',
    farmName: '',
    farmLocation: '',
    experience: '',
    bio: ''
  });

  useEffect(() => {
    const isGuestUser = localStorage.getItem('isGuest') === 'true';
    if (isGuestUser) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Load additional settings from Firestore if needed
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.notifications) setNotificationSettings(data.notifications);
          if (data.settings) setAppSettings(data.settings);
          setFarmerProfile({
            farmerName: data.farmerName || '',
            farmName: data.farmName || '',
            farmLocation: data.farmLocation || '',
            experience: data.experience || '',
            bio: data.bio || ''
          });
        }
      }
      setLoading(false);
    });
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleToggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveSettings = async () => {
    if (isGuest) return;
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notifications: notificationSettings,
        settings: appSettings,
        ...farmerProfile,
        updatedAt: new Date().toISOString()
      });
      // Show success toast or feedback
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{t('profile')}</h1>
        <p className="text-stone-500 mt-1">{t('account_settings')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: User Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] border border-stone-100 shadow-sm p-8 text-center"
          >
            <div className="relative inline-block mb-4">
              <img
                src={displayUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayUser?.uid}`}
                alt="Avatar"
                className="w-24 h-24 rounded-full border-4 border-stone-50 shadow-sm"
              />
              <div className="absolute bottom-1 right-1 bg-green-600 p-1.5 rounded-full border-2 border-white">
                <Check className="w-3 h-3 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              {farmerProfile.farmerName || displayUser?.displayName || 'User'}
            </h2>
            {farmerProfile.farmName && (
              <p className="text-sm text-green-600 font-bold mt-0.5">{farmerProfile.farmName}</p>
            )}
            <p className="text-xs text-stone-500 mb-6">{displayUser?.email}</p>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <MapPin className="w-4 h-4 text-stone-400" />
                <span className="text-xs font-medium text-stone-600 truncate">
                  {farmerProfile.farmLocation || t('not_provided')}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <Phone className="w-4 h-4 text-stone-400" />
                <span className="text-xs font-medium text-stone-600">
                  {displayUser?.phoneNumber || (isGuest ? '+91 98765 43210' : t('not_provided'))}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-8 flex items-center justify-center gap-2 py-3 px-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-600 rounded-[2rem] p-8 text-white"
          >
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4" />
              GrowMate Premium
            </h3>
            <p className="text-xs text-green-100 mb-6 leading-relaxed">
              Unlock advanced crop analysis, unlimited Farmer GPT consultations, and detailed market insights.
            </p>
            <button className="w-full py-3 bg-white text-green-600 rounded-xl font-bold text-sm hover:bg-green-50 transition-colors">
              Upgrade Now
            </button>
          </motion.div>
        </div>

        {/* Right Column: Settings Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Farmer Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-stone-50 bg-stone-50/50 flex items-center gap-3 text-stone-900">
              <Shovel className="w-5 h-5 text-green-600" />
              <h3 className="font-bold">Farmer Profile</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Farmer Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      value={farmerProfile.farmerName}
                      onChange={(e) => setFarmerProfile(prev => ({ ...prev, farmerName: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Farm Name</label>
                  <div className="relative">
                    <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      value={farmerProfile.farmName}
                      onChange={(e) => setFarmerProfile(prev => ({ ...prev, farmName: e.target.value }))}
                      placeholder="e.g. Green Valley Farm"
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Farm Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      value={farmerProfile.farmLocation}
                      onChange={(e) => setFarmerProfile(prev => ({ ...prev, farmLocation: e.target.value }))}
                      placeholder="e.g. Pune, Maharashtra"
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Experience</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      value={farmerProfile.experience}
                      onChange={(e) => setFarmerProfile(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="e.g. 5+ Years"
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Farmer Bio</label>
                <textarea
                  value={farmerProfile.bio}
                  onChange={(e) => setFarmerProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself and your farm..."
                  rows={3}
                  className="w-full p-4 bg-stone-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500/20 resize-none"
                />
              </div>
            </div>
          </motion.div>

          {/* NotificationsSection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-stone-50 bg-stone-50/50 flex items-center gap-3 text-stone-900">
              <Bell className="w-5 h-5 text-green-600" />
              <h3 className="font-bold">{t('notification_prefs')}</h3>
            </div>
            <div className="p-8 space-y-6">
              {[
                { id: 'careReminders', label: t('care_reminders'), desc: 'Receive alerts for watering, fertilizing, and harvesting.', icon: User },
                { id: 'weatherAlerts', label: t('weather_alerts'), desc: 'Critical weather alerts specific to your farm location.', icon: Globe },
                { id: 'communityUpdates', label: t('community_updates'), desc: 'Updates from the marketplace and community forum.', icon: Globe }
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">{item.label}</h4>
                    <p className="text-xs text-stone-500 mt-1">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggleNotification(item.id as keyof typeof notificationSettings)}
                    className={cn(
                      "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      notificationSettings[item.id as keyof typeof notificationSettings] ? "bg-green-600" : "bg-stone-200"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        notificationSettings[item.id as keyof typeof notificationSettings] ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* App Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-stone-50 bg-stone-50/50 flex items-center gap-3 text-stone-900">
              <Settings className="w-5 h-5 text-green-600" />
              <h3 className="font-bold">{t('app_settings')}</h3>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-bold text-stone-700">{t('language_selection')}</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { code: 'en', name: 'English' },
                    { code: 'hi', name: 'हिन्दी' },
                    { code: 'mr', name: 'मराठी' },
                    { code: 'ta', name: 'தமிழ்' },
                    { code: 'te', name: 'తెలుగు' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as any)}
                      className={cn(
                        "py-3 rounded-2xl text-xs font-bold border transition-all",
                        language === lang.code 
                          ? "bg-green-50 border-green-200 text-green-700 ring-2 ring-green-600/10" 
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      )}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-stone-50">
                <label className="text-sm font-bold text-stone-700 block">{t('measurement_unit')}</label>
                <div className="flex gap-3">
                  {['kg', 'quintal', 'ton'].map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setAppSettings(prev => ({ ...prev, measurementUnit: unit }))}
                      className={cn(
                        "px-6 py-2 rounded-xl text-xs font-bold border transition-all",
                        appSettings.measurementUnit === unit
                          ? "bg-stone-900 border-stone-900 text-white"
                          : "bg-white border-stone-200 text-stone-600"
                      )}
                    >
                      {unit.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-stone-50 border-t border-stone-100 flex justify-end">
              <button
                disabled={saving || isGuest}
                onClick={handleSaveSettings}
                className={cn(
                  "flex items-center gap-2 py-3 px-8 rounded-2xl font-bold transition-all shadow-lg shadow-green-600/10",
                  isGuest 
                    ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 active:scale-95"
                )}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {t('save_changes')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
          
          {/* Download App Section */}
          {isInstallable && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-blue-600 rounded-[2rem] border border-blue-500 shadow-lg shadow-blue-200 p-8 text-white relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Download className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Install GrowMate App
                </h3>
                <p className="text-blue-100 text-sm mb-6 leading-relaxed max-w-sm">
                  Experience GrowMate with faster loading, offline access, and a better mobile experience by installing it on your device.
                </p>
                <button 
                  onClick={handleInstall}
                  className="bg-white text-blue-600 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-blue-50 transition-all active:scale-95 shadow-md"
                >
                  {t('download_app')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Privacy & Security */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group cursor-pointer bg-white rounded-[2rem] border border-stone-100 shadow-sm p-6 flex items-center justify-between hover:border-green-200 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="bg-stone-50 p-3 rounded-2xl group-hover:bg-green-50 transition-colors">
                <Shield className="w-6 h-6 text-stone-400 group-hover:text-green-600" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900">Privacy & Security</h4>
                <p className="text-xs text-stone-500 mt-0.5">Manage your data and account security.</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-green-600 transition-colors" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
