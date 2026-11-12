import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImg from '../assets/logo.jpg';
import { 
  Settings, RefreshCcw, LogOut, Plus, Tv, AlertCircle, CheckCircle2, 
  Clock, Upload, FolderPlus, Copy, Eye, Globe, Server, FileText, Check, X, Star,
  Film, Clapperboard, Crown, Calendar, ShieldCheck, AlertTriangle, Sparkles
} from 'lucide-react';
import PlaylistManager from './PlaylistManager';
import LivePlayer from './LivePlayer';
import SettingsView from './SettingsView';
import AddPlaylistModal from './AddPlaylistModal';
import { AppSettings, Channel, Playlist } from '../types';
import { useI18n } from '../utils/i18n';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ICON_3D_STYLES } from '../utils/themeManager';
import { syncFavoritesFromFirestore } from '../utils/favoritesService';
import { ExtractionService, ExtractionProgress } from '../utils/extractionService';
import { initDB, getPlaylistExtractionStatus } from '../lib/db';
import { parseExpiryDate, fetchLiveSubscriptionExpiry } from '../utils/subscription';
import { navigateSpatial, parseTVKeyEvent, ensureInitialFocus, pushBackHandler, BackPriority } from '../utils/tvNavigation';
import ExitConfirmModal from './ExitConfirmModal';

interface DashboardProps {
  userId: string;
  settings: AppSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onTriggerSplash?: () => void;
}

type View = 'home' | 'live' | 'movies' | 'series' | 'sports' | 'settings' | 'add';

// Custom SVG Icons matching TV aspect ratio
const Icons = {
  Live: ({ className, strokeWidth = 1.2, fill = 'none' }: { className?: string; strokeWidth?: number; fill?: string }) => (
    <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={strokeWidth} className={className}>
      <path d="M4 6h12v10H4z" />
      <path d="M6 16v2h8v-2M10 18v2M8 20h4" />
      <rect x="17" y="8" width="3" height="6" rx="1" />
      <circle cx="18.5" cy="10" r="0.5" fill="currentColor" />
      <circle cx="18.5" cy="12" r="0.5" fill="currentColor" />
    </svg>
  ),
  Filme: ({ className, strokeWidth = 1, fill = 'none' }: { className?: string; strokeWidth?: number; fill?: string }) => (
    <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="7" r="1.5" />
      <circle cx="12" cy="17" r="1.5" />
      <circle cx="7" cy="12" r="1.5" />
      <circle cx="17" cy="12" r="1.5" />
    </svg>
  ),
  Serie: ({ className, strokeWidth = 1, fill = 'none' }: { className?: string; strokeWidth?: number; fill?: string }) => (
    <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4" />
      <path d="M10 10l5 2-5 2z" fill="currentColor" />
    </svg>
  ),
  Playlist: ({ className, strokeWidth = 1.2, fill = 'none' }: { className?: string; strokeWidth?: number; fill?: string }) => (
    <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="7" y1="16" x2="13" y2="16" />
    </svg>
  ),
  VPN: ({ className, enabled, strokeWidth = 1.5 }: { className?: string; enabled?: boolean; strokeWidth?: number }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" strokeLinecap="round" />
      <path d="M12 16h.01" strokeLinecap="round" />
      {enabled && (
        <motion.circle 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          cx="12" cy="12" r="3" fill="currentColor" 
        />
      )}
    </svg>
  )
};

// Separate Clock component to prevent full Dashboard re-renders every second
const ClockDisplay = React.memo(({ settings, isRtl }: { settings: AppSettings, isRtl: boolean }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedClock = React.useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: settings.timeFormat === '12h',
    };
    return currentTime.toLocaleTimeString(settings.language === 'ar' ? 'ar-EG' : settings.language, options);
  }, [currentTime, settings.timeFormat, settings.language]);

  const formattedDate = React.useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return currentTime.toLocaleDateString(settings.language === 'ar' ? 'ar-EG' : settings.language, options);
  }, [currentTime, settings.language]);

  return (
    <div className="flex flex-col items-end text-right">
      <span className="text-2xl sm:text-3xl md:text-4xl font-black text-gold font-mono tracking-wider leading-none drop-shadow-md">
        {formattedClock}
      </span>
      <span className="text-xs sm:text-sm font-bold text-zinc-400 capitalize mt-1 tracking-tight">
        {formattedDate}
      </span>
    </div>
  );
});


// Extraction Progress Modal Component
const ExtractionProgressModal = ({ 
  progress, 
  playlistName, 
  language,
  onClose,
  onRetry
}: { 
  progress: ExtractionProgress; 
  playlistName: string; 
  language: any;
  onClose: () => void;
  onRetry?: () => void;
}) => {
  const { stage, percent, message, counts } = progress;
  const { t, isRtl } = useI18n(language);
  
  const getStageLabel = () => {
    switch(stage) {
      case 'downloading': return t('extraction_downloading');
      case 'parsing': return t('extraction_parsing');
      case 'categorizing': return t('extraction_categorizing');
      case 'saving': return t('extraction_saving');
      case 'verifying': return t('extraction_verifying');
      case 'completed': return t('extraction_completed');
      case 'error': return t('extraction_error');
      default: return t('loading');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      data-tv-modal="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 ${isRtl ? 'font-cairo' : 'font-sans'}`}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-[#141418] border-2 border-gold/40 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(212,175,55,0.2)] text-center relative overflow-hidden"
      >
        {/* Close (X) button */}
        <button
          onClick={onClose}
          data-tv-focusable="true"
          tabIndex={0}
          className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all focus:ring-2 focus:ring-inset focus:ring-gold z-30 cursor-pointer`}
          title={isRtl ? 'إغلاق' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold/5 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-gold/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-gold/30 shadow-inner">
            {stage === 'error' ? (
              <AlertTriangle className="text-red-500 w-10 h-10 animate-pulse" />
            ) : stage === 'completed' ? (
              <CheckCircle2 className="text-emerald-500 w-10 h-10 animate-bounce" />
            ) : (
              <RefreshCcw className="text-gold w-10 h-10 animate-spin" />
            )}
          </div>

          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
            {playlistName || 'Achour Player'}
          </h2>
          <p className="text-gold font-bold text-lg mb-8">
            {getStageLabel()}
          </p>

          {/* Progress Bar Container */}
          <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden border border-white/5 mb-6">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.5 }}
              className={`absolute top-0 left-0 h-full bg-gradient-to-r ${
                stage === 'error' ? 'from-red-600 to-red-400' : 'from-gold via-yellow-400 to-gold'
              } shadow-[0_0_15px_rgba(212,175,55,0.5)]`}
            />
          </div>

          <div className="flex justify-between items-center mb-8 px-2">
            <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">
              {message}
            </span>
            <span className="text-gold font-black text-xl font-mono">
              {percent}%
            </span>
          </div>

          {counts && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-black/40 border border-white/5 p-3 rounded-2xl">
                <span className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">{t('live')}</span>
                <span className="text-white font-black text-lg">{counts.live.toLocaleString()}</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-3 rounded-2xl">
                <span className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">{t('movies')}</span>
                <span className="text-white font-black text-lg">{counts.movie.toLocaleString()}</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-3 rounded-2xl">
                <span className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">{t('series')}</span>
                <span className="text-white font-black text-lg">{counts.series.toLocaleString()}</span>
              </div>
            </div>
          )}

          {stage === 'completed' && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              data-tv-focusable="true"
              autoFocus
              className="w-full py-4 bg-gold text-black font-black text-lg rounded-2xl shadow-[0_4px_15px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase mt-4 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-white cursor-pointer"
              onClick={onClose}
            >
              {t('start_now')}
            </motion.button>
          )}

          {stage === 'error' && (
            <button
              data-tv-focusable="true"
              autoFocus
              className="w-full py-4 bg-zinc-800 text-white font-black text-lg rounded-2xl border border-white/10 hover:bg-zinc-700 transition-all uppercase mt-4 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold cursor-pointer"
              onClick={() => {
                if (onRetry) {
                  onRetry();
                } else {
                  onClose();
                }
              }}
            >
              {t('retry')}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function Dashboard({ userId, settings, onUpdateSettings, onTriggerSplash }: DashboardProps) {
  const [currentView, setCurrentView] = useState<View>('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [activePlaylistData, setActivePlaylistData] = useState<Playlist | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);
  const [activePlaylistName, setActivePlaylistName] = useState<string>('');
  
  // Extraction State
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [showExtractionModal, setShowExtractionModal] = useState(false);

  const active3DStyle = React.useMemo(() => {
    return ICON_3D_STYLES.find(s => s.id === (settings.icon3DStyle || 'style-gold-3d')) || ICON_3D_STYLES[0];
  }, [settings.icon3DStyle]);

  const { t, isRtl } = useI18n(settings.language);

  // Check if extraction was already started by SplashScreen preload
  useEffect(() => {
    const existingProgress = (window as any).__ACHOUR_EXTRACTION_PROGRESS__;
    if (existingProgress && existingProgress.stage !== 'completed' && existingProgress.stage !== 'idle') {
      setExtractionProgress(existingProgress);
      setShowExtractionModal(true);
    }

    const handleProgressEvent = (e: any) => {
      if (e.detail) {
        setExtractionProgress(e.detail);
        setShowExtractionModal(true);
      }
    };

    window.addEventListener('achour_extraction_progress', handleProgressEvent);
    return () => window.removeEventListener('achour_extraction_progress', handleProgressEvent);
  }, []);

  // Check if extraction is needed when active playlist is determined
  useEffect(() => {
    if (activePlaylistData) {
      const checkAndExtract = async () => {
        const status = await getPlaylistExtractionStatus(activePlaylistData.id);
        if (!status || status.stage !== 'completed') {
          // If already in progress from splash, show the modal and let it continue
          const existing = (window as any).__ACHOUR_EXTRACTION_PROGRESS__;
          if (existing && existing.stage !== 'completed' && existing.stage !== 'error') {
            setShowExtractionModal(true);
            return;
          }
          setShowExtractionModal(true);
          await ExtractionService.extract(activePlaylistData, (progress) => {
            setExtractionProgress(progress);
          });
        }
      };
      checkAndExtract();
    }
  }, [activePlaylistData?.id]);


  const fetchActivePlaylist = async () => {
    try {
      // 1. Check local playlists first if active
      const localSaved = localStorage.getItem('achour_local_playlists');
      const localList: Playlist[] = localSaved ? JSON.parse(localSaved) : [];

      if (settings.activePlaylistId) {
        const localFound = localList.find(p => p.id === settings.activePlaylistId);
        if (localFound) {
          setActivePlaylistName(localFound.name || 'IPTV');
          setActivePlaylistData(localFound);
          return;
        }

        try {
          const snap = await getDoc(doc(db, 'playlists', settings.activePlaylistId));
          if (snap.exists()) {
            const data = { id: snap.id, ...snap.data() } as Playlist;
            setActivePlaylistName(data.name || 'IPTV');
            setActivePlaylistData(data);
            return;
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `playlists/${settings.activePlaylistId}`);
        }
      }

      // Check Firestore list
      const playlistsPath = 'playlists';
      try {
        const q = query(collection(db, playlistsPath), where('userId', '==', userId));
        const res = await getDocs(q);
        if (!res.empty) {
          const first = { id: res.docs[0].id, ...res.docs[0].data() } as Playlist;
          setActivePlaylistName(first.name || 'IPTV');
          setActivePlaylistData(first);
          onUpdateSettings(prev => ({ ...prev, activePlaylistId: first.id }));
          return;
        }
      } catch (err) {
        console.warn('Firestore playlist fetch note (offline cache fallback active):', err);
      }

      // Check local list fallback
      if (localList.length > 0) {
        setActivePlaylistName(localList[0].name || 'IPTV');
        setActivePlaylistData(localList[0]);
        onUpdateSettings(prev => ({ ...prev, activePlaylistId: localList[0].id }));
        return;
      }


      setActivePlaylistName('');
      setActivePlaylistData(null);
    } catch (err) {
      console.warn('Could not fetch active playlist name', err);
    }
  };

  useEffect(() => {
    fetchActivePlaylist();
  }, [userId, settings.activePlaylistId]);


  // Compute real subscription info strictly extracted from the active link
  const parsedSubscription = React.useMemo(() => {
    if (!activePlaylistData || !activePlaylistData.expDate) return null;
    const parsed = parseExpiryDate(activePlaylistData.expDate, isRtl);
    if (!parsed || !parsed.hasDate) return null;
    return parsed;
  }, [activePlaylistData?.expDate, isRtl]);



  // Background fetch/sync of live subscription expiration if not already present
  useEffect(() => {
    if (activePlaylistData && (activePlaylistData.expDate === undefined || activePlaylistData.expDate === null)) {
      fetchLiveSubscriptionExpiry(activePlaylistData).then(exp => {
        if (exp !== null && exp !== undefined) {
          setActivePlaylistData(prev => prev ? ({ ...prev, expDate: exp }) : null);
          try {
            const rawLocal = localStorage.getItem('achour_local_playlists');
            if (rawLocal) {
              const list: Playlist[] = JSON.parse(rawLocal);
              const updated = list.map(p => p.id === activePlaylistData.id ? ({ ...p, expDate: exp }) : p);
              localStorage.setItem('achour_local_playlists', JSON.stringify(updated));
            }
          } catch (e) {}
        }
      }).catch(() => {});
    }
  }, [activePlaylistData?.id, activePlaylistData?.url]);

  // Auto-Initial Focus for TV Remote Navigation
  useEffect(() => {
    if (currentView === 'home') {
      const timer = setTimeout(() => {
        // Focus the first interactive card if nothing or body is focused
        if (!document.activeElement || document.activeElement === document.body) {
          ensureInitialFocus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  // Register comprehensive back handlers for modals, subviews, and home dashboard
  useEffect(() => {
    const unregister = pushBackHandler(() => {
      // 1. Modals take top priority inside Dashboard
      if (showAddModal) {
        setShowAddModal(false);
        return true;
      }
      if (showExitModal) {
        setShowExitModal(false);
        return true;
      }

      // 2. Subviews (live, movies, series, add, settings) return to home
      if (currentView !== 'home') {
        setCurrentView('home');
        return true;
      }

      // 3. On home dashboard, pressing Back opens Exit Confirmation Modal (blocking accidental exit)
      setShowExitModal(true);
      return true;
    }, BackPriority.DASHBOARD);

    return unregister;
  }, [showAddModal, showExitModal, currentView]);

  // Universal Keyboard & Remote D-Pad Navigation for Dashboard
  useEffect(() => {
    if (currentView !== 'home') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const action = parseTVKeyEvent(e);

      // 1. Navigation Actions (UP, DOWN, LEFT, RIGHT)
      if (action === 'UP') {
        e.preventDefault();
        navigateSpatial('up', document.body, null);
        return;
      }
      if (action === 'DOWN') {
        e.preventDefault();
        navigateSpatial('down', document.body, null);
        return;
      }
      if (action === 'LEFT') {
        e.preventDefault();
        navigateSpatial('left', document.body, null);
        return;
      }
      if (action === 'RIGHT') {
        e.preventDefault();
        navigateSpatial('right', document.body, null);
        return;
      }

      // 2. Activation (OK / SELECT / Enter)
      if (action === 'SELECT') {
        const active = document.activeElement as HTMLElement;
        if (active && typeof active.click === 'function') {
          e.preventDefault();
          active.click();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isRtl, showAddModal, showExitModal]);


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExitApp = () => {
    setShowExitModal(false);
    
    // Try Capacitor
    try {
      const capApp = (window as any).Capacitor?.Plugins?.App;
      if (capApp && typeof capApp.exitApp === 'function') {
        capApp.exitApp();
        return;
      }
    } catch (e) {}

    // Try Native JSBridge
    const native = (window as any).AchourNative || (window as any).Android || (window as any).JSBridge;
    if (native && typeof native.exitApp === 'function') {
      native.exitApp();
      return;
    }

    // Try Cordova
    if ((navigator as any).app && typeof (navigator as any).app.exitApp === 'function') {
      (navigator as any).app.exitApp();
      return;
    }
    
    // Try Tizen
    try { (window as any).tizen?.application?.getCurrentApplication()?.exit(); return; } catch(e){}
    
    // Try webOS
    try { (window as any).webOS?.window?.close(); return; } catch(e){}

    // Fallback for Web
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
      window.location.href = 'about:blank';
    }
  };

  if (currentView === 'live') return <LivePlayer onBack={() => setCurrentView('home')} settings={settings} onUpdateSettings={onUpdateSettings} userId={userId} />;
  if (currentView === 'movies') return <LivePlayer onBack={() => setCurrentView('home')} settings={settings} onUpdateSettings={onUpdateSettings} userId={userId} initialType="movie" />;
  if (currentView === 'series') return <LivePlayer onBack={() => setCurrentView('home')} settings={settings} onUpdateSettings={onUpdateSettings} userId={userId} initialType="series" />;
  
  if (currentView === 'add') return <PlaylistManager onBack={() => setCurrentView('home')} userId={userId} settings={settings} onUpdateSettings={onUpdateSettings} />;

  if (currentView === 'settings') return (
    <SettingsView 
      onBack={() => setCurrentView('home')} 
      settings={settings} 
      onUpdateSettings={onUpdateSettings} 
      userId={userId}
      onTriggerSplash={onTriggerSplash}
    />
  );
  return (
    <>
      <div className={`relative min-h-screen w-full bg-transparent flex flex-col select-none overflow-hidden ${isRtl ? 'text-right font-cairo' : 'text-left font-sans'}`}>
      {/* Background Sparkles */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[1vw] h-[1vw] bg-gold rounded-full blur-[2px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[0.5vw] h-[0.5vw] bg-white rounded-full blur-[1px] animate-bokeh" />
      </div>


      {/* Top Header Bar - 3 Columns: Left (Subscription Expiry), Center (App Logo & Name), Right (Clock & Date) */}
      <div 
        dir="ltr"
        className="relative z-20 grid grid-cols-1 md:grid-cols-3 items-center justify-between gap-3 px-4 pt-3 mb-2 shrink-0 w-full max-w-7xl mx-auto"
      >
        {/* 1. Left Side: Subscription Expiry */}
        <div className="flex items-center justify-start min-w-0">
          {activePlaylistData ? (
            <div 
              dir={isRtl ? 'rtl' : 'ltr'}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border ${
                parsedSubscription?.isExpired 
                  ? 'bg-red-950/60 border-red-500/50 text-red-200 shadow-md shadow-red-950/30' 
                  : 'bg-zinc-950/85 border-gold/40 shadow-md shadow-gold/5 text-white'
              } flex items-center gap-2.5 backdrop-blur-xl max-w-full group hover:border-gold transition-all`}
            >
              <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${
                parsedSubscription?.isExpired ? 'bg-red-500/20 text-red-400' : 'bg-gold/20 text-gold'
              }`}>
                <Calendar size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-black text-white truncate max-w-[130px] sm:max-w-[170px]">
                    {activePlaylistData?.name || (isRtl ? 'الاشتراك' : 'Subscription')}
                  </span>
                  {parsedSubscription && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${
                      parsedSubscription.isExpired ? 'bg-red-500/30 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {parsedSubscription.isExpired ? (isRtl ? 'منتهي' : 'Expired') : (isRtl ? 'نشط' : 'Active')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono font-medium truncate">
                  <span>{isRtl ? 'الانتهاء:' : 'Exp:'}</span>
                  <strong className="text-gold font-bold">
                    {parsedSubscription ? parsedSubscription.formattedDate : (isRtl ? 'حسب الرابط (دائم)' : 'Per Link (Lifetime)')}
                  </strong>
                  {parsedSubscription && !parsedSubscription.isExpired && parsedSubscription.daysRemaining !== null && parsedSubscription.daysRemaining < 999 && (
                    <span className="text-gold/90 font-bold bg-gold/15 px-1 rounded text-[9px]">
                      {parsedSubscription.daysRemaining} {isRtl ? 'يوم' : 'd'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:block w-8" />
          )}
        </div>

        {/* 2. Center: App Name (Top) & Logo (Bottom) */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gold tracking-tight uppercase italic leading-none drop-shadow-md">
              ACHOUR PLAYER
            </h1>
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-0.5 mt-1">
              Premium IPTV System
            </span>
          </div>
          
          {/* Logo (Positioned below the name) */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl border-2 border-gold/50 shadow-[0_0_20px_rgba(229,160,13,0.3)] overflow-hidden relative flex items-center justify-center bg-black shrink-0 transition-transform hover:scale-105">
            <img 
              src="/logo.jpg" 
              onError={(e) => { e.currentTarget.src = logoImg; }}
              alt="Achour Player" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 3. Right Side: Clock & Date */}
        <div className="flex items-center justify-end">
          <ClockDisplay settings={settings} isRtl={isRtl} />
          {/* Hidden focus buffer */}
          <div className="opacity-0 w-0 h-0 pointer-events-none" data-tv-header-end="true" />
        </div>
      </div>


      {/* Main Content Area */}

        {/* Dynamic Dashboard Layouts */}
        {(() => {
          const VALID_LAYOUTS = [
            'layout-classic-grid',
            'layout-dual-live-showcase',
            'layout-sidebar-vertical',
            'layout-metro-tiles',
            'layout-cinema-strip',
            'layout-apple-spotlight',
            'layout-dual-column',
            'layout-minimal-list',
            'layout-honeycomb',
            'layout-floating-dock',
            'layout-staggered-grid',
            'layout-apple-tv',
            'layout-fire-tv',
            'layout-android-tv',
            'layout-modern-bento',
            'layout-sidebar-glass',
            'layout-compact-tiles',
            'layout-full-hero',
            'layout-split-hero',
            'layout-floating-strip',
            'layout-cyber-matrix',
            'layout-orbit-carousel',
            'layout-magazine-editorial',
            'layout-neon-podium',
            'layout-diamond-quad',
            'layout-game-console',
            'layout-panoramic-cards',
            'layout-glass-mosaic',
            'layout-vertical-reel',
            'layout-minimalist-zen'
          ];
          const rawLayout = settings.dashboardLayout || 'layout-classic-grid';
          const activeLayout = VALID_LAYOUTS.includes(rawLayout) ? rawLayout : 'layout-classic-grid';

          const iconScale = settings.iconScale || 'medium';
          const scaleWrapperClass = 
            iconScale === 'small'
              ? 'scale-[0.88] origin-center transition-transform duration-200'
              : iconScale === 'large'
                ? 'scale-[1.10] origin-center transition-transform duration-200'
                : 'scale-100 origin-center transition-transform duration-200';

          return (
            <AnimatePresence mode="wait">
              <motion.div
                key={`hub-layout-${activeLayout}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className={`flex-1 flex flex-col justify-center items-center w-full my-auto max-h-[calc(100vh-130px)] overflow-y-auto no-scrollbar px-2 sm:px-4 ${scaleWrapperClass}`}
              >
                {/* ======================================================== */}
                {/* LAYOUT 1: CLASSIC GRID                                   */}
                {/* ======================================================== */}
                {activeLayout === 'layout-classic-grid' && (
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 max-w-4xl w-full py-1">
                    <HubCard 
                      scale={iconScale}
                      onClick={() => setCurrentView('live')} 
                      icon={
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 p-2 rounded-xl flex items-center justify-center transition-all duration-300 ${active3DStyle.cardClass}`}>
                          {active3DStyle.iconImage ? (
                            <img src={active3DStyle.iconImage} alt="" className={active3DStyle.iconClass} />
                          ) : (
                            <Icons.Live className={`w-full h-full text-gold transition-all ${active3DStyle.iconClass}`} {...active3DStyle.iconProps} />
                          )}
                        </div>
                      } 
                      label={t('live')} 
                      subLabel={isRtl ? 'البث المباشر 🔴' : 'Live Broadcast'}
                    />
                    <HubCard 
                      scale={iconScale}
                      onClick={() => setCurrentView('movies')} 
                      icon={
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 p-2 rounded-xl flex items-center justify-center transition-all duration-300 ${active3DStyle.cardClass}`}>
                          {active3DStyle.iconImage ? (
                            <img src={active3DStyle.iconImage} alt="" className={active3DStyle.iconClass} />
                          ) : (
                            <Icons.Filme className={`w-full h-full text-gold transition-all ${active3DStyle.iconClass}`} {...active3DStyle.iconProps} />
                          )}
                        </div>
                      } 
                      label={t('movies')} 
                      subLabel={isRtl ? 'سينما 4K VOD' : '4K Movies'}
                    />
                    <HubCard 
                      scale={iconScale}
                      onClick={() => setCurrentView('series')} 
                      icon={
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 p-2 rounded-xl flex items-center justify-center transition-all duration-300 ${active3DStyle.cardClass}`}>
                          {active3DStyle.iconImage ? (
                            <img src={active3DStyle.iconImage} alt="" className={active3DStyle.iconClass} />
                          ) : (
                            <Icons.Serie className={`w-full h-full text-gold transition-all ${active3DStyle.iconClass}`} {...active3DStyle.iconProps} />
                          )}
                        </div>
                      } 
                      label={t('series')} 
                      subLabel={isRtl ? 'مسلسلات وبرامج' : 'TV Series'}
                    />
                    <HubCard 
                      scale={iconScale}
                      onClick={() => setCurrentView('add')} 
                      icon={
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 p-2 rounded-xl flex items-center justify-center transition-all duration-300 ${active3DStyle.cardClass}`}>
                          {active3DStyle.iconImage ? (
                            <img src={active3DStyle.iconImage} alt="" className={active3DStyle.iconClass} />
                          ) : (
                            <Icons.Playlist className={`w-full h-full text-gold transition-all ${active3DStyle.iconClass}`} {...active3DStyle.iconProps} />
                          )}
                        </div>
                      } 
                      label={isRtl ? 'الاشتراكات' : 'Subscriptions'} 
                      subLabel={isRtl ? 'إدارة القوائم' : 'Portals'}
                    />
                    <HubCard 
                      scale={iconScale}
                      onClick={() => setCurrentView('settings')} 
                      icon={
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 p-2 rounded-xl flex items-center justify-center transition-all duration-300 ${active3DStyle.cardClass}`}>
                          {active3DStyle.iconImage ? (
                            <img src={active3DStyle.iconImage} alt="" className={active3DStyle.iconClass} />
                          ) : (
                            <Settings className={`w-full h-full text-gold transition-all ${active3DStyle.iconClass}`} {...active3DStyle.iconProps} />
                          )}
                        </div>
                      } 
                      label={t('settings')} 
                      subLabel={isRtl ? 'إعدادات النظام' : 'System Options'}
                    />
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 2: DUAL LIVE TV SHOWCASE HUB                      */}
                {/* ======================================================== */}
                {activeLayout === 'layout-dual-live-showcase' && (
                  <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto py-2">
                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentView('live')}
                      className="cursor-pointer glass-card p-6 rounded-3xl border-2 border-gold/60 shadow-[0_0_30px_rgba(212,175,55,0.25)] flex flex-col justify-between relative overflow-hidden group bg-gradient-to-br from-gold/30 via-zinc-900 to-black text-white focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:ring-inset min-h-[220px]"
                    >
                      <div className="flex items-center justify-between z-10">
                        <span className="px-3 py-1 bg-red-600/30 text-red-300 font-black text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1.5 border border-red-500/40">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                          {isRtl ? 'البث المباشر الأول' : 'PRIMARY LIVE TV'}
                        </span>
                        <span className="text-gold text-xs font-mono font-bold">HD/4K STREAM</span>
                      </div>
                      <div className="my-auto text-center py-4 z-10">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl p-3 bg-gold/20 border border-gold/40 flex items-center justify-center text-gold group-hover:scale-110 transition-transform shadow-lg">
                          <Icons.Live className="w-7 h-7 text-gold" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                          {t('live')}
                        </h2>
                        <p className="text-xs text-zinc-300 mt-1">
                          {isRtl ? 'القنوات الفضائية الرياضية والترفيهية المباشرة' : 'Live sports & entertainment channels'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between z-10 pt-3 border-t border-white/10 text-xs font-bold text-gold">
                        <span>{isRtl ? 'انقر للتشغيل الفوري' : 'Click to Watch Now'}</span>
                        <span>➔</span>
                      </div>
                    </motion.div>

                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentView('movies')}
                      className="cursor-pointer glass-card p-6 rounded-3xl border-2 border-white/20 hover:border-gold/60 shadow-xl flex flex-col justify-between relative overflow-hidden group bg-gradient-to-br from-purple-900/30 via-zinc-900 to-black text-white focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:ring-inset min-h-[220px]"
                    >
                      <div className="flex items-center justify-between z-10">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 font-black text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1.5 border border-purple-500/30">
                          <Sparkles size={12} />
                          {isRtl ? 'سينما الأفلام والمسلسلات' : 'VOD CINEMA & SERIES'}
                        </span>
                        <span className="text-purple-300 text-xs font-mono font-bold">VIP 4K</span>
                      </div>
                      <div className="my-auto text-center py-4 z-10">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl p-3 bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform shadow-lg">
                          <Icons.Filme className="w-7 h-7 text-purple-300" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                          {t('movies')} & {t('series')}
                        </h2>
                        <p className="text-xs text-zinc-300 mt-1">
                          {isRtl ? 'أحدث الأفلام العالمية والمسلسلات الحصرية' : 'Latest blockbuster movies & series'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between z-10 pt-3 border-t border-white/10 text-xs font-bold text-purple-300">
                        <span>{isRtl ? 'استعرض المكتبة' : 'Browse Library'}</span>
                        <span>➔</span>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 3: SIDEBAR VERTICAL NAVIGATION                    */}
                {/* ======================================================== */}
                {activeLayout === 'layout-sidebar-vertical' && (
                  <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch my-auto py-1">
                    {/* Left Rail */}
                    <div className="sm:col-span-3 glass-card p-3 rounded-2xl border border-white/10 flex flex-col gap-1.5 justify-between">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-gold uppercase tracking-widest block px-2">
                          MENU
                        </span>
                        {[
                          { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live') },
                          { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies') },
                          { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series') },
                          { id: 'add', label: isRtl ? 'الاشتراكات' : 'Subscriptions', icon: Icons.Playlist, action: () => setCurrentView('add') },
                          { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings') },
                        ].map((item) => {
                          const IconComp = item.icon;
                          return (
                            <motion.button
                              key={item.id}
                              data-tv-focusable="true"
                              tabIndex={0}
                              whileHover={{ x: isRtl ? -3 : 3 }}
                              onClick={item.action}
                              className="w-full p-2 rounded-xl border border-white/5 hover:border-gold/40 bg-black/40 hover:bg-gold/15 flex items-center gap-2.5 transition-all group text-left rtl:text-right focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset"
                            >
                              <div className="p-1.5 rounded-lg bg-gold/20 text-gold group-hover:scale-105 transition-transform">
                                <IconComp className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-black uppercase text-white group-hover:text-gold truncate">
                                {item.label}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>

                      <button
                        data-tv-focusable="true"
                        tabIndex={0}
                        onClick={() => setShowExitModal(true)}
                        className="w-full p-2 rounded-xl border border-red-500/20 bg-red-950/20 hover:bg-red-900/40 text-red-400 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all mt-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-400"
                      >
                        <LogOut size={14} />
                        <span>{t('exit_app')}</span>
                      </button>
                    </div>

                    {/* Right Panel */}
                    <div className="sm:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <motion.div
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setCurrentView('live')}
                        className="cursor-pointer glass-card p-4 rounded-2xl border border-gold/40 hover:border-gold flex flex-col justify-between bg-gradient-to-br from-gold/15 to-black group min-h-[160px]"
                      >
                        <div className="p-2.5 rounded-xl bg-gold/20 text-gold w-fit group-hover:scale-105 transition-transform">
                          <Icons.Live className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-gold font-bold uppercase tracking-wider block mb-0.5">
                            LIVE TV
                          </span>
                          <h3 className="text-lg font-black text-white uppercase group-hover:text-gold transition-colors">
                            {t('live')}
                          </h3>
                          <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                            {isRtl ? 'القنوات المباشرة والبث الرياضي' : 'Live channels & sports'}
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setCurrentView('movies')}
                        className="cursor-pointer glass-card p-4 rounded-2xl border border-gold/40 hover:border-gold flex flex-col justify-between bg-gradient-to-br from-gold/15 to-black group min-h-[160px]"
                      >
                        <div className="p-2.5 rounded-xl bg-gold/20 text-gold w-fit group-hover:scale-105 transition-transform">
                          <Icons.Filme className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-gold font-bold uppercase tracking-wider block mb-0.5">
                            CINEMA VOD
                          </span>
                          <h3 className="text-lg font-black text-white uppercase group-hover:text-gold transition-colors">
                            {t('movies')}
                          </h3>
                          <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                            {isRtl ? 'أفلام عربية وأجنبية بدقة 4K' : '4K movies library'}
                          </p>
                        </div>
                      </motion.div>

                      <motion.div
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setCurrentView('series')}
                        className="cursor-pointer glass-card p-4 rounded-2xl border border-gold/40 hover:border-gold flex flex-col justify-between bg-gradient-to-br from-gold/15 to-black group min-h-[160px]"
                      >
                        <div className="p-2.5 rounded-xl bg-gold/20 text-gold w-fit group-hover:scale-105 transition-transform">
                          <Icons.Serie className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-gold font-bold uppercase tracking-wider block mb-0.5">
                            TV SHOWS
                          </span>
                          <h3 className="text-lg font-black text-white uppercase group-hover:text-gold transition-colors">
                            {t('series')}
                          </h3>
                          <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                            {isRtl ? 'مسلسلات متجددة يومياً' : 'TV shows & series'}
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 4: METRO GLASS 3D TILES                           */}
                {/* ======================================================== */}
                {activeLayout === 'layout-metro-tiles' && (
                  <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 items-stretch my-auto py-1">
                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentView('live')}
                      className="col-span-2 row-span-2 cursor-pointer glass-card p-4 sm:p-5 rounded-2xl border-2 border-gold/50 shadow-md flex flex-col justify-between group bg-gradient-to-br from-gold/20 via-black to-black min-h-[160px] sm:min-h-[180px]"
                    >
                      <div className="p-2.5 rounded-xl bg-gold text-black w-fit group-hover:scale-105 transition-transform shadow-md">
                        <Icons.Live className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold text-gold uppercase tracking-wider block">
                          FEATURED
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-white uppercase group-hover:text-gold transition-colors">
                          {t('live')}
                        </h2>
                      </div>
                    </motion.div>

                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setCurrentView('movies')}
                      className="col-span-2 cursor-pointer glass-card p-3 sm:p-3.5 rounded-2xl border border-gold/40 hover:border-gold flex items-center gap-3 group bg-black/60"
                    >
                      <div className="p-2 rounded-xl bg-gold/20 text-gold group-hover:scale-105 transition-transform">
                        <Icons.Filme className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-white uppercase group-hover:text-gold">
                          {t('movies')}
                        </h3>
                        <p className="text-[10px] text-zinc-400">Cinematic VOD</p>
                      </div>
                    </motion.div>

                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setCurrentView('series')}
                      className="col-span-2 cursor-pointer glass-card p-3 sm:p-3.5 rounded-2xl border border-gold/40 hover:border-gold flex items-center gap-3 group bg-black/60"
                    >
                      <div className="p-2 rounded-xl bg-gold/20 text-gold group-hover:scale-105 transition-transform">
                        <Icons.Serie className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-white uppercase group-hover:text-gold">
                          {t('series')}
                        </h3>
                        <p className="text-[10px] text-zinc-400">TV Shows</p>
                      </div>
                    </motion.div>

                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setCurrentView('add')}
                      className="col-span-1 cursor-pointer glass-card p-2.5 sm:p-3 rounded-xl border border-amber-500/30 hover:border-amber-400 flex flex-col items-center justify-center text-center group bg-black/60"
                    >
                      <Icons.Playlist className="w-5 h-5 text-amber-400 mb-1" />
                      <span className="text-[10px] font-bold uppercase text-white truncate w-full">{isRtl ? 'الاشتراكات' : 'Account'}</span>
                    </motion.div>

                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setCurrentView('settings')}
                      className="col-span-1 cursor-pointer glass-card p-2.5 sm:p-3 rounded-xl border border-gold/30 hover:border-gold flex flex-col items-center justify-center text-center group bg-black/60"
                    >
                      <Settings className="w-5 h-5 text-gold mb-1" />
                      <span className="text-[10px] font-bold uppercase text-white truncate w-full">{t('settings')}</span>
                    </motion.div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 5: CINEMATIC FLOWING STRIP                        */}
                {/* ======================================================== */}
                {activeLayout === 'layout-cinema-strip' && (
                  <div className="w-full max-w-5xl py-2 overflow-x-auto scrollbar-hide my-auto">
                    <div className="flex items-center gap-3 px-2 min-w-max">
                      {[
                        { id: 'live', title: t('live'), desc: 'Live Stream TV', icon: Icons.Live, action: () => setCurrentView('live') },
                        { id: 'movies', title: t('movies'), desc: 'Cinema VOD', icon: Icons.Filme, action: () => setCurrentView('movies') },
                        { id: 'series', title: t('series'), desc: 'Drama & Shows', icon: Icons.Serie, action: () => setCurrentView('series') },
                        { id: 'add', title: isRtl ? 'الاشتراكات' : 'Subscriptions', desc: 'Portals', icon: Icons.Playlist, action: () => setCurrentView('add') },
                        { id: 'settings', title: t('settings'), desc: 'System Config', icon: Settings, action: () => setCurrentView('settings') },
                      ].map((strip) => {
                        const StripIcon = strip.icon;
                        return (
                          <motion.div
                            key={strip.id}
                            data-tv-focusable="true"
                            tabIndex={0}
                            role="button"
                            whileHover={{ scale: 1.03, y: -4 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={strip.action}
                            className="w-32 h-44 sm:w-40 sm:h-52 cursor-pointer glass-card p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border-2 border-gold/40 hover:border-gold shadow-lg flex flex-col justify-between relative overflow-hidden group transition-all bg-black/70"
                          >
                            <div className="p-2 sm:p-2.5 rounded-xl bg-white/10 text-white w-fit group-hover:scale-105 transition-transform">
                              <StripIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gold" />
                            </div>
                            <div>
                              <span className="text-[8px] sm:text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                                {strip.desc}
                              </span>
                              <h3 className="text-sm sm:text-base font-black uppercase text-white group-hover:text-gold transition-colors truncate">
                                {strip.title}
                              </h3>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 6: APPLE TV SPOTLIGHT SHOWCASE                    */}
                {/* ======================================================== */}
                {activeLayout === 'layout-apple-spotlight' && (
                  <div className="w-full max-w-5xl flex flex-col gap-3 my-auto py-2">
                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setCurrentView('live')}
                      className="cursor-pointer glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-gold/50 shadow-md bg-gradient-to-r from-gold-dark/40 via-zinc-900 to-black flex items-center justify-between gap-4 relative overflow-hidden group"
                    >
                      <div className="space-y-1.5 z-10 text-left rtl:text-right">
                        <span className="px-2.5 py-0.5 bg-gold/20 text-gold border border-gold/40 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider">
                          APPLE TV SPOTLIGHT 
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight group-hover:text-gold transition-colors">
                          {t('live')}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-zinc-300 max-w-md hidden sm:block">
                          {isRtl ? 'تجربة تلفزيونية سينمائية فائقة الوضوح مع عرض مباشر وتوصيات ذكية' : 'Cinematic streaming experience with live broadcast'}
                        </p>
                      </div>
                      <div className="p-3.5 sm:p-5 rounded-2xl bg-gold/20 border border-gold text-gold group-hover:scale-105 transition-transform shadow-lg shrink-0">
                        <Icons.Live className="w-9 h-9 sm:w-12 sm:h-12" />
                      </div>
                    </motion.div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'movies', title: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies'), color: 'border-blue-500/40' },
                        { id: 'series', title: t('series'), icon: Icons.Serie, action: () => setCurrentView('series'), color: 'border-purple-500/40' },
                        { id: 'add', title: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add'), color: 'border-amber-500/40' },
                        { id: 'settings', title: t('settings'), icon: Settings, action: () => setCurrentView('settings'), color: 'border-gold/40' },
                      ].map((card) => {
                        const CardIcon = card.icon;
                        return (
                          <motion.button
                            key={card.id}
                            data-tv-focusable="true"
                            tabIndex={0}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={card.action}
                            className={`p-3 glass-card rounded-xl sm:rounded-2xl border ${card.color} hover:border-white bg-black/60 flex items-center gap-2.5 text-left rtl:text-right group transition-all`}
                          >
                            <div className="p-2 rounded-lg bg-white/10 text-white group-hover:scale-105 transition-transform shrink-0">
                              <CardIcon className="w-5 h-5 text-gold" />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-gold transition-colors truncate">
                              {card.title}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 7: DUAL SPLIT COLUMN                              */}
                {/* ======================================================== */}
                {activeLayout === 'layout-dual-column' && (
                  <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-auto py-2">
                    <motion.div 
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }} 
                      onClick={() => setCurrentView('live')} 
                      className="cursor-pointer glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-cyan-500/50 shadow-lg bg-gradient-to-br from-cyan-950/50 to-black flex flex-col justify-between group min-h-[160px]"
                    >
                      <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 w-fit">
                        <Icons.Live className="w-8 h-8 sm:w-10 sm:h-10" />
                      </div>
                      <div className="space-y-1 mt-4">
                        <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">COLUMN A • DIRECT</span>
                        <h2 className="text-xl sm:text-2xl font-black uppercase text-white group-hover:text-cyan-300">{t('live')}</h2>
                      </div>
                    </motion.div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <motion.div 
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.03 }} 
                        onClick={() => setCurrentView('movies')} 
                        className="cursor-pointer glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gold/40 bg-black/60 flex flex-col justify-between group"
                      >
                        <Icons.Filme className="w-6 h-6 text-gold" />
                        <h3 className="text-xs sm:text-sm font-black uppercase text-white group-hover:text-gold mt-2">{t('movies')}</h3>
                      </motion.div>
                      <motion.div 
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.03 }} 
                        onClick={() => setCurrentView('series')} 
                        className="cursor-pointer glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gold/40 bg-black/60 flex flex-col justify-between group"
                      >
                        <Icons.Serie className="w-6 h-6 text-gold" />
                        <h3 className="text-xs sm:text-sm font-black uppercase text-white group-hover:text-gold mt-2">{t('series')}</h3>
                      </motion.div>
                      <motion.div 
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.03 }} 
                        onClick={() => setCurrentView('add')} 
                        className="cursor-pointer glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gold/40 bg-black/60 flex flex-col justify-between group"
                      >
                        <Icons.Playlist className="w-6 h-6 text-gold" />
                        <h3 className="text-[10px] sm:text-xs font-black uppercase text-white group-hover:text-gold mt-2">{isRtl ? 'الاشتراكات' : 'Account'}</h3>
                      </motion.div>
                      <motion.div 
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.03 }} 
                        onClick={() => setCurrentView('settings')} 
                        className="cursor-pointer glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gold/40 bg-black/60 flex flex-col justify-between group"
                      >
                        <Settings className="w-6 h-6 text-gold" />
                        <h3 className="text-[10px] sm:text-xs font-black uppercase text-white group-hover:text-gold mt-2">{t('settings')}</h3>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 8: MINIMAL LUXURY VERTICAL LIST                   */}
                {/* ======================================================== */}
                {activeLayout === 'layout-minimal-list' && (
                  <div className="w-full max-w-xl flex flex-col gap-2 my-auto py-2">
                    {[
                      { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live') },
                      { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies') },
                      { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series') },
                      { id: 'add', label: isRtl ? 'الاشتراكات وإدارة السيرفرات' : 'Subscriptions & Portals', icon: Icons.Playlist, action: () => setCurrentView('add') },
                      { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings') },
                    ].map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ x: isRtl ? -4 : 4 }}
                          onClick={item.action}
                          className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl glass-card border border-gold/30 hover:border-gold bg-black/80 flex items-center justify-between group transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gold/20 text-gold">
                              <ItemIcon className="w-5 h-5" />
                            </div>
                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white group-hover:text-gold transition-colors">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-gold">➔</span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 9: HONEYCOMB MATRIX                               */}
                {/* ======================================================== */}
                {activeLayout === 'layout-honeycomb' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-2 space-y-2.5">
                    <div className="flex justify-center gap-2.5 sm:gap-3">
                      <motion.div 
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.05 }} 
                        onClick={() => setCurrentView('live')} 
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 glass-card rounded-2xl sm:rounded-3xl border-2 border-gold/50 bg-black/75 flex flex-col items-center justify-center cursor-pointer group shadow-md"
                      >
                        <Icons.Live className="w-7 h-7 sm:w-8 sm:h-8 text-gold mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] sm:text-xs font-black uppercase text-white">{t('live')}</span>
                      </motion.div>
                      <motion.div 
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.05 }} 
                        onClick={() => setCurrentView('movies')} 
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 glass-card rounded-2xl sm:rounded-3xl border-2 border-gold/50 bg-black/75 flex flex-col items-center justify-center cursor-pointer group shadow-md"
                      >
                        <Icons.Filme className="w-7 h-7 sm:w-8 sm:h-8 text-gold mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] sm:text-xs font-black uppercase text-white">{t('movies')}</span>
                      </motion.div>
                    </div>
                    <div className="flex justify-center gap-2.5 sm:gap-3">
                      <motion.div 
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.05 }} 
                        onClick={() => setCurrentView('series')} 
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 glass-card rounded-2xl sm:rounded-3xl border-2 border-gold/50 bg-black/75 flex flex-col items-center justify-center cursor-pointer group shadow-md"
                      >
                        <Icons.Serie className="w-7 h-7 sm:w-8 sm:h-8 text-gold mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] sm:text-xs font-black uppercase text-white">{t('series')}</span>
                      </motion.div>
                      <motion.div 
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.05 }} 
                        onClick={() => setCurrentView('add')} 
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 glass-card rounded-2xl sm:rounded-3xl border-2 border-gold/50 bg-black/75 flex flex-col items-center justify-center cursor-pointer group shadow-md"
                      >
                        <Icons.Playlist className="w-7 h-7 sm:w-8 sm:h-8 text-gold mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] sm:text-xs font-black uppercase text-white">{isRtl ? 'الاشتراكات' : 'Account'}</span>
                      </motion.div>
                      <motion.div 
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.05 }} 
                        onClick={() => setCurrentView('settings')} 
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 glass-card rounded-2xl sm:rounded-3xl border-2 border-gold/50 bg-gold/15 flex flex-col items-center justify-center cursor-pointer group shadow-md"
                      >
                        <Settings className="w-7 h-7 sm:w-8 sm:h-8 text-gold mb-1 group-hover:rotate-45 transition-transform" />
                        <span className="text-[10px] sm:text-xs font-black uppercase text-white">{t('settings')}</span>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 10: FLOATING GLASS DOCK                           */}
                {/* ======================================================== */}
                {activeLayout === 'layout-floating-dock' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-4">
                    <div className="text-center space-y-1 mb-6">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest">MAC GLASS DOCK</span>
                      <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wider">ACHOUR PLAYER PORTAL</h2>
                    </div>
                    <div className="glass-card p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-white/20 shadow-xl flex items-center gap-2 sm:gap-3 bg-black/80 backdrop-blur-xl">
                      {[
                        { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live') },
                        { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies') },
                        { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series') },
                        { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add') },
                        { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings') },
                      ].map((dock) => {
                        const DockIcon = dock.icon;
                        return (
                          <motion.button
                            key={dock.id}
                            data-tv-focusable="true"
                            tabIndex={0}
                            whileHover={{ scale: 1.15, y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={dock.action}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-gold hover:text-black text-white flex flex-col items-center justify-center transition-all shadow-md group relative focus:ring-4 focus:ring-inset focus:ring-gold"
                            title={dock.label}
                          >
                            <DockIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 11: STAGGERED BENTO BOX                           */}
                {/* ======================================================== */}
                {activeLayout === 'layout-staggered-grid' && (
                  <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-auto py-2">
                    <motion.div 
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }} 
                      onClick={() => setCurrentView('live')} 
                      className="sm:col-span-2 cursor-pointer glass-card p-4 sm:p-5 rounded-2xl border-2 border-pink-500/40 bg-gradient-to-r from-pink-950/40 to-black flex items-center justify-between group"
                    >
                      <div>
                        <span className="text-[9px] font-mono text-pink-400 font-bold uppercase">FEATURED</span>
                        <h2 className="text-xl sm:text-2xl font-black uppercase text-white group-hover:text-pink-300">{t('live')}</h2>
                      </div>
                      <Icons.Live className="w-9 h-9 sm:w-11 sm:h-11 text-pink-400 shrink-0" />
                    </motion.div>
                    <motion.div 
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }} 
                      onClick={() => setCurrentView('movies')} 
                      className="cursor-pointer glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-500/30 bg-black/60 flex flex-col justify-between group"
                    >
                      <Icons.Filme className="w-7 h-7 text-blue-400" />
                      <h3 className="text-sm font-black uppercase text-white group-hover:text-gold mt-2">{t('movies')}</h3>
                    </motion.div>
                    <motion.div 
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }} 
                      onClick={() => setCurrentView('series')} 
                      className="cursor-pointer glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-purple-500/30 bg-black/60 flex flex-col justify-between group"
                    >
                      <Icons.Serie className="w-7 h-7 text-purple-400" />
                      <h3 className="text-sm font-black uppercase text-white group-hover:text-gold mt-2">{t('series')}</h3>
                    </motion.div>
                    <motion.div 
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }} 
                      onClick={() => setCurrentView('add')} 
                      className="cursor-pointer glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-500/30 bg-black/60 flex flex-col justify-between group"
                    >
                      <Icons.Playlist className="w-7 h-7 text-amber-400" />
                      <h3 className="text-sm font-black uppercase text-white group-hover:text-gold mt-2">{isRtl ? 'الاشتراكات' : 'Account'}</h3>
                    </motion.div>
                    <motion.div 
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }} 
                      onClick={() => setCurrentView('settings')} 
                      className="cursor-pointer glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gold/30 bg-gold/15 flex flex-col justify-between group"
                    >
                      <Settings className="w-7 h-7 text-gold" />
                      <h3 className="text-sm font-black uppercase text-white group-hover:text-gold mt-2">{t('settings')}</h3>
                    </motion.div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 12: APPLE TV SPOTLIGHT                            */}
                {/* ======================================================== */}
                {activeLayout === 'layout-apple-tv' && (
                  <div className="w-full max-w-5xl flex flex-col gap-3 my-auto py-2">
                    <motion.div 
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.01 }} 
                      onClick={() => setCurrentView('live')} 
                      className="cursor-pointer glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-gold/50 shadow-md bg-gradient-to-r from-gold-dark/40 via-zinc-900 to-black flex items-center justify-between group"
                    >
                      <div>
                        <span className="text-[9px] font-mono text-gold uppercase font-bold">APPLE TV SPOTLIGHT</span>
                        <h2 className="text-2xl sm:text-3xl font-black uppercase text-white group-hover:text-gold">{t('live')}</h2>
                      </div>
                      <Icons.Live className="w-10 h-10 sm:w-12 sm:h-12 text-gold shrink-0" />
                    </motion.div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { title: t('movies'), action: () => setCurrentView('movies'), icon: Icons.Filme },
                        { title: t('series'), action: () => setCurrentView('series'), icon: Icons.Serie },
                        { title: isRtl ? 'الاشتراكات' : 'Account', action: () => setCurrentView('add'), icon: Icons.Playlist },
                        { title: t('settings'), action: () => setCurrentView('settings'), icon: Settings },
                      ].map((card, i) => {
                        const IconComp = card.icon;
                        return (
                          <motion.button 
                            key={i} 
                            data-tv-focusable="true"
                            tabIndex={0}
                            whileHover={{ scale: 1.03 }} 
                            onClick={card.action} 
                            className="p-3 glass-card rounded-xl sm:rounded-2xl border border-white/10 hover:border-gold bg-black/60 flex items-center gap-2.5 text-left rtl:text-right"
                          >
                            <IconComp className="w-5 h-5 text-gold shrink-0" />
                            <span className="text-xs font-black uppercase text-white truncate">{card.title}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 13: AMAZON FIRE TV ROW                            */}
                {/* ======================================================== */}
                {activeLayout === 'layout-fire-tv' && (
                  <div className="w-full max-w-5xl flex flex-col gap-3 my-auto py-2">
                    <motion.div 
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.01 }} 
                      onClick={() => setCurrentView('live')} 
                      className="cursor-pointer p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-gold via-gold-dark to-black border-2 border-gold/50 text-white flex items-center justify-between shadow-lg"
                    >
                      <div>
                        <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[9px] font-bold uppercase">FEATURED BANNER</span>
                        <h2 className="text-xl sm:text-2xl font-black uppercase mt-1">{t('live')}</h2>
                      </div>
                      <Icons.Live className="w-9 h-9 sm:w-11 sm:h-11 shrink-0" />
                    </motion.div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <motion.button 
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }} 
                        onClick={() => setCurrentView('movies')} 
                        className="p-3 sm:p-4 glass-card rounded-xl sm:rounded-2xl border border-gold/30 bg-black/60 flex flex-col items-center gap-1.5"
                      >
                        <Icons.Filme className="w-6 h-6 sm:w-7 sm:h-7 text-gold" />
                        <span className="text-xs font-black text-white">{t('movies')}</span>
                      </motion.button>
                      <motion.button 
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }} 
                        onClick={() => setCurrentView('series')} 
                        className="p-3 sm:p-4 glass-card rounded-xl sm:rounded-2xl border border-gold/30 bg-black/60 flex flex-col items-center gap-1.5"
                      >
                        <Icons.Serie className="w-6 h-6 sm:w-7 sm:h-7 text-gold" />
                        <span className="text-xs font-black text-white">{t('series')}</span>
                      </motion.button>
                      <motion.button 
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }} 
                        onClick={() => setCurrentView('add')} 
                        className="p-3 sm:p-4 glass-card rounded-xl sm:rounded-2xl border border-gold/30 bg-black/60 flex flex-col items-center gap-1.5"
                      >
                        <Icons.Playlist className="w-6 h-6 sm:w-7 sm:h-7 text-gold" />
                        <span className="text-xs font-black text-white">{isRtl ? 'الاشتراكات' : 'Account'}</span>
                      </motion.button>
                      <motion.button 
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }} 
                        onClick={() => setCurrentView('settings')} 
                        className="p-3 sm:p-4 glass-card rounded-xl sm:rounded-2xl border border-gold/30 bg-black/60 flex flex-col items-center gap-1.5"
                      >
                        <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-gold" />
                        <span className="text-xs font-black text-white">{t('settings')}</span>
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 14: ANDROID TV LEANBACK                           */}
                {/* ======================================================== */}
                {activeLayout === 'layout-android-tv' && (
                  <div className="w-full max-w-3xl flex flex-col gap-2.5 my-auto py-2">
                    {[
                      { title: t('live'), action: () => setCurrentView('live'), icon: Icons.Live, color: 'border-gold/40 bg-gold/10' },
                      { title: t('movies'), action: () => setCurrentView('movies'), icon: Icons.Filme, color: 'border-gold/40 bg-gold/10' },
                      { title: t('series'), action: () => setCurrentView('series'), icon: Icons.Serie, color: 'border-gold/40 bg-gold/10' },
                      { title: t('settings'), action: () => setCurrentView('settings'), icon: Settings, color: 'border-gold/40 bg-gold/15' },
                    ].map((row, i) => {
                      const RowIcon = row.icon;
                      return (
                        <motion.div 
                          key={i} 
                          data-tv-focusable="true"
                          tabIndex={0}
                          role="button"
                          whileHover={{ scale: 1.02, x: isRtl ? -6 : 6 }} 
                          onClick={row.action} 
                          className={`cursor-pointer p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 ${row.color} glass-card flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset`}
                        >
                          <div className="flex items-center gap-3">
                            <RowIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gold" />
                            <span className="text-sm sm:text-base font-black uppercase text-white">{row.title}</span>
                          </div>
                          <span className="text-xs font-mono text-gold">LEANBACK ➔</span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 15: MODERN BENTO GRID                             */}
                {/* ======================================================== */}
                {activeLayout === 'layout-modern-bento' && (
                  <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-12 gap-3 my-auto py-2">
                    {/* Live TV Bento Hero (Spans 7 columns) */}
                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentView('live')}
                      className="sm:col-span-7 cursor-pointer glass-card p-5 sm:p-6 rounded-3xl border-2 border-gold/60 shadow-[0_10px_30px_rgba(0,0,0,0.6)] bg-gradient-to-br from-gold/25 via-black/80 to-black flex flex-col justify-between group relative overflow-hidden min-h-[180px] sm:min-h-[220px] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:ring-inset focus:scale-105"
                    >
                      <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                          <span className="text-[10px] sm:text-xs font-mono font-bold text-gold uppercase tracking-wider">
                            {isRtl ? 'البث المباشر الفوري' : 'Live Broadcast Station'}
                          </span>
                        </div>
                      </div>

                      <div className="my-auto py-2 z-10">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 p-3 rounded-2xl flex items-center justify-center transition-all ${active3DStyle.cardClass}`}>
                            <Icons.Live className={`w-full h-full text-gold transition-all ${active3DStyle.iconClass}`} strokeWidth={1.5} />
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-wider group-hover:text-gold transition-colors">
                              {t('live')}
                            </h2>
                            <p className="text-xs text-zinc-300 font-medium mt-1">
                              {isRtl ? 'مشاهدة القنوات الفضائية والرياضية بدقة 4K' : 'Watch all satellite & sports channels in 4K'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between z-10 pt-2 border-t border-white/10 text-[10px] font-mono text-zinc-400">
                        <span>{isRtl ? 'اضغط للتشغيل الفوري' : 'Press OK to Launch'}</span>
                        <span className="text-gold font-bold">4K ULTRA HD ➔</span>
                      </div>
                    </motion.div>

                    {/* VOD & Settings Bento Column (Spans 5 columns) */}
                    <div className="sm:col-span-5 grid grid-cols-2 gap-3">
                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCurrentView('movies')}
                        className="glass-card p-4 rounded-3xl border border-gold/40 hover:border-gold focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-105 flex flex-col items-center justify-center text-center group bg-black/60 shadow-lg min-h-[100px]"
                      >
                        <div className="w-10 h-10 mb-2 p-2 rounded-xl bg-gold/15 text-gold group-hover:scale-110 transition-transform">
                          <Icons.Filme className="w-full h-full" strokeWidth={1.5} />
                        </div>
                        <span className="text-xs font-black uppercase text-white group-hover:text-gold tracking-wider truncate w-full">
                          {t('movies')}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-bold mt-0.5">VOD CINEMA</span>
                      </motion.button>

                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCurrentView('series')}
                        className="glass-card p-4 rounded-3xl border border-gold/40 hover:border-gold focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-105 flex flex-col items-center justify-center text-center group bg-black/60 shadow-lg min-h-[100px]"
                      >
                        <div className="w-10 h-10 mb-2 p-2 rounded-xl bg-gold/15 text-gold group-hover:scale-110 transition-transform">
                          <Icons.Serie className="w-full h-full" strokeWidth={1.5} />
                        </div>
                        <span className="text-xs font-black uppercase text-white group-hover:text-gold tracking-wider truncate w-full">
                          {t('series')}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-bold mt-0.5">TV DRAMA</span>
                      </motion.button>

                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCurrentView('add')}
                        className="glass-card p-4 rounded-3xl border border-white/20 hover:border-gold focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-105 flex flex-col items-center justify-center text-center group bg-black/60 shadow-lg min-h-[100px]"
                      >
                        <div className="w-10 h-10 mb-2 p-2 rounded-xl bg-white/10 text-gold group-hover:scale-110 transition-transform">
                          <Icons.Playlist className="w-full h-full" strokeWidth={1.5} />
                        </div>
                        <span className="text-xs font-black uppercase text-white group-hover:text-gold tracking-wider truncate w-full">
                          {isRtl ? 'الاشتراكات' : 'Account'}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-bold mt-0.5">PLAYLISTS</span>
                      </motion.button>

                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCurrentView('settings')}
                        className="glass-card p-4 rounded-3xl border border-gold/40 hover:border-gold focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-105 flex flex-col items-center justify-center text-center group bg-gold/15 shadow-lg min-h-[100px]"
                      >
                        <div className="w-10 h-10 mb-2 p-2 rounded-xl bg-gold text-black group-hover:rotate-45 transition-transform shadow-md">
                          <Settings className="w-full h-full" strokeWidth={1.8} />
                        </div>
                        <span className="text-xs font-black uppercase text-gold tracking-wider truncate w-full">
                          {t('settings')}
                        </span>
                        <span className="text-[9px] text-zinc-300 font-bold mt-0.5">OPTIONS</span>
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 16: GLASS SIDEBAR NAVIGATION                      */}
                {/* ======================================================== */}
                {activeLayout === 'layout-sidebar-glass' && (
                  <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch my-auto py-2">
                    {/* Left Frosted Glass Sidebar */}
                    <div className="sm:col-span-4 glass-card p-4 rounded-3xl border-2 border-white/20 bg-black/75 backdrop-blur-2xl flex flex-col justify-between space-y-2 shadow-2xl">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/10">
                          <span className="text-[10px] font-mono font-bold text-gold uppercase tracking-widest">
                            GLASS NAV
                          </span>
                        </div>
                        {[
                          { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live'), tag: '4K LIVE' },
                          { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies'), tag: 'CINEMA' },
                          { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series'), tag: 'SERIES' },
                          { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add'), tag: 'IPTV' },
                          { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings'), tag: 'SYSTEM' },
                        ].map((btn) => {
                          const IconComp = btn.icon;
                          return (
                            <motion.button
                              key={btn.id}
                              data-tv-focusable="true"
                              tabIndex={0}
                              whileHover={{ x: isRtl ? -4 : 4 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={btn.action}
                              className="w-full p-2.5 rounded-2xl border border-white/10 hover:border-gold/60 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold bg-black/50 hover:bg-gold/20 flex items-center justify-between transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gold/20 text-gold group-hover:scale-110 transition-transform">
                                  <IconComp className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-black uppercase text-white group-hover:text-gold transition-colors">
                                  {btn.label}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-zinc-500 group-hover:text-gold font-bold">
                                {btn.tag}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>

                      <button
                        data-tv-focusable="true"
                        tabIndex={0}
                        onClick={() => setShowExitModal(true)}
                        className="w-full py-2.5 px-3 rounded-2xl border border-red-500/30 bg-red-950/25 hover:bg-red-900/50 text-red-400 font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-400"
                      >
                        <LogOut size={15} />
                        <span>{t('exit_app')}</span>
                      </button>
                    </div>

                    {/* Right Spotlight Showcase Pane */}
                    <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <motion.div
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setCurrentView('live')}
                        className="sm:col-span-2 cursor-pointer glass-card p-6 rounded-3xl border-2 border-gold/50 bg-gradient-to-br from-gold/30 via-zinc-950 to-black flex items-center justify-between group shadow-xl focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-105"
                      >
                        <div>
                          <span className="text-[10px] font-mono text-gold font-bold uppercase tracking-widest block mb-1">
                            MAIN BROADCAST
                          </span>
                          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white group-hover:text-gold transition-colors">
                            {t('live')}
                          </h2>
                          <p className="text-xs text-zinc-300 mt-1">
                            {isRtl ? 'البث المباشر لجميع القنوات المفضلة والرياضية' : 'Full HD & 4K Live satellite streaming'}
                          </p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-gold/20 text-gold flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 border border-gold/40">
                          <Icons.Live className="w-9 h-9" />
                        </div>
                      </motion.div>

                      <motion.div
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setCurrentView('movies')}
                        className="cursor-pointer glass-card p-4 rounded-3xl border border-white/20 hover:border-gold bg-black/60 flex flex-col justify-between group shadow-lg focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold"
                      >
                        <div className="p-3 rounded-2xl bg-gold/15 text-gold w-fit group-hover:scale-110 transition-transform">
                          <Icons.Filme className="w-7 h-7" />
                        </div>
                        <div className="mt-3">
                          <h3 className="text-base font-black text-white group-hover:text-gold uppercase">
                            {t('movies')}
                          </h3>
                          <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">4K ULTRA HD VOD</span>
                        </div>
                      </motion.div>

                      <motion.div
                        data-tv-focusable="true"
                        tabIndex={0}
                        role="button"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setCurrentView('series')}
                        className="cursor-pointer glass-card p-4 rounded-3xl border border-white/20 hover:border-gold bg-black/60 flex flex-col justify-between group shadow-lg focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold"
                      >
                        <div className="p-3 rounded-2xl bg-gold/15 text-gold w-fit group-hover:scale-110 transition-transform">
                          <Icons.Serie className="w-7 h-7" />
                        </div>
                        <div className="mt-3">
                          <h3 className="text-base font-black text-white group-hover:text-gold uppercase">
                            {t('series')}
                          </h3>
                          <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">SERIES SEASONS</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 17: COMPACT TILE GRID                             */}
                {/* ======================================================== */}
                {activeLayout === 'layout-compact-tiles' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-3">
                    <div className="text-center mb-4 space-y-1">
                      <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wider">
                        {isRtl ? 'الشبكة المدمجة السريعة' : 'Fast Compact Tiles'}
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3.5 w-full">
                      {[
                        { id: 'live', num: '01', title: t('live'), sub: isRtl ? 'مباشر' : 'Live', icon: Icons.Live, action: () => setCurrentView('live'), highlight: true },
                        { id: 'movies', num: '02', title: t('movies'), sub: isRtl ? 'أفلام' : 'Cinema', icon: Icons.Filme, action: () => setCurrentView('movies'), highlight: false },
                        { id: 'series', num: '03', title: t('series'), sub: isRtl ? 'مسلسلات' : 'Series', icon: Icons.Serie, action: () => setCurrentView('series'), highlight: false },
                        { id: 'add', num: '04', title: isRtl ? 'الاشتراكات' : 'Account', sub: isRtl ? 'القوائم' : 'Playlists', icon: Icons.Playlist, action: () => setCurrentView('add'), highlight: false },
                        { id: 'settings', num: '05', title: t('settings'), sub: isRtl ? 'النظام' : 'System', icon: Settings, action: () => setCurrentView('settings'), highlight: false },
                      ].map((tile) => {
                        const TileIcon = tile.icon;
                        return (
                          <motion.button
                            key={tile.id}
                            data-tv-focusable="true"
                            tabIndex={0}
                            whileHover={{ scale: 1.05, y: -3 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={tile.action}
                            className={`p-4 rounded-3xl glass-card border-2 flex flex-col justify-between items-center text-center transition-all group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-105 shadow-xl min-h-[140px] sm:min-h-[160px] ${
                              tile.highlight
                                ? 'border-gold bg-gradient-to-b from-gold/30 via-black to-black'
                                : 'border-white/15 hover:border-gold/60 bg-black/75'
                            }`}
                          >
                            <span className="text-[10px] font-mono font-bold text-gold/70 group-hover:text-gold w-full text-left rtl:text-right">
                              {tile.num}
                            </span>
                            <div className="my-auto py-2">
                              <TileIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gold group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                            </div>
                            <div className="w-full pt-2 border-t border-white/10">
                              <span className="text-xs sm:text-sm font-black uppercase text-white block group-hover:text-gold truncate">
                                {tile.title}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-bold block truncate">
                                {tile.sub}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 18: FULL HERO SHOWCASE                            */}
                {/* ======================================================== */}
                {activeLayout === 'layout-full-hero' && (
                  <div className="w-full max-w-5xl flex flex-col gap-3.5 my-auto py-2">
                    {/* Top Massive Cinematic Hero */}
                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setCurrentView('live')}
                      className="cursor-pointer glass-card p-6 sm:p-8 rounded-3xl border-2 border-gold/60 bg-gradient-to-r from-gold/30 via-gold-dark/20 to-black shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-[1.02]"
                    >
                      <div className="space-y-2 text-left rtl:text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-gold">4K ULTRA HIGH DEFINITION</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-wider group-hover:text-gold transition-colors">
                          {t('live')} & CINEMA VOD
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
                          {isRtl ? 'استمتع بأقوى مكتبة قنوات فضائية ورياضية مع آلاف الأفلام والمسلسلات الحصرية' : 'Experience high quality TV channels, live sports, 4K movies and complete TV series'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="px-5 py-3 rounded-2xl bg-gold text-black font-black text-xs uppercase flex items-center gap-2 shadow-lg group-hover:scale-105 transition-transform">
                          <Icons.Live className="w-5 h-5 text-black" />
                          <span>{isRtl ? 'تشغيل فوري' : 'Watch Now'}</span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Lower Fast Action Carousel */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { title: t('movies'), sub: '4K CINEMA', icon: Icons.Filme, action: () => setCurrentView('movies') },
                        { title: t('series'), sub: 'EPISODES', icon: Icons.Serie, action: () => setCurrentView('series') },
                        { title: isRtl ? 'الاشتراكات' : 'Account', sub: 'M3U & XTREAM', icon: Icons.Playlist, action: () => setCurrentView('add') },
                        { title: t('settings'), sub: 'SYSTEM', icon: Settings, action: () => setCurrentView('settings') },
                      ].map((item, idx) => {
                        const ItemIcon = item.icon;
                        return (
                          <motion.button
                            key={idx}
                            data-tv-focusable="true"
                            tabIndex={0}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={item.action}
                            className="p-4 rounded-2xl glass-card border border-white/20 hover:border-gold focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold bg-black/60 flex items-center gap-3 text-left rtl:text-right transition-all group shadow-md"
                          >
                            <div className="p-2.5 rounded-xl bg-gold/15 text-gold group-hover:scale-110 transition-transform shrink-0">
                              <ItemIcon className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black uppercase text-white group-hover:text-gold block truncate">
                                {item.title}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-400 font-bold block truncate">
                                {item.sub}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 19: SPLIT HERO GRID                               */}
                {/* ======================================================== */}
                {activeLayout === 'layout-split-hero' && (
                  <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-auto py-2">
                    {/* Left Split Hero: Live Channels */}
                    <motion.div
                      data-tv-focusable="true"
                      tabIndex={0}
                      role="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentView('live')}
                      className="cursor-pointer glass-card p-6 rounded-3xl border-2 border-gold/60 bg-gradient-to-br from-gold/30 via-black to-black flex flex-col justify-between shadow-2xl group min-h-[200px] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-105"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-full font-mono font-bold text-[10px] flex items-center gap-1.5 border border-red-500/30">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                          {isRtl ? 'بث تلفزيوني مباشر' : 'LIVE TELEVISION'}
                        </span>
                      </div>

                      <div className="my-auto py-3">
                        <Icons.Live className="w-12 h-12 text-gold mb-2 group-hover:scale-110 transition-transform" />
                        <h2 className="text-2xl font-black uppercase text-white group-hover:text-gold transition-colors">
                          {t('live')}
                        </h2>
                        <p className="text-xs text-zinc-300 mt-1">
                          {isRtl ? 'جميع باقات القنوات المشفرة والرياضية والإخبارية' : 'Full access to live television and live sports streams'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span>OK TO OPEN</span>
                        <span className="text-gold font-bold">WATCH LIVE ➔</span>
                      </div>
                    </motion.div>

                    {/* Right Split Section: VOD & System */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCurrentView('movies')}
                        className="glass-card p-4 rounded-3xl border border-white/20 hover:border-gold focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold flex flex-col justify-between items-center text-center group bg-black/60 shadow-lg min-h-[95px]"
                      >
                        <Icons.Filme className="w-8 h-8 text-gold group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase text-white group-hover:text-gold truncate w-full">
                          {t('movies')}
                        </span>
                      </motion.button>

                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCurrentView('series')}
                        className="glass-card p-4 rounded-3xl border border-white/20 hover:border-gold focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold flex flex-col justify-between items-center text-center group bg-black/60 shadow-lg min-h-[95px]"
                      >
                        <Icons.Serie className="w-8 h-8 text-gold group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase text-white group-hover:text-gold truncate w-full">
                          {t('series')}
                        </span>
                      </motion.button>

                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCurrentView('add')}
                        className="glass-card p-4 rounded-3xl border border-white/20 hover:border-gold focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold flex flex-col justify-between items-center text-center group bg-black/60 shadow-lg min-h-[95px]"
                      >
                        <Icons.Playlist className="w-8 h-8 text-gold group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase text-white group-hover:text-gold truncate w-full">
                          {isRtl ? 'الاشتراكات' : 'Account'}
                        </span>
                      </motion.button>

                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCurrentView('settings')}
                        className="glass-card p-4 rounded-3xl border border-gold/40 hover:border-gold focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold flex flex-col justify-between items-center text-center group bg-gold/15 shadow-lg min-h-[95px]"
                      >
                        <Settings className="w-8 h-8 text-gold group-hover:rotate-45 transition-transform" />
                        <span className="text-xs font-black uppercase text-gold truncate w-full">
                          {t('settings')}
                        </span>
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 20: FLOATING NAV STRIP                            */}
                {/* ======================================================== */}
                {activeLayout === 'layout-floating-strip' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-4">
                    <div className="glass-card p-3 sm:p-4 rounded-3xl border-2 border-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.25)] flex flex-wrap items-center justify-center gap-3 bg-black/85 backdrop-blur-2xl">
                      {[
                        { id: 'live', label: t('live'), desc: isRtl ? 'بث مباشر' : 'Broadcast', icon: Icons.Live, action: () => setCurrentView('live'), primary: true },
                        { id: 'movies', label: t('movies'), desc: isRtl ? 'سينما 4K' : 'Cinema', icon: Icons.Filme, action: () => setCurrentView('movies'), primary: false },
                        { id: 'series', label: t('series'), desc: isRtl ? 'مسلسلات' : 'Series', icon: Icons.Serie, action: () => setCurrentView('series'), primary: false },
                        { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', desc: isRtl ? 'القوائم' : 'Playlists', icon: Icons.Playlist, action: () => setCurrentView('add'), primary: false },
                        { id: 'settings', label: t('settings'), desc: isRtl ? 'الإعدادات' : 'System', icon: Settings, action: () => setCurrentView('settings'), primary: false },
                      ].map((strip) => {
                        const StripIcon = strip.icon;
                        return (
                          <motion.button
                            key={strip.id}
                            data-tv-focusable="true"
                            tabIndex={0}
                            whileHover={{ scale: 1.08, y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={strip.action}
                            className={`p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-110 min-w-[90px] sm:min-w-[110px] ${
                              strip.primary
                                ? 'bg-gold text-black shadow-lg shadow-gold/30 font-black'
                                : 'bg-white/10 hover:bg-gold/20 text-white border border-white/10 hover:border-gold/50'
                            }`}
                          >
                            <StripIcon className={`w-7 h-7 sm:w-8 sm:h-8 ${strip.primary ? 'text-black' : 'text-gold'} group-hover:scale-110 transition-transform`} />
                            <span className="text-xs font-black uppercase tracking-wider truncate w-full text-center">
                              {strip.label}
                            </span>
                            <span className={`text-[8px] font-bold uppercase truncate w-full text-center ${strip.primary ? 'text-black/80' : 'text-zinc-400'}`}>
                              {strip.desc}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 21: CYBER MATRIX GRID                             */}
                {/* ======================================================== */}
                {activeLayout === 'layout-cyber-matrix' && (
                  <div className="w-full max-w-5xl flex flex-col items-center justify-center my-auto py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full">
                      {[
                        { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live'), border: 'border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/40 text-cyan-300' },
                        { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies'), border: 'border-fuchsia-500/50 hover:border-fuchsia-400 bg-fuchsia-950/40 text-fuchsia-300' },
                        { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series'), border: 'border-amber-500/50 hover:border-amber-400 bg-amber-950/40 text-amber-300' },
                        { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add'), border: 'border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/40 text-emerald-300' },
                        { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings'), border: 'border-gold/50 hover:border-gold bg-zinc-900/80 text-gold' },
                      ].map(item => (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ scale: 1.05, y: -4 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={item.action}
                          className={`p-4 rounded-2xl border-2 ${item.border} flex flex-col items-center justify-center gap-2 shadow-xl focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold backdrop-blur-xl`}
                        >
                          <item.icon className="w-8 h-8" />
                          <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 22: ORBIT CAROUSEL                                */}
                {/* ======================================================== */}
                {activeLayout === 'layout-orbit-carousel' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-6">
                    <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                      {[
                        { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live') },
                        { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies') },
                        { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series') },
                        { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add') },
                        { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings') },
                      ].map((item, idx) => (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ scale: 1.1, rotate: 2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={item.action}
                          className="glass-card p-6 rounded-3xl border-2 border-gold/40 hover:border-gold bg-gradient-to-br from-black/90 to-zinc-900/90 flex flex-col items-center justify-center gap-3 w-32 sm:w-36 h-36 shadow-2xl focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold"
                        >
                          <item.icon className="w-10 h-10 text-gold" />
                          <span className="text-xs font-black uppercase tracking-wider text-white">{item.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 23: MAGAZINE EDITORIAL                              */}
                {/* ======================================================== */}
                {activeLayout === 'layout-magazine-editorial' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        onClick={() => setCurrentView('live')}
                        className="sm:col-span-2 glass-card p-6 rounded-3xl border border-gold/40 hover:border-gold bg-gradient-to-r from-gold/20 to-black/80 flex items-center justify-between text-left group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold shadow-xl"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gold uppercase">{isRtl ? 'البث المميز' : 'Featured Broadcast'}</span>
                          <h3 className="text-xl font-black uppercase text-white">{t('live')}</h3>
                        </div>
                        <Icons.Live className="w-12 h-12 text-gold group-hover:scale-110 transition-transform" />
                      </motion.button>
                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        onClick={() => setCurrentView('movies')}
                        className="glass-card p-6 rounded-3xl border border-gold/40 hover:border-gold bg-black/80 flex flex-col items-center justify-center gap-2 group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold shadow-xl"
                      >
                        <Icons.Filme className="w-10 h-10 text-gold group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-black uppercase text-white">{t('movies')}</span>
                      </motion.button>
                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        onClick={() => setCurrentView('series')}
                        className="glass-card p-4 rounded-3xl border border-gold/40 hover:border-gold bg-black/80 flex items-center gap-3 group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold shadow-xl"
                      >
                        <Icons.Serie className="w-8 h-8 text-gold" />
                        <span className="text-xs font-black uppercase text-white">{t('series')}</span>
                      </motion.button>
                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        onClick={() => setCurrentView('add')}
                        className="glass-card p-4 rounded-3xl border border-gold/40 hover:border-gold bg-black/80 flex items-center gap-3 group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold shadow-xl"
                      >
                        <Icons.Playlist className="w-8 h-8 text-gold" />
                        <span className="text-xs font-black uppercase text-white">{isRtl ? 'الاشتراكات' : 'Account'}</span>
                      </motion.button>
                      <motion.button
                        data-tv-focusable="true"
                        tabIndex={0}
                        onClick={() => setCurrentView('settings')}
                        className="glass-card p-4 rounded-3xl border border-gold/40 hover:border-gold bg-gold/20 flex items-center gap-3 group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold shadow-xl"
                      >
                        <Settings className="w-8 h-8 text-gold" />
                        <span className="text-xs font-black uppercase text-gold">{t('settings')}</span>
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 24: NEON PODIUM                                   */}
                {/* ======================================================== */}
                {activeLayout === 'layout-neon-podium' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-6">
                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                      {[
                        { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live'), primary: true },
                        { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies'), primary: false },
                        { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series'), primary: false },
                        { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add'), primary: false },
                        { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings'), primary: false },
                      ].map(item => (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ scale: 1.08, y: -6 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={item.action}
                          className={`p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold shadow-[0_0_20px_rgba(212,175,55,0.2)] min-w-[120px] ${
                            item.primary ? 'bg-gradient-to-t from-gold to-amber-300 text-black font-black' : 'bg-black/90 border border-gold/40 hover:border-gold text-white'
                          }`}
                        >
                          <item.icon className={`w-8 h-8 ${item.primary ? 'text-black' : 'text-gold'}`} />
                          <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 25: DIAMOND QUAD                                  */}
                {/* ======================================================== */}
                {activeLayout === 'layout-diamond-quad' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                      {[
                        { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live') },
                        { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies') },
                        { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series') },
                        { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings') },
                      ].map(item => (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ scale: 1.06, rotate: 1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={item.action}
                          className="glass-card p-6 rounded-[2.5rem] border-2 border-gold/50 hover:border-gold bg-black/85 flex flex-col items-center justify-center gap-3 shadow-2xl focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold"
                        >
                          <item.icon className="w-10 h-10 text-gold" />
                          <span className="text-xs font-black uppercase tracking-wider text-white">{item.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 26: GAME CONSOLE                                  */}
                {/* ======================================================== */}
                {activeLayout === 'layout-game-console' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-4">
                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                      {[
                        { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live') },
                        { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies') },
                        { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series') },
                        { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add') },
                        { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings') },
                      ].map(item => (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={item.action}
                          className="glass-card px-6 py-5 rounded-2xl border-2 border-gold/40 hover:border-gold bg-zinc-950/90 flex items-center gap-3 shadow-xl focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold"
                        >
                          <item.icon className="w-7 h-7 text-gold" />
                          <span className="text-xs font-black uppercase tracking-wider text-white">{item.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 27: PANORAMIC CARDS                               */}
                {/* ======================================================== */}
                {activeLayout === 'layout-panoramic-cards' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-4">
                    <div className="flex flex-col gap-3 w-full max-w-2xl">
                      {[
                        { id: 'live', label: t('live'), desc: isRtl ? 'البث الحي التلفزيوني' : 'Live Broadcast', icon: Icons.Live, action: () => setCurrentView('live') },
                        { id: 'movies', label: t('movies'), desc: isRtl ? 'مكتبة الأفلام السينمائية' : 'Cinema Collection', icon: Icons.Filme, action: () => setCurrentView('movies') },
                        { id: 'series', label: t('series'), desc: isRtl ? 'المسلسلات والبرامج' : 'Series & Shows', icon: Icons.Serie, action: () => setCurrentView('series') },
                        { id: 'settings', label: t('settings'), desc: isRtl ? 'إعدادات النظام والتحكم' : 'System & Controls', icon: Settings, action: () => setCurrentView('settings') },
                      ].map(item => (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ scale: 1.03, x: 6 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={item.action}
                          className="glass-card p-4 rounded-2xl border border-gold/40 hover:border-gold bg-black/80 flex items-center justify-between text-left group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold shadow-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gold/15 text-gold group-hover:scale-110 transition-transform">
                              <item.icon className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="text-sm font-black uppercase text-white">{item.label}</span>
                              <p className="text-[10px] text-zinc-400 font-bold">{item.desc}</p>
                            </div>
                          </div>
                          <Crown className="w-5 h-5 text-gold/60 group-hover:text-gold transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 28: GLASS MOSAIC                                  */}
                {/* ======================================================== */}
                {activeLayout === 'layout-glass-mosaic' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-4">
                    <div className="grid grid-cols-3 gap-3 w-full">
                      {[
                        { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live'), span: 'col-span-2' },
                        { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies'), span: 'col-span-1' },
                        { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series'), span: 'col-span-1' },
                        { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add'), span: 'col-span-1' },
                        { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings'), span: 'col-span-1' },
                      ].map(item => (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={item.action}
                          className={`${item.span} glass-card p-5 rounded-3xl border border-gold/40 hover:border-gold bg-black/85 flex flex-col items-center justify-center gap-2 shadow-xl focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold`}
                        >
                          <item.icon className="w-8 h-8 text-gold" />
                          <span className="text-xs font-black uppercase tracking-wider text-white">{item.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 29: VERTICAL REEL                                 */}
                {/* ======================================================== */}
                {activeLayout === 'layout-vertical-reel' && (
                  <div className="w-full max-w-md flex flex-col items-center justify-center my-auto py-4">
                    <div className="flex flex-col gap-2.5 w-full">
                      {[
                        { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live') },
                        { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies') },
                        { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series') },
                        { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add') },
                        { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings') },
                      ].map(item => (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ scale: 1.04, x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={item.action}
                          className="glass-card p-3.5 rounded-2xl border border-gold/40 hover:border-gold bg-black/90 flex items-center gap-3.5 group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold shadow-lg w-full"
                        >
                          <item.icon className="w-6 h-6 text-gold group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-black uppercase tracking-wider text-white">{item.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* LAYOUT 30: MINIMALIST ZEN                                */}
                {/* ======================================================== */}
                {activeLayout === 'layout-minimalist-zen' && (
                  <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto py-6">
                    <div className="flex flex-wrap items-center justify-center gap-6 w-full">
                      {[
                        { id: 'live', label: t('live'), icon: Icons.Live, action: () => setCurrentView('live') },
                        { id: 'movies', label: t('movies'), icon: Icons.Filme, action: () => setCurrentView('movies') },
                        { id: 'series', label: t('series'), icon: Icons.Serie, action: () => setCurrentView('series') },
                        { id: 'add', label: isRtl ? 'الاشتراكات' : 'Account', icon: Icons.Playlist, action: () => setCurrentView('add') },
                        { id: 'settings', label: t('settings'), icon: Settings, action: () => setCurrentView('settings') },
                      ].map(item => (
                        <motion.button
                          key={item.id}
                          data-tv-focusable="true"
                          tabIndex={0}
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={item.action}
                          className="p-4 rounded-full border border-gold/30 hover:border-gold bg-black/60 hover:bg-gold/20 flex items-center justify-center text-white group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold shadow-lg w-16 h-16 transition-all"
                          title={item.label}
                        >
                          <item.icon className="w-7 h-7 text-gold group-hover:scale-110 transition-transform" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          );
        })()}

        {/* Extraction Progress Modal */}
        <AnimatePresence>
          {showExtractionModal && extractionProgress && (
            <ExtractionProgressModal 
              progress={extractionProgress} 
              playlistName={activePlaylistName} 
              language={settings.language}
              onClose={() => {
                setShowExtractionModal(false);
                setExtractionProgress(null);
                fetchActivePlaylist();
              }}
              onRetry={async () => {
                if (activePlaylistData) {
                  setShowExtractionModal(true);
                  await ExtractionService.extract(activePlaylistData, (progress) => {
                    setExtractionProgress(progress);
                  }, true);
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Exit Confirmation Modal */}
        <ExitConfirmModal
          isOpen={showExitModal}
          onConfirmExit={handleExitApp}
          onCancel={() => setShowExitModal(false)}
          language={settings.language}
        />

        {/* Toast Notification */}
        <AnimatePresence>
          {refreshToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-zinc-950/95 border border-gold/40 text-gold rounded-2xl shadow-2xl text-[11px] font-bold backdrop-blur-md"
            >
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>{t('data_refreshed')}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}


function HubCard({ 
  onClick, 
  icon, 
  label, 
  subLabel, 
  scale = 'medium' 
}: { 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  subLabel?: string;
  scale?: 'small' | 'medium' | 'large';
}) {
  const sizeClasses = 
    scale === 'small' 
      ? 'w-16 sm:w-20 md:w-24 h-20 sm:h-22 md:h-26 p-1.5' 
      : scale === 'large' 
        ? 'w-20 sm:w-26 md:w-30 h-24 sm:h-26 md:h-32 p-2' 
        : 'w-18 sm:w-24 md:w-28 h-22 sm:h-24 md:h-30 p-1.5';

  return (
    <motion.button
      data-tv-focusable="true"
      tabIndex={0}
      initial={false}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${sizeClasses} rounded-xl glass-card border-2 border-gold/40 hover:border-gold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset focus:scale-105 bg-black/75 hover:bg-black/90 shadow-[0_0_15px_rgba(212,175,55,0.2)] flex flex-col items-center justify-between text-center group cursor-pointer transition-all duration-200 relative overflow-hidden shrink-0`}
    >
      <div className="flex-1 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 overflow-hidden">
        {icon}
      </div>
      <div className="flex flex-col items-center gap-0.5 z-10 w-full pt-0.5 border-t border-white/10 shrink-0">
        <span className="text-[8px] sm:text-[9px] md:text-xs font-black tracking-wider uppercase text-gold group-hover:brightness-125 transition-all truncate w-full">
          {label}
        </span>
        {subLabel && (
          <span className="text-[6px] sm:text-[7px] md:text-[8px] text-zinc-300 font-bold tracking-normal opacity-90 group-hover:opacity-100 transition-opacity truncate w-full">
            {subLabel}
          </span>
        )}
      </div>
    </motion.button>
  );
}
