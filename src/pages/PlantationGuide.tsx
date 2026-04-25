import { useState } from 'react';
import { Play, BookOpen, Droplets, Sprout, Star, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTranslation } from '../context/LanguageContext';

interface VideoGuide {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  category: 'Planting' | 'Caring' | 'Fertilizers' | 'Pruning';
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  duration: string;
}

const VIDEOS: VideoGuide[] = [
  {
    id: '1',
    title: 'How to Plant a Tree: Ultimate Guide',
    description: 'A comprehensive step-by-step guide on how to plant a tree correctly to ensure it thrives for generations.',
    youtubeId: 'IByYp-M8Z-o',
    category: 'Planting',
    difficulty: 'Beginner',
    duration: '12:20'
  },
  {
    id: '2',
    title: 'Tree Planting 101',
    description: 'Learn the basics of tree planting from experts, including site selection and soil preparation.',
    youtubeId: '7p3L1_vK7aI',
    category: 'Planting',
    difficulty: 'Beginner',
    duration: '8:45'
  },
  {
    id: '3',
    title: 'Watering and Caring for Trees',
    description: 'Master the art of watering and maintaining your trees throughout the seasons.',
    youtubeId: 'R6zNKkv7as8',
    category: 'Caring',
    difficulty: 'Beginner',
    duration: '9:30'
  },
  {
    id: '4',
    title: 'Organic Fertilizers Explained',
    description: 'Everything you need to know about fertilizing your trees and plants organically.',
    youtubeId: 'uJj1WwK_n0w',
    category: 'Fertilizers',
    difficulty: 'Beginner',
    duration: '10:20'
  },
  {
    id: '5',
    title: 'Pruning Young Trees',
    description: 'Practical tips and techniques for pruning young trees to promote healthy growth and structure.',
    youtubeId: 'qS0Xo6WdZrc',
    category: 'Pruning',
    difficulty: 'Intermediate',
    duration: '14:15'
  },
  {
    id: '6',
    title: 'Tree Care: Expert Tips',
    description: 'Advanced care tips for keeping your trees healthy, even in challenging environments.',
    youtubeId: 'X8m8H8-6w_M',
    category: 'Caring',
    difficulty: 'Intermediate',
    duration: '11:15'
  }
];

export default function PlantationGuide() {
  const [selectedVideo, setSelectedVideo] = useState<VideoGuide | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  const filteredVideos = VIDEOS.filter(v => {
    const matchesCategory = activeCategory === 'All' || v.category === activeCategory;
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', 'Planting', 'Caring', 'Fertilizers', 'Pruning'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <BookOpen className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">{t('learning_center')}</span>
          </div>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight">{t('plantation_guide')}</h1>
          <p className="text-stone-500 max-w-xl">{t('plantation_guide_desc')}</p>
        </div>
      </header>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-3xl border border-stone-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={t('search_guides')}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all",
                activeCategory === category 
                  ? "bg-green-600 text-white shadow-lg shadow-green-200" 
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              {category === 'All' ? t('all_categories') : t(category.toLowerCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredVideos.map((video) => (
            <motion.div
              layout
              key={video.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative aspect-video">
                <img 
                  src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} 
                  alt={video.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-sm p-4 rounded-full scale-90 group-hover:scale-100 transition-all transform duration-300 shadow-2xl">
                    <Play className="w-6 h-6 text-green-600 fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {t(video.category.toLowerCase())}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                  {video.duration}
                </div>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    video.difficulty === 'Beginner' ? "bg-green-500" : 
                    video.difficulty === 'Intermediate' ? "bg-amber-500" : "bg-red-500"
                  )} />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    {t(video.difficulty.toLowerCase())}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-stone-900 group-hover:text-green-600 transition-colors line-clamp-1">
                  {video.title}
                </h3>
                <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">
                  {video.description}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
              className="absolute inset-0 bg-stone-900/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="aspect-video w-full bg-stone-800">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${selectedVideo.youtubeId}?autoplay=1&rel=0&enablejsapi=1&origin=${window.location.origin}`}
                  title={selectedVideo.title}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <div className="p-8 bg-stone-900 text-white">
                <div className="flex justify-between items-start gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-xs font-bold uppercase tracking-widest bg-green-400/10 px-3 py-1 rounded-full">{t(selectedVideo.category.toLowerCase())}</span>
                      <span className="text-stone-500 text-xs font-bold uppercase tracking-widest bg-stone-500/10 px-3 py-1 rounded-full">{t(selectedVideo.difficulty.toLowerCase())}</span>
                    </div>
                    <h2 className="text-3xl font-bold leading-tight">{selectedVideo.title}</h2>
                    <p className="text-stone-400 text-base max-w-3xl leading-relaxed">{selectedVideo.description}</p>
                    <div className="pt-4 flex gap-3">
                      <a 
                        href={`https://www.youtube.com/watch?v=${selectedVideo.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold text-sm inline-flex items-center gap-2 transition-all shadow-lg shadow-red-900/20 active:scale-95"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Watch on YouTube
                      </a>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedVideo(null)}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 shadow-lg shrink-0"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Additional Tips Section */}
      <section className="bg-stone-900 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative border border-white/5">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              {t('quick_tips_title').split('Thriving')[0]} <span className="text-green-500 underline decoration-green-500/30 underline-offset-8">Thriving Trees</span>
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0">
                  <Droplets className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="font-bold text-white mb-1 text-lg">{t('deep_watering')}</p>
                  <p className="text-sm text-stone-400 leading-relaxed">Always water the roots, not the leaves. Deep infrequent watering is better than shallow daily watering to encourage deep root growth.</p>
                </div>
              </div>
              <div className="flex gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0">
                  <Sprout className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="font-bold text-white mb-1 text-lg">{t('mulching_matters')}</p>
                  <p className="text-sm text-stone-400 leading-relaxed">Apply a 2-3 inch layer of organic mulch around the base, but keep it at least 3 inches away from the trunk to prevent rot.</p>
                </div>
              </div>
              <div className="flex gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0">
                  <Star className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="font-bold text-white mb-1 text-lg">{t('soil_foundation')}</p>
                  <p className="text-sm text-stone-400 leading-relaxed">Test your soil pH before planting. Most trees prefer slightly acidic to neutral soil (6.0 - 7.0) for optimal nutrient uptake.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=1000" 
              alt="People planting trees" 
              className="rounded-[2.5rem] shadow-2xl transform md:rotate-2 hover:rotate-0 transition-transform duration-700"
            />
            <a 
              href="https://www.arborday.org/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="absolute -bottom-6 -left-6 p-8 bg-green-600 rounded-[2rem] shadow-2xl hidden lg:block border border-green-500 scale-90 hover:scale-100 transition-all duration-300 group cursor-pointer"
            >
              <p className="text-2xl font-bold text-white group-hover:translate-x-1 transition-transform">{t('join_community')}</p>
              <p className="text-green-100 font-medium opacity-90">{t('plant_million_trees')}</p>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
