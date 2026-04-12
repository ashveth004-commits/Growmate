import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Plant, CareSchedule } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Droplets, Sun, History, Leaf } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { cn } from '../lib/utils';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const plantsQuery = query(collection(db, 'plants'), where('ownerId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(plantsQuery, (snapshot) => {
      setPlants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plants'));

    return () => unsubscribe();
  }, []);

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
            <div key={`empty-${i}`} className="h-32 border-b border-r border-stone-50 bg-stone-50/20" />
          ))}
          
          {days.map(day => (
            <div key={day.toString()} className={cn(
              "h-32 border-b border-r border-stone-100 p-2 relative group hover:bg-stone-50/50 transition-colors",
              isToday(day) && "bg-green-50/30"
            )}>
              <span className={cn(
                "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2",
                isToday(day) ? "bg-green-600 text-white shadow-lg shadow-green-100" : "text-stone-400"
              )}>
                {format(day, 'd')}
              </span>
              
              <div className="space-y-1 overflow-y-auto max-h-[calc(100%-2rem)]">
                {/* Mock events for visualization */}
                {isToday(day) && (
                  <div className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-lg truncate flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    Water Fiddle
                  </div>
                )}
                {day.getDate() % 5 === 0 && (
                  <div className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-lg truncate flex items-center gap-1">
                    <Sun className="w-3 h-3" />
                    Fertilize Lily
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
