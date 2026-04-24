import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { GrowthLog } from '../types';
import { format, parseISO, subDays, subMonths, subYears, isAfter } from 'date-fns';

interface Props {
  plantId: string;
}

export default function GrowthChart({ plantId }: Props) {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!plantId) return;

    const q = query(
      collection(db, `plants/${plantId}/growthLogs`),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GrowthLog));
      setLogs(logsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [plantId]);

  const filteredData = useMemo(() => {
    if (logs.length === 0) return [];

    const now = new Date();
    let startDate: Date;

    if (timeframe === 'week') startDate = subDays(now, 7);
    else if (timeframe === 'month') startDate = subMonths(now, 1);
    else startDate = subYears(now, 1);

    return logs
      .filter(log => {
        try {
          return isAfter(parseISO(log.date), startDate);
        } catch (e) {
          return false;
        }
      })
      .map(log => ({
        name: format(parseISO(log.date), timeframe === 'year' ? 'MMM d' : 'EEE d'),
        height: log.height,
        foliage: log.foliage,
        fullDate: format(parseISO(log.date), 'PPP')
      }));
  }, [logs, timeframe]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm text-center py-12">
        <div className="bg-stone-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="text-stone-300 w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2">No Growth Data Yet</h3>
        <p className="text-stone-500 text-sm max-w-xs mx-auto">
          Start logging your plant's measurements to see its growth progress over time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-xl text-green-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Growth Analysis</h2>
            <p className="text-xs text-stone-500 font-medium">Height and foliage density tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-xl border border-stone-100">
          {(['week', 'month', 'year'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                timeframe === t 
                  ? "bg-white text-stone-900 shadow-sm" 
                  : "text-stone-400 hover:text-stone-600"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px] w-full">
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFoliage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#a8a29e', fontSize: 10, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#a8a29e', fontSize: 10, fontWeight: 600 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid #f5f5f4',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: '600' }}
                labelStyle={{ fontSize: '10px', color: '#a8a29e', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey="height" 
                name="Height (cm)"
                stroke="#16a34a" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorHeight)" 
              />
              <Area 
                type="monotone" 
                dataKey="foliage" 
                name="Foliage Density"
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorFoliage)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-stone-400 text-sm">
            No data for the selected timeframe.
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-stone-50 flex items-center justify-between">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-600" />
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Height</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Foliage</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-stone-400">
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{filteredData.length} records in view</span>
        </div>
      </div>
    </div>
  );
}
