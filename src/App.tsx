import React, { useState, useEffect, useRef } from 'react';
import { getPublicId } from './lib/firebase';
import Dashboard from './components/Dashboard';
import SplashScreen from './components/SplashScreen';
import AnimatedBackground from './components/AnimatedBackground';
import { motion, AnimatePresence } from 'framer-motion';
import { AppSettings, Language } from './types';
import { applyRoyalTheme } from './utils/themeManager';
import { DEFAULT_PLAYERS } from './components/SettingsView';
import { runStorageCleanup } from './utils/storageCleanup';
import { parseTVKeyEvent, executeBackHandler, isTextInput } from './utils/tvNavigation';
import { AlertTriangle, Monitor, Smartphone } from 'lucide-react';


const DEFAULT_SETTINGS: AppSettings = {
  language: 'ar',
  hiddenCategories: [],
  hiddenLiveCategories: [],
  hiddenMovieCategories: [],
  hiddenSeriesCategories: [],
  timeFormat: '24h',
  viewMode: 'list',
  useExternalPlayer: false,
  externalPlayers: DEFAULT_PLAYERS,
  selectedPlayer: 'Achour Player (مدمج - Native)',
  installedPlayers: ['Achour Player (مدمج - Native)'],
  activePlaylistId: null,
  searchHistory: {
    movies: [],
    series: [],
  },
  royalThemeColor: 'royal-gold',
  icon3DStyle: 'style-gold-3d',
  backgroundStyle: 'anim-golden-dust',
  customBackground: null,
  vpnEnabled: true,
  vpnRegion: 'auto',
  vpnMode: 'auto-relay',
  dashboardLayout: 'layout-smarttv-hero',
  splashSoundTrack: 'epic_royal_fanfare',
  splashStyle: 'royal_gold_particles',
  iconScale: 'medium',
  zoomScale: 98,
};

import XtreamDebugOverlay from './components/XtreamDebugOverlay';


export default function App() {
  const [userId, setUserId] = useState<string>(() => getPublicId());
  const [showSplash, setShowSplash] = useState(true);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {

    // Allow running on all devices
    setIsRestricted(false);
  }, []);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('achour_settings_v2');
    const langInitialized = localStorage.getItem('achour_lang_initialized_v2');
    if (!saved) {
      localStorage.setItem('achour_lang_initialized_v2', 'true');
      return DEFAULT_SETTINGS;
    }
    try {
      const parsed = JSON.parse(saved);
      let lang = parsed.language;
      if (!langInitialized) {
        lang = 'ar';
        localStorage.setItem('achour_lang_initialized_v2', 'true');
      }
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        language: lang || 'ar',
        searchHistory: {
          ...DEFAULT_SETTINGS.searchHistory,
          ...(parsed.searchHistory || {})
        }
      };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });


  useEffect(() => {
    // Safety fallback timer for splash screen to prevent black screen
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 12000);

    try {
      const id = getPublicId();
      if (id) setUserId(id);

      runStorageCleanup();
    } catch (err) {
      console.warn('App initialization storage notice:', err);
    }

    return () => clearTimeout(splashTimer);
  }, []);

  const prevPlaylistIdRef = useRef<string | undefined>(settings.activePlaylistId);

  useEffect(() => {
    try {
      localStorage.setItem('achour_settings_v2', JSON.stringify(settings));
    } catch (e) {}
    
    // Clear in-memory global cache when active playlist changes (keep persistent IndexedDB intact!)
    if (settings.activePlaylistId !== prevPlaylistIdRef.current) {
      prevPlaylistIdRef.current = settings.activePlaylistId;
      (async () => {
        const { iptvGlobalCache } = await import('./utils/iptv');
        iptvGlobalCache.clear();
      })();
    }


    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
    applyRoyalTheme(settings.royalThemeColor || 'royal-gold');
  }, [settings]);

  // Global Hardware Back Key Interceptor for Android TV, Fire TV & Android Phones
  useEffect(() => {
    // Lock browser history state to block page unloading / navigation on Back
    window.history.pushState({ page: 'achour_app' }, '', window.location.href);
    const handlePopState = (e: PopStateEvent) => {
      window.history.pushState({ page: 'achour_app' }, '', window.location.href);
      executeBackHandler();
    };
    window.addEventListener('popstate', handlePopState);

    const triggerBack = (): boolean => {
      const handled = executeBackHandler();
      if (handled) return true;

      // Dispatched custom event for child components
      const event = new CustomEvent('app_back_pressed');
      window.dispatchEvent(event);
      return false;
    };

    (window as any).handleAndroidBack = () => {
      triggerBack();
    };

    const handleGlobalBack = (e: KeyboardEvent) => {
      const action = parseTVKeyEvent(e);
      if (action === 'BACK') {
        if (e.key === 'Backspace' && isTextInput(document.activeElement)) {
          return;
        }

        // Always block default browser / Android back exit behavior!
        e.preventDefault();
        e.stopPropagation();
        triggerBack();
      }
    };

    window.addEventListener('keydown', handleGlobalBack, { capture: true });
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleGlobalBack, { capture: true });
      delete (window as any).handleAndroidBack;
    };
  }, []);

  return (
    <div className={`min-h-screen w-full bg-[#080808] text-white selection:bg-[#D4AF37]/30 ${settings.language === 'ar' ? 'font-cairo' : 'font-sans'} relative overflow-x-hidden`}>
      {/* App Backgrounds */}
      <AnimatedBackground settings={settings} />

      {/* Hidden Debug Overlay */}
      <XtreamDebugOverlay />

      {/* Animated 3D Logo & Intro Music Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen 
            onComplete={() => setShowSplash(false)} 
            royalThemeId={settings.royalThemeColor || 'royal-gold'} 
            soundTrack={settings.splashSoundTrack || 'epic_royal_fanfare'}
            splashStyle={settings.splashStyle || 'royal_gold_particles'}
          />
        )}
      </AnimatePresence>

      {/* Device Restriction Overlay (Fire TV / Android Box Only) */}
      <AnimatePresence>
        {isRestricted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/40">
              <Smartphone size={48} className="text-red-500 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-4">
              {settings.language === 'ar' ? 'الجهاز غير مدعوم' : 'Device Not Supported'}
            </h1>
            <div className="max-w-md space-y-4 text-zinc-400 font-bold">
              <p className="text-sm">
                {settings.language === 'ar' 
                  ? 'عذراً، هذا التطبيق مصمم حصرياً للعمل على أجهزة Fire TV و Android Box.' 
                  : 'Sorry, this application is exclusively designed for Fire TV and Android Box devices.'}
              </p>
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center gap-4 text-left rtl:text-right">
                <Monitor className="text-gold shrink-0" size={24} />
                <p className="text-xs">
                  {settings.language === 'ar'
                    ? 'يرجى فتح التطبيق من خلال شاشة التلفاز للحصول على أفضل تجربة.'
                    : 'Please launch the app on your TV screen for the best experience.'}
                </p>
              </div>
            </div>
            <div className="mt-8 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              Achour Player • TV Edition Only
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard & Content */}
      <div 
        className={`relative z-10 min-h-screen w-full transition-transform duration-200 ${isRestricted ? 'blur-2xl pointer-events-none' : ''}`}
        style={{
          transform: `scale(${(settings.zoomScale || 100) / 100})`,
          transformOrigin: 'center center'
        }}
      >
        {userId && (
          <Dashboard 
            userId={userId} 
            settings={settings} 
            onUpdateSettings={setSettings} 
            onTriggerSplash={() => setShowSplash(true)}
          />
        )}
      </div>
    </div>
  );
}


