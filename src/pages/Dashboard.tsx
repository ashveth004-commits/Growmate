import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Plant, CareSchedule } from '../types';
import { Link } from 'react-router-dom';
import { Leaf, Droplets, Thermometer, Sun, Plus, ChevronRight, AlertCircle, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { format, isAfter, parseISO } from 'date-fns';
import WeatherAlerts from '../components/WeatherAlerts';
import { useTranslation } from '../context/LanguageContext';

export default function Dashboard() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [schedules, setSchedules] = useState<CareSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const userId = auth.currentUser?.uid || (isGuest ? 'guest-123' : null);
    
    if (!userId) return;

    const plantsQuery = query(
      collection(db, 'plants'),
      where('ownerId', '==', userId)
    );

    const unsubscribePlants = onSnapshot(plantsQuery, (snapshot) => {
      const plantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
      setPlants(plantsData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plants'));

    return () => unsubscribePlants();
  }, []);

  const upcomingReminders = plants.flatMap(plant => {
    // In a real app, we'd fetch schedules per plant. 
    // For simplicity in this dashboard, we'll just show some mock reminders if schedules aren't loaded yet
    // or we could fetch them here.
    return [];
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Leaf className="animate-bounce text-green-600 w-8 h-8" /></div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
            {t('welcome_back_user')}, {(auth.currentUser?.displayName || (localStorage.getItem('isGuest') === 'true' ? 'Guest' : 'User'))?.split(' ')[0]}!
          </h1>
          <p className="text-stone-500 mt-1">{t('plants_count').replace('{count}', plants.length.toString())}</p>
        </div>
        <Link to="/add-plant" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-100">
          <Plus className="w-5 h-5" />
          {t('add_plant')}
        </Link>
      </header>

      <WeatherAlerts plants={plants} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plants Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900">{t('my_plants')}</h2>
            <Link to="/add-plant" className="text-green-600 text-sm font-semibold hover:underline">{t('view_all')}</Link>
          </div>

          {plants.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center">
              <div className="bg-stone-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Leaf className="text-stone-300 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">{t('no_plants_yet')}</h3>
              <p className="text-stone-500 mb-6 max-w-xs mx-auto">{t('start_garden_msg')}</p>
              <Link to="/add-plant" className="inline-flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-stone-800 transition-all">
                <Plus className="w-5 h-5" />
                {t('add_first_plant')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plants.map((plant) => (
                <motion.div
                   key={plant.id}
                   whileHover={{ y: -4 }}
                   className="bg-white rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all p-4 group"
                >
                  <Link to={`/plant/${plant.id}`} className="flex gap-4">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0">
                      <img 
                        src={plant.photoUrl || `https://picsum.photos/seed/${plant.species}/200/200`} 
                        alt={plant.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="font-bold text-stone-900 truncate">{plant.name}</h3>
                      <p className="text-sm text-stone-500 truncate italic">{plant.species}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                          {plant.healthStatus || 'Healthy'}
                        </span>
                        <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                          {plant.location}
                        </span>
                      </div>
                    </div>
                    <div className="self-center">
                      <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-green-600 transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Reminders & Alerts */}
        <div className="space-y-8">
          <section className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                {t('upcoming_care')}
              </h2>
              <Link to="/calendar" className="text-stone-400 hover:text-stone-600 transition-colors">
                <CalendarIcon className="w-5 h-5" />
              </Link>
            </div>

            <div className="space-y-4">
              {/* Mock reminders for now */}
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-stone-50 transition-colors group cursor-pointer">
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                  <Droplets className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-stone-900">Water Fiddle Leaf</p>
                  <p className="text-xs text-stone-500">Today at 10:00 AM</p>
                </div>
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              </div>

              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-stone-50 transition-colors group cursor-pointer">
                <div className="bg-orange-50 p-3 rounded-xl text-orange-600">
                  <Sun className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-stone-900">Fertilize Monstera</p>
                  <p className="text-xs text-stone-500">Tomorrow</p>
                </div>
              </div>

              <button className="w-full py-3 text-stone-500 text-sm font-semibold hover:text-stone-900 transition-colors border-t border-stone-50 mt-2">
                {t('view_all')}
              </button>
            </div>
          </section>

          <section className="bg-green-600 rounded-3xl p-6 text-white shadow-lg shadow-green-100">
            <h3 className="font-bold text-lg mb-2">{t('ai_seasonal_tip')}</h3>
            <p className="text-green-50 text-sm leading-relaxed mb-4">
              Spring is coming! It's the perfect time to start repotting your indoor plants to give them fresh nutrients for the growing season.
            </p>
            <button className="bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-xl text-sm font-semibold">
              {t('learn_more')}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
