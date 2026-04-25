import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, Download, Filter, Calendar as CalendarIcon, 
  TrendingDown, TrendingUp, ArrowRightLeft, Search, 
  X, Sprout, Droplets, Scissors, DollarSign, Shield, Edit2, Trash2,
  ChevronDown, AlertCircle
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp, getDocs } from 'firebase/firestore';
import { FarmDiaryEntry } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const CATEGORIES = [
  { name: 'Planting', icon: Sprout, color: 'text-green-600', bg: 'bg-green-50' },
  { name: 'Fertilizing', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Harvesting', icon: Scissors, color: 'text-orange-600', bg: 'bg-orange-50' },
  { name: 'Expense', icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50' },
  { name: 'Irrigation', icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { name: 'Pest Control', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'General', icon: Edit2, color: 'text-stone-600', bg: 'bg-stone-50' }
] as const;

export default function FarmDiary() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<FarmDiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FarmDiaryEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Filters
  const [activeTab, setActiveTab] = useState<string>('All');
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'General' as FarmDiaryEntry['category'],
    date: format(new Date(), 'yyyy-MM-dd'),
    expense: '',
    income: '',
    notes: ''
  });

  useEffect(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const userId = auth.currentUser?.uid || (isGuest ? 'guest-123' : null);
    
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'diaryEntries'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as FarmDiaryEntry));
      setEntries(docs);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
      handleFirestoreError(error, OperationType.GET, 'diaryEntries');
    });

    return () => unsubscribe();
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesCategory = activeTab === 'All' || entry.category === activeTab;
      const entryDate = entry.date;
      const matchesDate = isWithinInterval(parseISO(entryDate), {
        start: parseISO(dateRange.from),
        end: parseISO(dateRange.to)
      });
      return matchesCategory && matchesDate;
    });
  }, [entries, activeTab, dateRange]);

  const stats = useMemo(() => {
    const totalEntries = filteredEntries.length;
    const totalExpenses = filteredEntries.reduce((sum, entry) => sum + (entry.expense || 0), 0);
    const totalIncome = filteredEntries.reduce((sum, entry) => sum + (entry.income || 0), 0);
    const profit = totalIncome - totalExpenses;

    return { totalEntries, totalExpenses, totalIncome, profit };
  }, [filteredEntries]);

  const chartData = useMemo(() => {
    // Group totals by date for standard chart
    const dataMap = new Map();
    filteredEntries.forEach(entry => {
      const date = format(parseISO(entry.date), 'MMM dd');
      if (!dataMap.has(date)) {
        dataMap.set(date, { date, income: 0, expense: 0 });
      }
      const data = dataMap.get(date);
      data.income += (entry.income || 0);
      data.expense += (entry.expense || 0);
    });
    return Array.from(dataMap.values()).reverse();
  }, [filteredEntries]);

  const categoryData = useMemo(() => {
    const dataMap = new Map();
    filteredEntries.forEach(entry => {
      if (!dataMap.has(entry.category)) {
        dataMap.set(entry.category, 0);
      }
      // Use expenses for pie chart breakdown
      dataMap.set(entry.category, dataMap.get(entry.category) + (entry.expense || 0));
    });
    return Array.from(dataMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const payload = {
      userId: auth.currentUser.uid,
      title: formData.title,
      category: formData.category,
      date: formData.date,
      expense: Number(formData.expense) || 0,
      income: Number(formData.income) || 0,
      notes: formData.notes,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingEntry) {
        await updateDoc(doc(db, 'diaryEntries', editingEntry.id), payload);
      } else {
        await addDoc(collection(db, 'diaryEntries'), payload);
      }
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'diaryEntries');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'General',
      date: format(new Date(), 'yyyy-MM-dd'),
      expense: '',
      income: '',
      notes: ''
    });
    setEditingEntry(null);
  };

  const handleDelete = async (id: string) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    
    const id = showDeleteConfirm;
    // We'll use a temporary state for the loading spinner on the button
    // But since entries are synced via onSnapshot, it will disappear quickly
    try {
      await deleteDoc(doc(db, 'diaryEntries', id));
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Failed to delete entry. Please check your connection.");
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add GrowMate header
    doc.setFontSize(22);
    doc.setTextColor(21, 128, 61); // text-green-700
    doc.text('GrowMate Farm Diary', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 28);
    doc.text(`Period: ${format(parseISO(dateRange.from), 'dd MMM')} to ${format(parseISO(dateRange.to), 'dd MMM yyyy')}`, 14, 34);

    // Summary stats
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Summary:', 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Entries: ${stats.totalEntries}`, 14, 52);
    doc.text(`Total Income: INR ${stats.totalIncome.toLocaleString()}`, 14, 58);
    doc.text(`Total Expenses: INR ${stats.totalExpenses.toLocaleString()}`, 14, 64);
    doc.text(`Net Profit: INR ${stats.profit.toLocaleString()}`, 14, 70);

    const tableData = filteredEntries.map(entry => [
      format(parseISO(entry.date), 'dd MMM yyyy'),
      entry.category,
      entry.title,
      entry.expense ? `INR ${entry.expense.toLocaleString()}` : '-',
      entry.income ? `INR ${entry.income.toLocaleString()}` : '-'
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['Date', 'Category', 'Activity', 'Expense', 'Income']],
      body: tableData,
      headStyles: { fillColor: [21, 128, 61], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 80 },
    });

    doc.save(`GrowMate_Diary_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Category', 'Title', 'Expense', 'Income', 'Notes'];
    const rows = filteredEntries.map(entry => [
      entry.date,
      entry.category,
      `"${entry.title.replace(/"/g, '""')}"`,
      entry.expense || 0,
      entry.income || 0,
      `"${(entry.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `GrowMate_Diary_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#6366f1', '#78716c'];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-green-700" />
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{t('farm_diary')}</h1>
          </div>
          <p className="text-stone-500 font-medium">{t('log_daily_activities')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:bg-stone-50 transition-colors border-r border-stone-100"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              CSV
            </button>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-900/10 transition-all font-bold"
          >
            <Plus className="w-5 h-5" />
            {t('add_entry')}
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-stone-50/50 border border-stone-200 p-6 rounded-3xl text-center space-y-2">
          <div className="text-3xl font-bold text-stone-900">{stats.totalEntries}</div>
          <div className="text-sm font-medium text-stone-500 uppercase tracking-widest">{t('total_entries')}</div>
        </div>
        <div className="bg-stone-50/50 border border-stone-200 p-6 rounded-3xl text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-3xl font-bold text-red-600">
            <TrendingDown className="w-6 h-6" />
            ₹{stats.totalExpenses.toLocaleString()}
          </div>
          <div className="text-sm font-medium text-stone-500 uppercase tracking-widest">{t('expenses')}</div>
        </div>
        <div className="bg-stone-50/50 border border-stone-200 p-6 rounded-3xl text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-3xl font-bold text-green-600">
            <TrendingUp className="w-6 h-6" />
            ₹{stats.totalIncome.toLocaleString()}
          </div>
          <div className="text-sm font-medium text-stone-500 uppercase tracking-widest">{t('income')}</div>
        </div>
        <div className="bg-stone-50/50 border border-stone-200 p-6 rounded-3xl text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-3xl font-bold text-stone-900">
            <ArrowRightLeft className="w-6 h-6 text-stone-400" />
            {stats.profit >= 0 ? '+' : ''}₹{stats.profit.toLocaleString()}
          </div>
          <div className="text-sm font-medium text-stone-500 uppercase tracking-widest">{t('profit')}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-100 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              {t('income_vs_expenses')}
            </h3>
            <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-sm" /> Income</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-sm" /> Expenses</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f5f5f4'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-stone-100 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              {t('expense_breakdown')}
            </h3>
            <div className="text-xs font-bold text-stone-400 uppercase">Total: ₹{stats.totalExpenses.toLocaleString()}</div>
          </div>
          <div className="h-64 flex flex-col md:flex-row">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap md:flex-col justify-center gap-3 mt-4 md:mt-0 md:pl-4">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs font-medium text-stone-600">
                  <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* List / Filters Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
            {['All', ...CATEGORIES.map(c => c.name)].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === cat 
                    ? "bg-green-600 text-white shadow-md" 
                    : "text-stone-500 hover:text-stone-800"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm">
              <CalendarIcon className="w-4 h-4 text-stone-400" />
              <input 
                type="date" 
                value={dateRange.from} 
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="bg-transparent border-none p-0 focus:ring-0 text-stone-600 text-xs font-bold"
              />
              <span className="text-stone-300">→</span>
              <input 
                type="date" 
                value={dateRange.to} 
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="bg-transparent border-none p-0 focus:ring-0 text-stone-600 text-xs font-bold"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
             <div className="flex justify-center py-20">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
             </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-20 bg-stone-50/50 border border-dashed border-stone-200 rounded-3xl">
              <BookOpen className="w-12 h-12 text-stone-200 mx-auto mb-4" />
              <p className="text-stone-500">No activities found in this period.</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={entry.id} 
                className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center",
                      CATEGORIES.find(c => c.name === entry.category)?.bg || 'bg-stone-50'
                    )}>
                      {(() => {
                        const Icon = CATEGORIES.find(c => c.name === entry.category)?.icon || Edit2;
                        return <Icon className={cn("w-7 h-7", CATEGORIES.find(c => c.name === entry.category)?.color || 'text-stone-600')} />;
                      })()}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-stone-900 tracking-tight">{entry.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-stone-400 font-medium">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {format(parseISO(entry.date), 'dd MMM yyyy')}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-stone-200" />
                        <span className="flex items-center gap-1">
                          {entry.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right space-y-1">
                      {entry.expense > 0 && (
                        <div className="flex items-center gap-1.5 text-red-600 font-bold">
                          <TrendingDown className="w-4 h-4" />
                          ₹{entry.expense.toLocaleString()}
                        </div>
                      )}
                      {entry.income > 0 && (
                        <div className="flex items-center gap-1.5 text-green-600 font-bold">
                          <TrendingUp className="w-4 h-4" />
                          ₹{entry.income.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingEntry(entry);
                          setFormData({
                            title: entry.title,
                            category: entry.category,
                            date: entry.date,
                            expense: entry.expense?.toString() || '',
                            income: entry.income?.toString() || '',
                            notes: entry.notes || ''
                          });
                          setShowAddModal(true);
                        }}
                        className="p-2 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {entry.notes && (
                  <p className="mt-4 text-sm text-stone-500 bg-stone-50 px-4 py-2 rounded-xl italic">
                    "{entry.notes}"
                  </p>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <BookOpen className="w-6 h-6 text-green-700" />
                    </div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
                      {editingEntry ? 'Edit Entry' : t('new_entry')}
                    </h2>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="p-2 text-stone-400 hover:text-stone-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-1">
                      <input 
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={t('activity_placeholder')}
                        className="w-full px-5 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500/20 text-stone-900 font-medium placeholder:text-stone-400"
                      />
                    </div>
                    <div className="relative">
                      <select 
                        required
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as FarmDiaryEntry['category'] }))}
                        className="w-full px-5 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500/20 text-stone-900 font-medium appearance-none"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative">
                      <input 
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-12 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500/20 text-stone-900 font-medium"
                      />
                      <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        value={formData.expense}
                        onChange={(e) => setFormData(prev => ({ ...prev, expense: e.target.value }))}
                        placeholder="Expense ₹"
                        className="w-full px-5 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500/20 text-stone-900 font-medium placeholder:text-stone-400"
                      />
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        value={formData.income}
                        onChange={(e) => setFormData(prev => ({ ...prev, income: e.target.value }))}
                        placeholder="Income ₹"
                        className="w-full px-5 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500/20 text-stone-900 font-medium placeholder:text-stone-400"
                      />
                    </div>
                  </div>

                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add details... (optional)"
                    rows={4}
                    className="w-full px-5 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500/20 text-stone-900 font-medium placeholder:text-stone-400 resize-none"
                  />

                  <div className="flex items-center justify-end gap-3 pt-6">
                    <button 
                      type="button" 
                      onClick={() => setShowAddModal(false)}
                      className="px-8 py-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors font-bold"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      type="submit" 
                      className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-900/10 transition-all font-bold"
                    >
                      {t('save_entry')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Portal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="text-red-600 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Delete Diary Entry?</h3>
              <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                This will permanently remove this activity log. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
