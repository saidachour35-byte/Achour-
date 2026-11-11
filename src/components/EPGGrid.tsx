import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, ChevronLeft, ChevronRight, Tv, Search, Filter } from 'lucide-react';
import { AppSettings, Channel, EPGProgram, EPGData } from '../types';
import { useI18n } from '../utils/i18n';

interface EPGGridProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  epgData: EPGData;
  onSelectChannel: (channel: Channel) => void;
  settings: AppSettings;
}

const HOURS_TO_SHOW = 24;
const PIXELS_PER_MINUTE = 4; // Scale for the grid

export default function EPGGrid({ isOpen, onClose, channels, epgData, onSelectChannel, settings }: EPGGridProps) {
  const { t, isRtl } = useI18n(settings.language);
  const [currentDayOffset, setCurrentDayOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  // Update "now" indicator every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    return channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [channels, searchQuery]);

  const timelineStartTime = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + currentDayOffset);
    return start;
  }, [now, currentDayOffset]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 0; i < HOURS_TO_SHOW * 2; i++) { // 30 min intervals
      const time = new Date(timelineStartTime);
      time.setMinutes(i * 30);
      slots.push(time);
    }
    return slots;
  }, [timelineStartTime]);

  const getProgramWidth = (start: Date, stop: Date) => {
    const durationInMinutes = (stop.getTime() - start.getTime()) / (1000 * 60);
    return durationInMinutes * PIXELS_PER_MINUTE;
  };

  const getProgramLeft = (start: Date) => {
    const offsetInMinutes = (start.getTime() - timelineStartTime.getTime()) / (1000 * 60);
    return offsetInMinutes * PIXELS_PER_MINUTE;
  };

  const nowLeft = useMemo(() => {
    const offsetInMinutes = (now.getTime() - timelineStartTime.getTime()) / (1000 * 60);
    return offsetInMinutes * PIXELS_PER_MINUTE;
  }, [now, timelineStartTime]);

  // Scroll to "now" on open
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      const scrollPos = nowLeft - 200; // Offset for better view
      scrollContainerRef.current.scrollLeft = isRtl ? -scrollPos : scrollPos;
    }
  }, [isOpen, nowLeft, isRtl]);

  const formattedDate = timelineStartTime.toLocaleDateString(settings.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl p-4 sm:p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gold rounded-2xl text-black shadow-lg shadow-gold/20">
                <Calendar size={24} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                  {isRtl ? 'دليل البرامج الإلكتروني' : 'Electronic Program Guide'}
                </h2>
                <span className="text-sm font-bold text-gold">{formattedDate}</span>
              </div>
            </div>

            {/* Day Switcher */}
            <div className="hidden sm:flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              <button 
                onClick={() => setCurrentDayOffset(prev => prev - 1)}
                className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-4 text-xs font-black uppercase text-zinc-300">
                {currentDayOffset === 0 ? (isRtl ? 'اليوم' : 'Today') : (isRtl ? `يوم ${currentDayOffset}` : `Day ${currentDayOffset}`)}
              </span>
              <button 
                onClick={() => setCurrentDayOffset(prev => prev + 1)}
                className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gold transition-colors" size={16} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث عن قناة...' : 'Search channel...'}
                className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-gold/50 focus:bg-white/10 transition-all w-64"
              />
            </div>

            <button
              onClick={onClose}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all border border-white/10"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* EPG Body */}
        <div className="flex-1 overflow-hidden glass-card rounded-[2.5rem] border border-white/10 flex flex-col relative shadow-2xl">
          
          {/* Main Scrollable Area */}
          <div className="flex flex-1 overflow-hidden relative">
            
            {/* Sidebar (Channels) */}
            <div className="w-48 sm:w-64 bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-30">
              <div className="h-14 border-b border-white/5 flex items-center px-4 bg-zinc-950">
                <Tv size={18} className="text-gold mr-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {isRtl ? 'القنوات' : 'Channels'}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                {filteredChannels.map((channel, cIdx) => (
                  <div 
                    key={`${channel.id}-${cIdx}`}
                    onClick={() => onSelectChannel(channel)}
                    className="h-20 border-b border-white/5 flex items-center px-4 gap-3 hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center border border-white/10 overflow-hidden shrink-0 group-hover:border-gold/40 transition-all">
                      {channel.logo ? (
                        <img src={channel.logo} alt={channel.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Tv size={16} className="text-zinc-600" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-zinc-200 truncate group-hover:text-gold transition-colors">{channel.name}</span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase truncate tracking-tight">{channel.category || 'General'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
              
              {/* Timeline Header */}
              <div className="h-14 bg-zinc-950/80 border-b border-white/5 flex items-center z-20 overflow-hidden" ref={(el) => {
                if (el && scrollContainerRef.current) {
                  el.scrollLeft = scrollContainerRef.current.scrollLeft;
                }
              }}>
                <div className="relative flex" style={{ width: HOURS_TO_SHOW * 60 * PIXELS_PER_MINUTE }}>
                  {timeSlots.map((time, idx) => (
                    <div 
                      key={idx}
                      className="absolute top-0 bottom-0 border-l border-white/5 flex items-center px-2"
                      style={{ left: idx * 30 * PIXELS_PER_MINUTE }}
                    >
                      <span className="text-[10px] font-black font-mono text-zinc-500">
                        {time.toLocaleTimeString(settings.language, { hour: '2-digit', minute: '2-digit', hour12: settings.timeFormat === '12h' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Programs Grid */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-auto relative bg-zinc-950/20"
                onScroll={(e) => {
                  const header = e.currentTarget.parentElement?.querySelector('.h-14');
                  if (header) header.scrollLeft = e.currentTarget.scrollLeft;
                  
                  const sidebar = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-y-auto');
                  if (sidebar) sidebar.scrollTop = e.currentTarget.scrollTop;
                }}
              >
                <div className="relative" style={{ width: HOURS_TO_SHOW * 60 * PIXELS_PER_MINUTE, height: filteredChannels.length * 80 }}>
                  
                  {/* "Now" Indicator Line */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-gold z-40 shadow-[0_0_15px_rgba(229,193,88,0.8)] pointer-events-none"
                    style={{ left: nowLeft }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-gold rounded-full shadow-lg" />
                  </div>

                  {filteredChannels.map((channel, cIdx) => {
                    const programs = epgData[channel.stream_id || channel.id] || [];
                    return (
                      <div 
                        key={`${channel.id}-${cIdx}`}
                        className="absolute left-0 right-0 border-b border-white/5 flex items-center"
                        style={{ top: cIdx * 80, height: 80 }}
                      >
                        {programs.map((prog: any, pIdx: number) => {
                          const width = getProgramWidth(prog.start, prog.stop);
                          const left = getProgramLeft(prog.start);
                          
                          // Filter out programs completely outside the 24h window
                          if (left + width < 0 || left > HOURS_TO_SHOW * 60 * PIXELS_PER_MINUTE) return null;

                          const isCurrentlyPlaying = now >= prog.start && now <= prog.stop;

                          return (
                            <motion.div
                              key={pIdx}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`absolute top-2 bottom-2 rounded-xl border p-3 flex flex-col gap-1 transition-all cursor-pointer group ${
                                isCurrentlyPlaying 
                                  ? 'bg-gold/20 border-gold/40 shadow-lg shadow-gold/5 ring-1 ring-gold/20' 
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                              }`}
                              style={{ 
                                left: Math.max(0, left), 
                                width: Math.min(width, HOURS_TO_SHOW * 60 * PIXELS_PER_MINUTE - left),
                                minWidth: 40
                              }}
                              onClick={() => onSelectChannel(channel)}
                            >
                              <div className="flex items-center justify-between gap-2 overflow-hidden">
                                <span className={`text-[11px] font-black truncate ${isCurrentlyPlaying ? 'text-gold' : 'text-zinc-200'}`}>
                                  {prog.title}
                                </span>
                                {isCurrentlyPlaying && (
                                  <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gold text-[8px] font-black text-black animate-pulse">
                                    LIVE
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-500">
                                <Clock size={10} className="shrink-0" />
                                <span>
                                  {prog.start.toLocaleTimeString(settings.language, { hour: '2-digit', minute: '2-digit', hour12: false })} - {prog.stop.toLocaleTimeString(settings.language, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                              </div>
                              {width > 150 && (
                                <p className="text-[9px] text-zinc-600 line-clamp-1 group-hover:text-zinc-400 transition-colors">
                                  {prog.description}
                                </p>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Legend */}
          <div className="h-12 border-t border-white/5 bg-zinc-950/80 px-8 flex items-center justify-between text-[10px] font-bold text-zinc-500">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gold/20 border border-gold/40" />
                <span>{isRtl ? 'يُعرض الآن' : 'Playing Now'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white/5 border border-white/10" />
                <span>{isRtl ? 'برنامج قادم' : 'Upcoming Program'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span>{isRtl ? 'التمرير أفقيًا للوقت، ورأسيًا للقنوات' : 'Scroll horizontal for time, vertical for channels'}</span>
            </div>
          </div>
        </div>
      </motion.div>
  );
}
