import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, collectionGroup } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Plant, CareSchedule } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Droplets, Sun, History, Leaf, Scissors } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

const taskConfig = {
  watering: { icon: Droplets, color: "bg-blue-50 text-blue-700 border-blue-100" },
  fertilizing: { icon: Sun, color: "bg-orange-50 text-orange-700 border-orange-100" },
  repotting: { icon: History, color: "bg-purple-50 text-purple-700 border-purple-100" },
  pruning: { icon: Scissors, color: "bg-green-50 text-green-700 border-green-100" },
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [plants, setPlants] = useState<Plant[]>([]);
  const [schedules, setSchedules] = useState<CareSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const userId = auth.currentUser?.uid || (isGuest ? 'guest-123' : null);
    
    if (!userId) return;

    // Fetch plants
    const plantsQuery = query(collection(db, 'plants'), where('ownerId', '==', userId));
    const unsubscribePlants = onSnapshot(plantsQuery, (snapshot) => {
      const plantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
      setPlants(plantsData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plants'));

    return () => unsubscribePlants();
  }, []);

  // Effect to manage schedule listeners for each plant
  useEffect(() => {
    if (plants.length === 0) return;

    const scheduleUnsubscribes: (() => void)[] = [];
    const schedulesByPlant: { [plantId: string]: CareSchedule[] } = {};

    plants.forEach(plant => {
      const schedQuery = collection(db, `plants/${plant.id}/schedules`);
      const unsub = onSnapshot(schedQuery, (snapshot) => {
        // Map all schedules for this specific plant
        schedulesByPlant[plant.id] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CareSchedule));
        
        // Flatten all plant schedules into the main state
        const allSchedules = Object.values(schedulesByPlant).flat();
        setSchedules(allSchedules);
      });
      scheduleUnsubscribes.push(unsub);
    });

    return () => scheduleUnsubscribes.forEach(unsub => unsub());
  }, [plants]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  if (loading) return <div className="flex items-center justify-center h-64"><Leaf className="animate-bounce text-green-600 w-8 h-8" /></div>;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Care Calendar</h1>
          <p className="text-stone-500 mt-1">Track your plant care schedule and upcoming tasks.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-stone-100 rounded-2xl p-1 shadow-sm">
          <button onClick={prevMonth} className="p-2 hover:bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 font-bold text-stone-900 min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {/* Add empty slots for the start of the month */}
          {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="h-40 border-b border-r border-stone-50 bg-stone-50/20" />
          ))}
          
          {days.map(day => {
            const daySchedules = schedules.filter(s => isSameDay(parseISO(s.nextDate), day));
            
            return (
              <div key={day.toString()} className={cn(
                "h-40 border-b border-r border-stone-100 p-2 relative group hover:bg-stone-50/50 transition-colors",
                isToday(day) && "bg-green-50/30"
              )}>
                <span className={cn(
                  "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2",
                  isToday(day) ? "bg-green-600 text-white shadow-lg shadow-green-100" : "text-stone-400"
                )}>
                  {format(day, 'd')}
                </span>
                
                <div className="space-y-1 overflow-y-auto max-h-[calc(100%-2.5rem)] pb-1 scrollbar-hide">
                  {daySchedules.map((schedule) => {
                    const plant = plants.find(p => p.id === schedule.plantId);
                    const config = taskConfig[schedule.type] || taskConfig.watering;
                    const Icon = config.icon || Droplets;
                    
                    return (
                      <div 
                        key={schedule.id} 
                        className={cn(
                          "text-[9px] font-bold px-2 py-1.5 rounded-xl truncate flex items-center gap-1.5 border shadow-sm transition-transform hover:scale-[1.02] cursor-default",
                          config.color
                        )}
                        title={`${schedule.type} - ${plant?.name || 'Unknown Plant'}`}
                      >
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{plant?.name || 'Plant'}</span>
                      </div>
                    );
                  })}

                  {daySchedules.length === 0 && isToday(day) && (
                    <p className="text-[10px] text-stone-300 italic text-center mt-4">No tasks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 justify-center items-center bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
        {Object.entries(taskConfig).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <div key={type} className="flex items-center gap-2">
              <div className={cn("p-2 rounded-xl", config.color.split(' ')[0])}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-stone-600 capitalize">{type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
