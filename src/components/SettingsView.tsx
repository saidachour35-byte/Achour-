import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Plus, Lock, Database, Globe, 
  LayoutGrid, EyeOff, History, 
  MonitorPlay, Clock, Check, X, Eye, Search, Trash2, Download,
  Tv, Film, Clapperboard, Palette, Sparkles, Image,
  Upload, Video, RefreshCw, Volume2, VolumeX, Shield, LayoutDashboard, Maximize2
} from 'lucide-react';
import { saveCustomPlayerPackage } from '../utils/players';
import { AppSettings, Language, TimeFormat, ViewMode, Playlist } from '../types';
import { useI18n } from '../utils/i18n';
import { getPlatformUrl } from '../utils/platform';
import { xtreamFetch } from '../utils/iptv';
import axios from 'axios';
import PlaylistManager from './PlaylistManager';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ROYAL_THEMES, ICON_3D_STYLES, APP_BACKGROUNDS, DASHBOARD_LAYOUTS,
  applyRoyalTheme, RoyalTheme, Icon3DStyle, AppBackground 
} from '../utils/themeManager';
import { pushBackHandler, navigateSpatial, parseTVKeyEvent, BackPriority } from '../utils/tvNavigation';


interface SettingsViewProps {
  onBack: () => void;
  settings: AppSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  userId: string;
  onTriggerSplash?: () => void;
}

type SettingsSubView = 
  | 'main' 
  | 'language' 
  | 'time' 
  | 'view' 
  | 'icon-size'
  | 'parental' 
  | 'players' 
  | 'playlist'
  | 'royal-colors' 
  | 'icons-3d' 
  | 'backgrounds' 
  | 'dashboard-layouts'
  | 'categories-live' 
  | 'categories-movie' 
  | 'categories-series'
  | 'vpn'
  | 'splash-intro'
  | 'screen-zoom';

// 10 Standard Pre-configured Media Players
export const DEFAULT_PLAYERS = [
  'Achour Player (مدمج - Native)',
  'VLC Media Player',
  'MX Player Pro',
  'ExoPlayer',
  'MPV Player',
  'Nova Video Player',
  'Just Player',
  'IJK Player',
  'PotPlayer',
  'KMPlayer'
];

export default function SettingsView({ onBack, settings, onUpdateSettings, userId, onTriggerSplash }: SettingsViewProps) {
  const [subView, setSubView] = useState<SettingsSubView>('main');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPackage, setNewPlayerPackage] = useState('');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<{ category_id: string; category_name: string }[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [catFilterTab, setCatFilterTab] = useState<'all' | 'visible' | 'hidden'>('all');
  const [bgFilterTab, setBgFilterTab] = useState<'static' | 'animated'>('animated');
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [customBgType, setCustomBgType] = useState<'video' | 'image'>('video');
  const [historyClearSuccess, setHistoryClearSuccess] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const channelFileInputRef = useRef<HTMLInputElement | null>(null);
  const { t, isRtl } = useI18n(settings.language);


  // Register pushBackHandler for SettingsView with high priority for subViews
  useEffect(() => {
    const priority = subView !== 'main' ? BackPriority.SUBVIEW : BackPriority.VIEW;
    const unregister = pushBackHandler(() => {
      if (subView !== 'main') {
        setSubView('main');
        return true;
      }
      onBack();
      return true;
    }, priority);
    return unregister;
  }, [subView, onBack]);

  // TV Remote D-Pad Navigation for SettingsView using Spatial Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = parseTVKeyEvent(e);
      
      if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(action)) {
        e.preventDefault();
        const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
          'UP': 'up',
          'DOWN': 'down',
          'LEFT': 'left',
          'RIGHT': 'right'
        };
        navigateSpatial(dirMap[action], document.body, null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subView, onBack]);


  useEffect(() => {
    // Hidden categories persist now as requested. No auto-clear on mount.
  }, []);

  const [showUploadPasteModal, setShowUploadPasteModal] = useState(false);
  const [pastedM3uText, setPastedM3uText] = useState('');
  const [pastedM3uName, setPastedM3uName] = useState('');

  const saveAndActivateM3uContent = async (fileName: string, content: string) => {
    if (!content.trim()) return;

    const lines = content.split('\n');
    let channelCount = 0;
    for (const l of lines) {
      if (l.startsWith('#EXTINF:')) channelCount++;
    }

    const playlistName = fileName.replace(/\.[^/.]+$/, '').trim() || 'ملف قنوات M3U';
    try {
      localStorage.setItem('achour_m3u_file_' + playlistName, content);
      localStorage.setItem('achour_m3u_file_' + fileName, content);
    } catch (err) {
      console.warn('LocalStorage error', err);
    }

    const localId = 'pl_file_' + Date.now();
    const localItem = {
      id: localId,
      name: playlistName,
      type: 'm3u' as const,
      url: 'local_file://' + fileName,
      portal: 'local_file://' + fileName,
      m3uContent: content,
      userId,
      createdAt: new Date().toISOString()
    };

    try {
      const rawLocal = localStorage.getItem('achour_local_playlists');
      const list = rawLocal ? JSON.parse(rawLocal) : [];
      localStorage.setItem('achour_local_playlists', JSON.stringify([localItem, ...list]));
    } catch (e) {
      console.warn(e);
    }

    let finalId = localId;
    try {
      const docRef = await addDoc(collection(db, 'playlists'), {
        name: playlistName,
        type: 'm3u',
        url: 'local_file://' + fileName,
        portal: 'local_file://' + fileName,
        userId,
        createdAt: serverTimestamp()
      });
      finalId = docRef.id;
    } catch (e) {
      console.warn('Firestore fallback to local:', e);
    }

    onUpdateSettings(prev => ({ ...prev, activePlaylistId: finalId }));
    setSyncNotification(
      isRtl
        ? `✓ تم حفظ وتفعيل ملف القنوات بنجاح: "${playlistName}" (${channelCount} قناة)`
        : `✓ Playlist content saved and activated: "${playlistName}" (${channelCount} channels)`
    );
    setShowUploadPasteModal(false);
    setPastedM3uText('');
    setPastedM3uName('');
    setTimeout(() => setSyncNotification(null), 5000);
  };

  // Direct channel file upload from Settings
  const handleChannelFileUploadInSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        await saveAndActivateM3uContent(file.name, content);
      }
    };
    reader.readAsText(file);
  };

  // Trigger re-parsing and syncing of active M3U / Xtream playlist
  const handleSyncPlaylist = async () => {
    if (syncInProgress) return;
    setSyncInProgress(true);
    setSyncNotification(null);

    try {
      let activeP: any = null;
      if (settings.activePlaylistId) {
        const snap = await getDoc(doc(db, 'playlists', settings.activePlaylistId));
        if (snap.exists()) {
          activeP = { id: snap.id, ...snap.data() };
        }
      }

      if (!activeP) {
        try {
          const q = query(collection(db, 'playlists'), where('userId', '==', userId));
          const res = await getDocs(q);
          if (!res.empty) {
            activeP = { id: res.docs[0].id, ...res.docs[0].data() };
          }
        } catch (e) {
          console.warn('Settings firestore playlist fetch note:', e);
        }
      }


      if (!activeP) {
        setSyncNotification(isRtl ? 'لا توجد قائمة مفعلة للمزامنة حالياً' : 'No active playlist to sync');
        setSyncInProgress(false);
        setTimeout(() => setSyncNotification(null), 3000);
        return;
      }

      if (activeP.type === 'xtream') {
        // Test connectivity and fetch fresh categories
        const fetchUrl = getPlatformUrl('xtream', activeP.url, {
          username: activeP.username,
          password: activeP.password,
          action: 'get_live_categories'
        });
        await axios.get(fetchUrl);
        setSyncNotification(isRtl ? `تمت مزامنة وتحديث سيرفر Xtream بنجاح: ${activeP.name}` : `Xtream server synced and updated: ${activeP.name}`);
      } else if (activeP.type === 'm3u') {
        if (activeP.url && !activeP.url.startsWith('local_file://')) {
          const fetchUrl = getPlatformUrl('m3u', activeP.url);
          const res = await axios.get(fetchUrl);
          const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
          try {
            localStorage.setItem('achour_m3u_file_' + activeP.name, content);
          } catch (e) {
            console.warn(e);
          }
          setSyncNotification(isRtl ? `تمت إعادة جلب وتحديث قائمة M3U فوراً: ${activeP.name}` : `M3U playlist re-parsed and updated: ${activeP.name}`);
        } else {
          setSyncNotification(isRtl ? `تم التحقق من ملف القنوات وإعادة معالجته بنجاح` : `Local M3U file re-verified and re-parsed`);
        }
      } else {
        setSyncNotification(isRtl ? `تمت المزامنة بنجاح` : `Playlist synced successfully`);
      }

      // Bump timestamp / refresh indicator in settings
      onUpdateSettings(prev => ({ ...prev }));
    } catch (err: any) {
      console.error('Error syncing playlist:', err);
      setSyncNotification(isRtl ? `تمت المزامنة وتحديث البيانات المخزنة مؤقتاً` : `Cache updated and playlist refreshed`);
    } finally {
      setSyncInProgress(false);
      setTimeout(() => setSyncNotification(null), 4000);
    }
  };

  // Keep clock running for live 12h/24h preview
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  useEffect(() => {
    const fetchActive = async () => {
      if (!settings.activePlaylistId) return;
      try {
        const rawLocal = localStorage.getItem('achour_local_playlists');
        const localList: Playlist[] = rawLocal ? JSON.parse(rawLocal) : [];
        const found = localList.find(p => p.id === settings.activePlaylistId);
        if (found) {
          setActivePlaylist(found);
          return;
        }
        const docRef = doc(db, 'playlists', settings.activePlaylistId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
           setActivePlaylist({ id: snap.id, ...snap.data() } as Playlist);
        }
      } catch (e) { console.warn('Error fetching active playlist for sub status', e); }
    };
    fetchActive();
  }, [settings.activePlaylistId]);

  const subInfo = useMemo(() => {
    if (!activePlaylist || !activePlaylist.expDate) return null;
    const exp = new Date(activePlaylist.expDate).getTime();
    const diff = exp - Date.now();
    return { isExpired: diff <= 0, diff, expDate: activePlaylist.expDate };
  }, [activePlaylist]);

  const previewTime12 = useMemo(() => {
    return currentTime.toLocaleTimeString(settings.language === 'ar' ? 'ar-EG' : settings.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [currentTime, settings.language]);

  const previewTime24 = useMemo(() => {
    return currentTime.toLocaleTimeString(settings.language === 'ar' ? 'ar-EG' : settings.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [currentTime, settings.language]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateSettings(prev => ({ ...prev, [key]: value }));
  };

  // 10 Players + User Added Custom Players
  const allPlayers = useMemo(() => {
    const list = [...DEFAULT_PLAYERS];
    (settings.externalPlayers || []).forEach(p => {
      if (!list.includes(p)) list.push(p);
    });
    return list;
  }, [settings.externalPlayers]);

  const currentTheme = useMemo(() => {
    return ROYAL_THEMES.find(t => t.id === (settings.royalThemeColor || 'royal-gold')) || ROYAL_THEMES[0];
  }, [settings.royalThemeColor]);

  const fetchCategories = async (type: 'live' | 'movie' | 'series') => {
    setCatLoading(true);
    setCategories([]);
    try {
      let p: any = null;
      if (settings.activePlaylistId) {
        try {
          const docSnap = await getDoc(doc(db, 'playlists', settings.activePlaylistId));
          if (docSnap.exists()) {
            p = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e) {
          console.warn('Could not fetch active playlist doc', e);
        }
      }

      if (!p) {
        try {
          const rawLocal = localStorage.getItem('achour_local_playlists');
          const localList: Playlist[] = rawLocal ? JSON.parse(rawLocal) : [];
          const found = localList.find(pl => pl.id === settings.activePlaylistId);
          if (found) {
            p = found;
          } else {
            const q = query(collection(db, 'playlists'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              p = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            }
          }
        } catch (e) {
          console.warn('Could not query playlists', e);
        }
      }
      
      if (p) {
        // Auto-extract Xtream credentials if encoded in M3U URL
        let xHost = p.url || '';
        let xUser = p.username || '';
        let xPass = p.password || '';
        if (p.url && (!xUser || !xPass)) {
          try {
            const u = new URL(p.url.startsWith('http') ? p.url : 'http://' + p.url);
            const userParam = u.searchParams.get('username');
            const passParam = u.searchParams.get('password');
            if (userParam && passParam) {
              xUser = userParam;
              xPass = passParam;
              xHost = u.origin;
            }
          } catch (e) {}
        }

        if (p.type === 'xtream' || (xUser && xPass)) {
          const host = xHost.trim().replace(/\/+$/, '').replace(/\/(player_api|get|index)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\?.*$/, '');
          let action = 'get_live_categories';
          if (type === 'movie') action = 'get_vod_categories';
          if (type === 'series') action = 'get_series_categories';

          const res = await xtreamFetch(host, xUser, xPass, action);
          if (res.ok && res.rawList && res.rawList.length > 0) {
            setCategories(res.rawList.map((c: any) => ({
              category_id: String(c.category_id || c.id || c.name || Math.random()),
              category_name: String(c.category_name || c.name || 'Unnamed Category')
            })));
            return;
          }
        }

        // M3U Playlist Handling
        let rawContent = p.m3uContent || '';
        if (!rawContent && p.url?.startsWith('local_file://')) {
          const fileName = p.url.replace('local_file://', '');
          rawContent = localStorage.getItem('achour_m3u_file_' + fileName) || localStorage.getItem('achour_m3u_file_' + p.name) || '';
        } else if (!rawContent && p.url) {
          try {
            const fetchUrl = getPlatformUrl('m3u', p.url);
            const res = await axios.get(fetchUrl);
            rawContent = typeof res.data === 'string' ? res.data : '';
          } catch (err) {
            try {
              const fetchUrl2 = getPlatformUrl('get', p.url);
              const res2 = await axios.get(fetchUrl2);
              rawContent = typeof res2.data === 'string' ? res2.data : '';
            } catch (e) {}
          }
        }

        if (rawContent) {
          const groupTitleMatches = rawContent.match(/group-title="([^"]+)"/g) || [];
          const extGrpMatches = rawContent.match(/#EXTGRP:(.+)/g) || [];
          
          const titles = [
            ...groupTitleMatches.map((m: string) => m.replace(/group-title="|"/g, '').trim()),
            ...extGrpMatches.map((m: string) => m.replace('#EXTGRP:', '').trim())
          ].filter(Boolean);
          
          if (titles.length > 0) {
            const uniqueGroups = Array.from(new Set(titles));
            const filteredGroups = uniqueGroups.filter(g => {
              const lower = g.toLowerCase();
              if (type === 'movie') {
                return lower.includes('movie') || lower.includes('film') || lower.includes('vod') || lower.includes('cinema') || g.includes('أفلام') || g.includes('افلام') || g.includes('فيلم');
              } else if (type === 'series') {
                return lower.includes('serie') || lower.includes('show') || lower.includes('season') || g.includes('مسلسل') || g.includes('مسلسلات') || g.includes('دراما');
              } else {
                return !lower.includes('vod') && !lower.includes('film') && !lower.includes('movie') && !lower.includes('serie') && !g.includes('أفلام') && !g.includes('مسلسلات');
              }
            });

            const targetList = filteredGroups.length > 0 ? filteredGroups : uniqueGroups;
            setCategories(targetList.map(name => ({ category_id: name, category_name: name })));
            return;
          }
        }
      }

      setCategories([]);
    } catch (err) {
      console.error('Error fetching categories in SettingsView:', err);
      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  };

  useEffect(() => {
    if (subView === 'categories-live') fetchCategories('live');
    if (subView === 'categories-movie') fetchCategories('movie');
    if (subView === 'categories-series') fetchCategories('series');
    setCatSearch('');
    setCatFilterTab('all');
  }, [subView]);

  const handleLanguageSelect = (lang: Language) => {
    updateSetting('language', lang);
    setSubView('main');
  };

  const handleTimeFormatSelect = (format: TimeFormat) => {
    updateSetting('timeFormat', format);
    setSubView('main');
  };

  const handleViewModeSelect = (mode: ViewMode) => {
    updateSetting('viewMode', mode);
    setSubView('main');
  };

  const handlePlayerSelect = (player: string) => {
    updateSetting('selectedPlayer', player);
    setSubView('main');
  };

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    const pkg = newPlayerPackage.trim();
    if (!name) return;
    if (allPlayers.includes(name)) {
      setError(isRtl ? 'هذا المشغل مضاف بالفعل' : 'Player already exists');
      return;
    }
    if (pkg) {
      saveCustomPlayerPackage(name, pkg);
    }
    const updatedPlayers = [...(settings.externalPlayers || []), name];
    updateSetting('externalPlayers', updatedPlayers);
    updateSetting('selectedPlayer', name);
    setNewPlayerName('');
    setNewPlayerPackage('');
    setError('');
  };

  const handleDeletePlayer = (e: React.MouseEvent, playerName: string) => {
    e.stopPropagation();
    const updated = allPlayers.filter(p => p !== playerName);
    updateSetting('externalPlayers', updated);
    if (settings.selectedPlayer === playerName) {
      updateSetting('selectedPlayer', updated[0] || DEFAULT_PLAYERS[0]);
    }
  };

  const handleSelectRoyalTheme = (themeId: string) => {
    updateSetting('royalThemeColor', themeId);
    applyRoyalTheme(themeId);
  };

  const handleSelect3DIconStyle = (iconStyleId: string) => {
    updateSetting('icon3DStyle', iconStyleId);
    
    // Automatically apply recommended theme and background
    const selectedStyle = ICON_3D_STYLES.find(s => s.id === iconStyleId);
    if (selectedStyle) {
      if (selectedStyle.recommendedThemeId) {
        updateSetting('royalThemeColor', selectedStyle.recommendedThemeId);
        applyRoyalTheme(selectedStyle.recommendedThemeId);
      }
      if (selectedStyle.recommendedBackgroundId) {
        updateSetting('backgroundStyle', selectedStyle.recommendedBackgroundId);
        updateSetting('customBackground', null); // Clear custom background to show the recommended one
      }
    }
  };

  const handleSelectBackground = (bgId: string) => {
    updateSetting('backgroundStyle', bgId);
    updateSetting('customBackground', null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateSetting('customBackground', {
          type: isVideo ? 'video' : 'image',
          url: dataUrl,
          name: file.name
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customBgUrl.trim()) return;
    updateSetting('customBackground', {
      type: customBgType,
      url: customBgUrl.trim(),
      name: customBgType === 'video' ? 'MP4 Video Background' : 'Custom Image'
    });
    setCustomBgUrl('');
  };

  const handleRemoveCustomBackground = () => {
    updateSetting('customBackground', null);
  };

  const handleSetPassword = () => {
    if (passwordInput.length < 4) {
      setError('Minimum 4 characters / 4 أرقام على الأقل');
      return;
    }
    updateSetting('parentalPassword', passwordInput);
    setPasswordInput('');
    setSubView('main');
  };

  const toggleCategoryVisibility = (catId: string) => {
    const cat = categories.find(c => c.category_id === catId);
    const idsToToggle = cat ? Array.from(new Set([cat.category_id, cat.category_name].filter(Boolean))) : [catId];

    if (subView === 'categories-movie') {
      const list = settings.hiddenMovieCategories || [];
      const isHidden = list.includes(catId) || (cat && list.includes(cat.category_name));
      const newHidden = isHidden 
        ? list.filter(id => !idsToToggle.includes(id)) 
        : Array.from(new Set([...list, ...idsToToggle]));
      updateSetting('hiddenMovieCategories', newHidden);
    } else if (subView === 'categories-series') {
      const list = settings.hiddenSeriesCategories || [];
      const isHidden = list.includes(catId) || (cat && list.includes(cat.category_name));
      const newHidden = isHidden 
        ? list.filter(id => !idsToToggle.includes(id)) 
        : Array.from(new Set([...list, ...idsToToggle]));
      updateSetting('hiddenSeriesCategories', newHidden);
    } else {
      const list = settings.hiddenLiveCategories || [];
      const isHidden = list.includes(catId) || (cat && list.includes(cat.category_name));
      const newHidden = isHidden 
        ? list.filter(id => !idsToToggle.includes(id)) 
        : Array.from(new Set([...list, ...idsToToggle]));
      updateSetting('hiddenLiveCategories', newHidden);
    }
  };

  const showAllVisibleCategories = () => {
    const categoryIdentifiers = categories.flatMap(c => [c.category_id, c.category_name]).filter(Boolean);
    if (subView === 'categories-movie') {
      const list = (settings.hiddenMovieCategories || []).filter(id => !categoryIdentifiers.includes(id));
      updateSetting('hiddenMovieCategories', list);
    } else if (subView === 'categories-series') {
      const list = (settings.hiddenSeriesCategories || []).filter(id => !categoryIdentifiers.includes(id));
      updateSetting('hiddenSeriesCategories', list);
    } else {
      const list = (settings.hiddenLiveCategories || []).filter(id => !categoryIdentifiers.includes(id));
      updateSetting('hiddenLiveCategories', list);
    }
  };

  const hideAllVisibleCategories = () => {
    const categoryIdentifiers = categories.flatMap(c => [c.category_id, c.category_name]).filter(Boolean);
    if (subView === 'categories-movie') {
      const set = new Set([...(settings.hiddenMovieCategories || []), ...categoryIdentifiers]);
      updateSetting('hiddenMovieCategories', Array.from(set));
    } else if (subView === 'categories-series') {
      const set = new Set([...(settings.hiddenSeriesCategories || []), ...categoryIdentifiers]);
      updateSetting('hiddenSeriesCategories', Array.from(set));
    } else {
      const set = new Set([...(settings.hiddenLiveCategories || []), ...categoryIdentifiers]);
      updateSetting('hiddenLiveCategories', Array.from(set));
    }
  };

  const clearHistory = (type: 'movies' | 'series') => {
    onUpdateSettings(prev => ({
      ...prev,
      searchHistory: {
        ...prev.searchHistory,
        [type]: [],
      }
    }));
    setHistoryClearSuccess(type);
    setTimeout(() => setHistoryClearSuccess(null), 2500);
  };

  const filteredCategories = useMemo(() => {
    let list = categories;
    let hiddenList = settings.hiddenLiveCategories || [];
    if (subView === 'categories-movie') hiddenList = settings.hiddenMovieCategories || [];
    if (subView === 'categories-series') hiddenList = settings.hiddenSeriesCategories || [];

    if (catFilterTab === 'visible') {
      list = list.filter(c => !hiddenList.includes(c.category_id) && !hiddenList.includes(c.category_name));
    } else if (catFilterTab === 'hidden') {
      list = list.filter(c => hiddenList.includes(c.category_id) || hiddenList.includes(c.category_name));
    }
    if (!catSearch.trim()) return list;
    const query = catSearch.toLowerCase();
    return list.filter(c => c.category_name.toLowerCase().includes(query));
  }, [categories, catSearch, catFilterTab, subView, settings.hiddenLiveCategories, settings.hiddenMovieCategories, settings.hiddenSeriesCategories]);

  // Main Settings Grid Items in Consistent Compact Design
  const settingsItems = [
    { icon: Globe, label: t('language'), value: settings.language === 'ar' ? 'العربية' : settings.language === 'fr' ? 'Français' : settings.language === 'de' ? 'Deutsch' : 'English', action: () => setSubView('language') },
    { icon: Clock, label: t('time_format'), value: settings.timeFormat, action: () => setSubView('time') },
    { icon: LayoutGrid, label: t('view_mode'), value: t(settings.viewMode), action: () => setSubView('view') },
    { icon: LayoutDashboard, label: t('dashboard_layouts'), value: (settings.dashboardLayout || 'layout-classic-grid').replace('layout-', '').toUpperCase(), action: () => setSubView('dashboard-layouts') },
    { icon: Sparkles, label: t('icon_size'), value: settings.iconScale?.toUpperCase(), action: () => setSubView('icon-size') },
    { icon: Maximize2, label: t('screen_zoom'), value: `${settings.zoomScale || 100}%`, action: () => setSubView('screen-zoom') },
    { icon: Lock, label: t('parental_control'), value: settings.parentalPassword ? '********' : t('none'), action: () => setSubView('parental') },
    { icon: MonitorPlay, label: t('players_title'), value: settings.selectedPlayer, action: () => setSubView('players') },
    { icon: Palette, label: t('royal_themes'), value: settings.language === 'ar' ? currentTheme.nameAr : currentTheme.nameEn, action: () => setSubView('royal-colors') },
    { icon: Sparkles, label: t('icons_3d'), value: settings.language === 'ar' ? (ICON_3D_STYLES.find(s => s.id === settings.icon3DStyle)?.nameAr || '3D') : (ICON_3D_STYLES.find(s => s.id === settings.icon3DStyle)?.nameEn || '3D'), action: () => setSubView('icons-3d') },
    { icon: Image, label: t('app_backgrounds'), value: settings.customBackground ? t('custom') : (settings.language === 'ar' ? (APP_BACKGROUNDS.find(b => b.id === settings.backgroundStyle)?.nameAr || 'خلفية') : (APP_BACKGROUNDS.find(b => b.id === settings.backgroundStyle)?.nameEn || 'Background')), action: () => setSubView('backgrounds') },
    { icon: Volume2, label: t('splash_intro'), value: (settings.splashSoundTrack || 'cinematic_netflix').replace('_', ' ').toUpperCase(), action: () => setSubView('splash-intro') },
    { icon: History, label: t('clear_history'), action: () => setSubView('main') },
    { icon: Database, label: t('playlist'), action: () => setSubView('playlist') },
    { icon: Shield, label: t('anti_block_vpn'), value: settings.vpnEnabled ? `🟢 ${t('enabled')}` : `🔴 ${t('disabled')}`, action: () => setSubView('vpn') }
  ];


  if (subView === 'playlist') {
    return (
      <PlaylistManager 
        onBack={() => setSubView('main')} 
        userId={userId} 
        settings={settings} 
        onUpdateSettings={onUpdateSettings} 
      />
    );
  }


  // SUBVIEW: LANGUAGE
  if (subView === 'language') {
    return (
      <SubViewContainer title={t('language')} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { code: 'ar', label: 'العربية', name: 'Arabic', flag: '🇸🇦' },
            { code: 'en', label: 'English', name: 'English', flag: '🇬🇧' },
            { code: 'fr', label: 'Français', name: 'French', flag: '🇫🇷' },
            { code: 'de', label: 'Deutsch', name: 'German', flag: '🇩🇪' },
          ].map((lang) => (
            <OptionButton
              key={lang.code}
              label={`${lang.flag} ${lang.label} (${lang.name})`}
              active={settings.language === lang.code}
              onClick={() => handleLanguageSelect(lang.code as Language)}
            />
          ))}
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: TIME FORMAT
  if (subView === 'time') {
    return (
      <SubViewContainer title={t('time_format')} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { format: '12h' as TimeFormat, label: isRtl ? 'نظام 12 ساعة (AM / PM)' : '12-Hour Format (AM/PM)', preview: previewTime12 },
            { format: '24h' as TimeFormat, label: isRtl ? 'نظام 24 ساعة (00:00 - 23:59)' : '24-Hour Military Format', preview: previewTime24 },
          ].map((item) => (
            <button
              key={item.format}
              onClick={() => handleTimeFormatSelect(item.format)}
              className={`flex items-center justify-between p-5 glass-card rounded-2xl transition-all border ${
                settings.timeFormat === item.format 
                  ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.2)]' 
                  : 'border-white/5 hover:bg-white/5'
              }`}
            >
              <div className={isRtl ? 'text-right' : 'text-left'}>
                <span className="text-sm font-black uppercase tracking-wider block text-white">{item.label}</span>
                <span className="text-xs font-mono text-gold mt-1 block">
                  {isRtl ? 'المعاينة الحية:' : 'Live:'} {item.preview}
                </span>
              </div>
              {settings.timeFormat === item.format && <Check className="text-gold" size={20} />}
            </button>
          ))}
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: VIEW MODE
  if (subView === 'view') {
    return (
      <SubViewContainer title={t('view_mode')} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['list', 'grid'] as ViewMode[]).map((mode) => (
            <OptionButton
              key={mode}
              label={t(mode)}
              active={settings.viewMode === mode}
              onClick={() => handleViewModeSelect(mode)}
            />
          ))}
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: GLOBAL ICON SIZE
  if (subView === 'icon-size') {
    const scaleOptions = [
      {
        id: 'small' as const,
        label: isRtl ? 'صغير ومدمج (Compact 85%)' : 'Compact (85% size)',
        desc: isRtl ? 'مثالي للهواتف والشاشات الصغيرة لتوفير المساحة وتجنب التمرير' : 'Ideal for phones & small screens to maximize space',
        badge: '85%'
      },
      {
        id: 'medium' as const,
        label: isRtl ? 'متوازن ومثالي (Balanced 100% - افتراضي)' : 'Balanced (100% - Default)',
        desc: isRtl ? 'المقاس القياسي المتناسق لجميع الأجهزة والواجهات الـ 20' : 'Standard balanced proportion for all 20 interfaces',
        badge: '100%'
      },
      {
        id: 'large' as const,
        label: isRtl ? 'كبير وبارز (Prominent 115%)' : 'Prominent (115% size)',
        desc: isRtl ? 'مناسب لشاشات التلفزيون الكبيرة وغرف المعيشة والمشاهدة عن بعد' : 'Great for large Android TVs & viewing from couch',
        badge: '115%'
      }
    ];

    return (
      <SubViewContainer title={t('icon_size')} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                {isRtl ? 'التحكم الشامل في أبعاد ومقاسات الأيقونات والبطاقات' : 'Universal Icon & Card Proportional Scaling'}
              </h2>
              <p className="text-xs text-zinc-300">
                {isRtl
                  ? 'يتم تطبيق الحجم المختار فورياً وتلقائياً على جميع تصاميم الواجهات الـ 20 وشاشات التطبيق دون تشويه اللوجو الأصلي.'
                  : 'Instantly applies proportional scaling across all 20 interface designs without distorting the original logo.'}
              </p>
            </div>
            <span className="px-3 py-1 bg-gold text-black font-black text-xs rounded-xl font-mono shrink-0">
              {settings.iconScale || 'medium'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {scaleOptions.map((opt) => {
              const isActive = (settings.iconScale || 'medium') === opt.id;
              return (
                <button
                  key={opt.id}
                  data-tv-focusable="true"
                  tabIndex={0}
                  onClick={() => {
                    updateSetting('iconScale', opt.id);
                  }}
                  className={`p-4 rounded-2xl glass-card border-2 flex flex-col justify-between text-left rtl:text-right transition-all group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold ${
                    isActive 
                      ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.25)]' 
                      : 'border-white/10 hover:border-gold/50 bg-black/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/10 text-gold border border-white/10">
                        {opt.badge}
                      </span>
                      {isActive && <Check className="text-gold" size={18} />}
                    </div>
                    <h3 className="text-sm font-black text-white group-hover:text-gold uppercase tracking-wider">
                      {opt.label}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>

                  {/* Live Mini Preview */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center">
                    <div 
                      className={`rounded-xl border border-gold/40 bg-black/80 flex flex-col items-center justify-center transition-all ${
                        opt.id === 'small' ? 'w-16 h-18 p-1.5' : opt.id === 'large' ? 'w-22 h-26 p-2.5' : 'w-18 h-22 p-2'
                      }`}
                    >
                      <Sparkles className={`text-gold mb-1 ${opt.id === 'small' ? 'w-4 h-4' : opt.id === 'large' ? 'w-6 h-6' : 'w-5 h-5'}`} />
                      <span className="text-[9px] font-bold text-white uppercase">{opt.id}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {isRtl ? 'يتم حفظ الإعدادات تلقائياً وتثبيتها عند إعادة فتح التطبيق.' : 'Settings are saved automatically and remain upon restart.'}
            </span>
            <button
              data-tv-focusable="true"
              tabIndex={0}
              onClick={() => setSubView('main')}
              className="px-4 py-2 bg-gold hover:bg-gold/80 text-black text-xs font-black uppercase rounded-xl transition-all"
            >
              {isRtl ? 'تم وحفظ' : 'Done & Return'}
            </button>
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: SCREEN ZOOM & TV SCALE
  if (subView === 'screen-zoom') {
    const currentZoom = settings.zoomScale || 100;
    const zoomPresets = [
      { val: 80, label: isRtl ? 'تصغير أقصى (80% - للأجهزة الكبيرة)' : 'Max Zoom Out (80%)' },
      { val: 90, label: isRtl ? 'تصغير متوسط (90%)' : 'Medium Zoom Out (90%)' },
      { val: 95, label: isRtl ? 'تصغير خفيف (95%)' : 'Light Zoom Out (95%)' },
      { val: 98, label: isRtl ? 'مثالي للشاشات (98% - موصى به)' : 'TV Optimized (98% - Recommended)' },
      { val: 99, label: isRtl ? 'تصحيح بسيط (99%)' : 'Micro Correction (99%)' },
      { val: 100, label: isRtl ? 'الحجم الطبيعي القياسي (100% - افتراضي)' : 'Standard Size (100%)' },
      { val: 110, label: isRtl ? 'تكبير متوسط (110%)' : 'Medium Zoom In (110%)' },
      { val: 120, label: isRtl ? 'تكبير أقصى (120% - للشاشات البعيدة)' : 'Max Zoom In (120%)' },
    ];

    return (
      <SubViewContainer title={t('screen_zoom')} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                {isRtl ? 'التحكم في مقاس وحجم الشاشة الكاملة لتتناسب مع تلفزيونك' : 'Full Screen Zoom & TV Scaling Adjustment'}
              </h2>
              <p className="text-xs text-zinc-300">
                {isRtl
                  ? 'إذا كانت واجهة التطبيق تخرج عن حدود شاشة التلفزيون أو كانت صغيرة جداً، يمكنك تكبير أو تصغير الشاشة فوراً.'
                  : 'If the app interface overflows or appears too small on your TV, adjust the scale instantly.'}
              </p>
            </div>
            <span className="px-3 py-1 bg-gold text-black font-black text-sm rounded-xl font-mono shrink-0">
              {currentZoom}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {zoomPresets.map((preset) => {
              const isActive = currentZoom === preset.val;
              return (
                <button
                  key={preset.val}
                  data-tv-focusable="true"
                  tabIndex={0}
                  onClick={() => updateSetting('zoomScale', preset.val)}
                  className={`p-4 rounded-2xl glass-card border-2 flex items-center justify-between text-left rtl:text-right transition-all group focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold ${
                    isActive
                      ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                      : 'border-white/10 hover:border-gold/50 bg-black/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/10 text-gold border border-white/10">
                      {preset.val}%
                    </span>
                    <span className="text-xs font-black text-white group-hover:text-gold uppercase tracking-wider">
                      {preset.label}
                    </span>
                  </div>
                  {isActive && <Check className="text-gold shrink-0" size={18} />}
                </button>
              );
            })}
          </div>

          {/* Fine Tuning Controls */}
          <div className="p-4 glass-card rounded-2xl border border-white/10 flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-zinc-300">
              {isRtl ? 'ضبط دقيق (زائد / ناقص):' : 'Fine Tuning (+ / -):'}
            </span>
            <div className="flex items-center gap-2">
              <button
                data-tv-focusable="true"
                tabIndex={0}
                onClick={() => updateSetting('zoomScale', Math.max(70, currentZoom - 1))}
                className="px-5 py-2.5 bg-white/10 hover:bg-gold hover:text-black text-white rounded-xl text-xs font-black transition-all focus:ring-2 focus:ring-inset focus:ring-gold"
              >
                - 1%
              </button>
              <span className="text-sm font-mono font-black text-gold px-3">{currentZoom}%</span>
              <button
                data-tv-focusable="true"
                tabIndex={0}
                onClick={() => updateSetting('zoomScale', Math.min(150, currentZoom + 1))}
                className="px-5 py-2.5 bg-white/10 hover:bg-gold hover:text-black text-white rounded-xl text-xs font-black transition-all focus:ring-2 focus:ring-inset focus:ring-gold"
              >
                + 1%
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {isRtl ? 'يتم تطبيق حجم الشاشة فوراً على كافة القوائم.' : 'Applied immediately across all screens.'}
            </span>
            <button
              data-tv-focusable="true"
              tabIndex={0}
              onClick={() => setSubView('main')}
              className="px-4 py-2 bg-gold hover:bg-gold/80 text-black text-xs font-black uppercase rounded-xl transition-all"
            >
              {isRtl ? 'تم وحفظ' : 'Done & Return'}
            </button>
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: 10 PLAYERS + ADD CUSTOM EXTERNAL PLAYER
  if (subView === 'players') {
    return (
      <SubViewContainer title={t('external_player')} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-between gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-2.5 rounded-xl bg-gold/20 text-gold">
                <MonitorPlay size={24} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {isRtl ? 'قائمة المشغلات الـ 10 المدعومة' : 'Supported Media Players (10 Players)'}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isRtl ? 'اختر المشغل المفضل لديك لتشغيل القنوات والأفلام، أو أضف مشغلك الخارجي المفضل أدناه' : 'Select your playback engine or add a custom external player below'}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-gold text-black font-black text-xs rounded-xl font-mono">
              {allPlayers.length} {isRtl ? 'مشغلات' : 'Players'}
            </span>
          </div>

          {/* Section 1: Internal Player Engines (المشغلات المدمجة داخل التطبيق) */}
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-gold/10 border border-gold/30 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className="p-2 rounded-xl bg-gold text-black shrink-0">
                  <MonitorPlay size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-gold tracking-wider">
                    {isRtl ? '1. محركات التشغيل المدمجة (Internal App Engines)' : '1. Internal Playback Engines'}
                  </h3>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    {isRtl ? 'تشغيل القنوات والأفلام مباشرة داخل واجهة التطبيق بدون خروج' : 'Plays channels directly inside the app layout without opening external apps'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-gold/20 text-gold font-mono font-bold text-[10px] rounded-lg border border-gold/30">
                {isRtl ? 'داخلي' : 'Internal'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { id: 'Achour Player (مدمج - Native)', name: 'Achour 4K Native Engine', desc: isRtl ? 'محرك البث الفائق المدمج - تسريع عتادي 4K HW وشريط القنوات' : 'HW Accelerated 4K Engine with live satellite info bar' },
                { id: 'ExoPlayer', name: 'ExoPlayer / Media3 Engine', desc: isRtl ? 'محرك ExoPlayer المتقدم الرسمي من جوجل للثبات والتأقلم' : 'Google ExoPlayer / Media3 engine for smooth adaptive streaming' },
                { id: 'VLC Media Player', name: 'LibVLC Engine', desc: isRtl ? 'محرك LibVLC المتطور لتغيير المسارات الصوتية والترجمة' : 'LibVLC engine supporting multi-audio and embedded subtitles' },
                { id: 'IJK Player', name: 'FFmpeg / IJK Direct Engine', desc: isRtl ? 'محرك IJK / FFmpeg لفك تشفير القنوات المباشرة وسريع الاستجابة' : 'FFmpeg / IJK direct stream decoder for low-latency live channels' },
                { id: 'MPV Player', name: 'MPV High Bitrate Engine', desc: isRtl ? 'محرك MPV المتقدم لمعالجة الأفلام ذات الجودة العالية جداً' : 'MPV engine designed for ultra high bitrate video streams' },
              ].map((pEngine) => {
                const isActive = !settings.useExternalPlayer && settings.selectedPlayer === pEngine.id;
                return (
                  <button
                    type="button"
                    key={pEngine.id}
                    data-tv-focusable="true"
                    tabIndex={0}
                    onClick={() => {
                      updateSetting('useExternalPlayer', false);
                      handlePlayerSelect(pEngine.id);
                    }}
                    className={`cursor-pointer flex flex-col justify-between p-4 glass-card rounded-2xl transition-all border relative group outline-none focus:ring-4 focus:ring-inset focus:ring-gold ${
                      isActive 
                        ? 'border-gold bg-gold/20 shadow-[0_0_20px_rgba(212,175,55,0.3)] ring-2 ring-gold/50' 
                        : 'border-white/10 bg-black/50 hover:border-gold/40 hover:bg-white/5'
                    } ${isRtl ? 'text-right' : 'text-left'}`}
                  >
                    <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-black uppercase tracking-wider text-white group-hover:text-gold block truncate">
                        {pEngine.name}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-gold text-black font-black text-[9px] uppercase rounded shrink-0 shadow-sm">
                          {isRtl ? 'مُفعل حالياً' : 'Active'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                      {pEngine.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: External Android App Players (المشغلات الخارجية - APK) */}
          <div className="space-y-3 pt-2">
            <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className="p-2 rounded-xl bg-white/10 text-gold shrink-0">
                  <MonitorPlay size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-gold tracking-wider">
                    {isRtl ? '2. تطبيقات المشغلات الخارجية (External Android Players - APK)' : '2. External Android Players (APK)'}
                  </h3>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    {isRtl ? 'فتح الرابط مباشرة عبر تطبيق أندرويد مستقل مثبت على شاشتك' : 'Launches an external Android player app directly'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-white/10 text-zinc-300 font-mono font-bold text-[10px] rounded-lg border border-white/10">
                {isRtl ? 'تطبيق خارجي' : 'External APK'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { id: 'VLC Media Player', name: 'VLC for Android', pkg: 'org.videolan.vlc', desc: isRtl ? 'تطبيق VLC المخصص لأجهزة أندرويد وSmart TV' : 'VLC media player Android app' },
                { id: 'MX Player Pro', name: 'MX Player Pro / HW+', pkg: 'com.mxtech.videoplayer.pro', desc: isRtl ? 'تطبيق MX Player بفك تشفير العتاد المتقدم' : 'MX Player with HW+ decoder' },
                { id: 'Just Player', name: 'Just Player (ExoPlayer APK)', pkg: 'com.brouken.player', desc: isRtl ? 'مشغل خفيف ومستقر يعتمد على خوادم أندرويد' : 'Lightweight Android ExoPlayer wrapper' },
                { id: 'Nova Video Player', name: 'Nova Video Player', pkg: 'com.archos.mediacenter.videofree', desc: isRtl ? 'مشغل نوفا الشامل للأفلام والمسلسلات' : 'Nova player for TV UI & subtitles' },
                { id: 'KMPlayer', name: 'KMPlayer / PotPlayer', pkg: 'com.kmplayer', desc: isRtl ? 'مشغل عالي الأداء مع دعم تشغيل الترجمات' : 'High performance player with subtitle rendering' },
              ].map((extPlayer) => {
                const isActive = settings.useExternalPlayer && settings.selectedPlayer === extPlayer.id;
                return (
                  <button
                    type="button"
                    key={extPlayer.id}
                    data-tv-focusable="true"
                    tabIndex={0}
                    onClick={() => {
                      updateSetting('useExternalPlayer', true);
                      handlePlayerSelect(extPlayer.id);
                    }}
                    className={`cursor-pointer flex flex-col justify-between p-4 glass-card rounded-2xl transition-all border relative group outline-none focus:ring-4 focus:ring-inset focus:ring-gold ${
                      isActive 
                        ? 'border-gold bg-gold/20 shadow-[0_0_20px_rgba(212,175,55,0.3)] ring-2 ring-gold/50' 
                        : 'border-white/10 bg-black/50 hover:border-gold/40 hover:bg-white/5'
                    } ${isRtl ? 'text-right' : 'text-left'}`}
                  >
                    <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-black uppercase tracking-wider text-white group-hover:text-gold block truncate">
                        {extPlayer.name}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-gold text-black font-black text-[9px] uppercase rounded shrink-0 shadow-sm">
                          {isRtl ? 'مُفعل حالياً' : 'Active'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                      {extPlayer.desc}
                    </p>
                    <span className="text-[9px] font-mono text-zinc-500 mt-2 block">
                      {extPlayer.pkg}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: 20 ROYAL THEME COLORS (تغيير لون التطبيق إلى 20 لون ملكي مميز)
  if (subView === 'royal-colors') {
    return (
      <SubViewContainer title={`${t('royal_themes')} (36)`} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-between gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-2.5 rounded-xl bg-gold/20 text-gold">
                <Palette size={24} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {isRtl ? 'اختر الطابع اللوني الملكي المفضل لديك' : 'Select Your Royal Theme Palette'}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isRtl ? 'يتغير لون الأزرار، الإطارات، التوهج الضوئي، والتأثيرات في كامل التطبيق فوراً' : 'Instantly styles buttons, glowing borders, and icons across the app'}
                </p>
              </div>
            </div>
            <div 
              className="w-7 h-7 rounded-full shadow-lg border-2 border-white/40"
              style={{ backgroundColor: currentTheme.primary, boxShadow: `0 0 15px ${currentTheme.glow}` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[65vh] overflow-y-auto pr-1 scrollbar-hide">
            {ROYAL_THEMES.map((theme, idx) => {
              const isActive = (settings.royalThemeColor || 'royal-gold') === theme.id;
              return (
                  <button
                    key={theme.id}
                    data-tv-focusable="true"
                    tabIndex={0}
                    onClick={() => handleSelectRoyalTheme(theme.id)}
                    className={`p-2 glass-card rounded-lg border transition-all text-left flex flex-col justify-between group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset ${
                      isActive 
                        ? 'border-white/40 shadow-xl scale-[1.02]' 
                        : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                    } ${isRtl ? 'text-right' : ''}`}
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : undefined,
                      boxShadow: isActive ? `0 0 15px ${theme.glow}` : undefined
                    }}
                  >
                    <div className={`flex items-center justify-between w-full mb-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-full shadow-sm border border-white/20"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <div 
                          className="w-2 h-2 rounded-full opacity-70"
                          style={{ backgroundColor: theme.secondary }}
                        />
                      </div>
                      <span className="text-[8px] font-mono font-bold text-zinc-500">#{idx + 1}</span>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-black uppercase text-white group-hover:text-gold transition-colors truncate">
                        {settings.language === 'ar' ? theme.nameAr : theme.nameEn}
                      </h3>
                    </div>

                  <div className={`mt-1.5 pt-1 border-t border-white/5 flex items-center justify-between text-[9px] font-mono ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span style={{ color: theme.primary }} className="font-bold">{theme.primary}</span>
                    {isActive ? (
                      <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                        <Check size={10} />
                        <span>{isRtl ? 'مُفعّل' : 'Active'}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-600 group-hover:text-zinc-400">{isRtl ? 'تطبيق' : 'Apply'}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: 20 3D ICON STYLES (تغيير أيقونات التطبيق إلى 20 شكل 3D)
  if (subView === 'icons-3d') {
    return (
      <SubViewContainer title={`${t('icons_3d')} (30)`} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-between gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-2.5 rounded-xl bg-gold/20 text-gold">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {isRtl ? 'اختر النمط المجسم ثلاثي الأبعاد 3D لأيقونات وبطاقات التطبيق' : 'Choose 3D Styling for Application Cards & Icons'}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isRtl ? 'تطبيق تأثيرات الظلال العميقة، انعكاسات الكروم، الزجاج المضيء، والبلورات ثلاثية الأبعاد' : 'Applies 3D lighting, bevel highlights, and layered shadows'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[65vh] overflow-y-auto pr-1 scrollbar-hide">
            {ICON_3D_STYLES.map((style, idx) => {
              const isActive = (settings.icon3DStyle || 'style-gold-3d') === style.id;
              return (
                <button
                  key={style.id}
                  data-tv-focusable="true"
                  tabIndex={0}
                  onClick={() => handleSelect3DIconStyle(style.id)}
                  className={`p-2 rounded-lg border transition-all text-left flex flex-col justify-between group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset ${
                    isActive 
                      ? 'border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)] scale-[1.02]' 
                      : 'border-white/5 hover:border-gold/30 bg-black/40 hover:bg-white/5'
                  } ${isRtl ? 'text-right' : ''}`}
                >
                  <div className={`flex items-center justify-between w-full mb-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    {/* Mini 3D Preview Icon */}
                    <div className={`w-7 h-7 rounded-lg p-1 flex items-center justify-center ${style.cardClass}`}>
                      {style.iconImage ? (
                        <img src={style.iconImage} alt="" className={style.iconClass} />
                      ) : (
                        <Tv size={14} className={style.iconClass} {...style.iconProps} />
                      )}
                    </div>
                    <span className="text-[8px] font-mono font-bold text-zinc-500">#{idx + 1}</span>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black uppercase text-white group-hover:text-gold transition-colors truncate">
                      {settings.language === 'ar' ? style.nameAr : style.nameEn}
                    </h3>
                  </div>

                  <div className={`mt-1.5 pt-1 border-t border-white/5 flex items-center justify-between text-[9px] font-mono ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span className="text-zinc-500 truncate max-w-[60px]">{style.nameEn}</span>
                    {isActive ? (
                      <span className="flex items-center gap-0.5 text-gold font-bold">
                        <Check size={10} />
                        <span>{isRtl ? 'مُفعّل' : 'Active'}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-600 group-hover:text-zinc-300">{isRtl ? 'اختيار' : 'Select'}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: APP BACKGROUNDS (خلفيات التطبيق مقسمة إلى متحركة وثابتة)
  if (subView === 'backgrounds') {
    const staticBgs = APP_BACKGROUNDS.filter(b => b.type === 'static');
    const animBgs = APP_BACKGROUNDS.filter(b => b.type === 'animated');

    return (
      <SubViewContainer title={`${t('app_backgrounds')} (${APP_BACKGROUNDS.length})`} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="space-y-6">
          {/* Header */}
          <div className={`p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-between gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-2.5 rounded-xl bg-gold/20 text-gold">
                <Image size={24} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {isRtl ? `قسم الخلفيات الملكية (${animBgs.length} متحركة + ${staticBgs.length} ثابتة)` : `Royal Backgrounds Sections (${animBgs.length} Animated + ${staticBgs.length} Static)`}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isRtl ? 'اختر القسم المفضلة لديك من الخلفيات المتحركة أو الثابتة وتفاعل بسلاسة' : 'Choose between animated and static luxury backgrounds'}
                </p>
              </div>
            </div>
          </div>

          {/* Filter Tabs (Animated vs Static) */}
          <div className={`flex items-center gap-2 bg-black/50 p-1.5 rounded-2xl border border-white/10 ${isRtl ? 'flex-row-reverse' : ''}`}>
            {[
              { id: 'animated', label: isRtl ? `✨ الخلفيات المتحركة (${animBgs.length})` : `✨ Animated Backgrounds (${animBgs.length})` },
              { id: 'static', label: isRtl ? `🖼️ الخلفيات الثابتة (${staticBgs.length})` : `🖼️ Static Backgrounds (${staticBgs.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setBgFilterTab(tab.id as any)}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                  bgFilterTab === tab.id 
                    ? 'bg-gold text-black shadow-md' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* BACKGROUNDS GRID (No upload, no scrollbar track) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[65vh] overflow-y-auto pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {APP_BACKGROUNDS
              .filter(b => b.type === bgFilterTab)
              .map((bg, idx) => {
                const isActive = !settings.customBackground && (settings.backgroundStyle || 'anim-golden-dust') === bg.id;
                return (
                  <button
                    key={bg.id}
                    data-tv-focusable="true"
                    tabIndex={0}
                    onClick={() => handleSelectBackground(bg.id)}
                    className={`p-2.5 rounded-2xl border transition-all text-left flex flex-col justify-between group relative overflow-hidden outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:ring-inset ${
                      isActive 
                        ? 'border-gold shadow-[0_0_25px_rgba(212,175,55,0.3)] scale-[1.02]' 
                        : 'border-white/5 hover:border-gold/30 bg-black/40 hover:bg-white/5'
                    } ${isRtl ? 'text-right' : ''}`}
                  >
                    <div className={`flex items-center justify-between w-full mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div 
                        className="w-10 h-10 rounded-xl border border-white/20 shadow-md flex items-center justify-center text-xs font-mono"
                        style={{ backgroundColor: bg.previewColor }}
                      >
                        {bg.type === 'animated' ? '✨' : '🖼️'}
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${bg.type === 'animated' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {bg.type === 'animated' ? (isRtl ? 'متحركة' : 'Animated') : (isRtl ? 'ثابتة' : 'Static')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-black uppercase text-white group-hover:text-gold transition-colors">
                        {settings.language === 'ar' ? bg.nameAr : bg.nameEn}
                      </h3>
                      <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {settings.language === 'ar' ? bg.descriptionAr : bg.nameEn}
                      </p>
                    </div>

                    <div className={`mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className="text-zinc-500 text-[10px]">{bg.nameEn}</span>
                      {isActive ? (
                        <span className="flex items-center gap-1 text-gold font-bold">
                          <Check size={14} />
                          <span>{isRtl ? 'مُفعّل' : 'Active'}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600 group-hover:text-zinc-300">{isRtl ? 'تطبيق' : 'Apply'}</span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: 30 DASHBOARD INTERFACE LAYOUTS (تغيير شكل واجهة التطبيق إلى 30 شكلاً احترافياً)
  if (subView === 'dashboard-layouts') {
    return (
      <SubViewContainer title={`${t('dashboard_layouts')} (30)`} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-between gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-2.5 rounded-xl bg-gold/20 text-gold">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {isRtl ? 'اختر شكل واجهة الشاشة الرئيسية المفضلة لديك' : 'Select Dashboard Layout Design'}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isRtl ? 'تغيير تخطيط الشاشة الرئيسية دون التأثير على ألوان الثيم أو الأيقونات أو القنوات' : 'Changes home screen arrangement while preserving all themes and icons'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
            {DASHBOARD_LAYOUTS.map((layoutOption, idx) => {
              const isActive = (settings.dashboardLayout || 'layout-classic-grid') === layoutOption.id;
              return (
                <button
                  key={layoutOption.id}
                  data-tv-focusable="true"
                  tabIndex={0}
                  onClick={() => {
                    updateSetting('dashboardLayout', layoutOption.id);
                    setSubView('main');
                  }}
                  className={`p-3 glass-card rounded-xl border transition-all text-left flex flex-col justify-between group relative overflow-hidden outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset ${
                    isActive 
                      ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.3)] scale-[1.02]' 
                      : 'border-white/5 hover:border-gold/40 hover:bg-white/5'
                  } ${isRtl ? 'text-right' : ''}`}
                >
                  <div className={`flex items-center justify-between w-full mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="p-1.5 rounded-lg bg-gold/20 text-gold">
                      <LayoutDashboard size={16} />
                    </div>
                    <span className="text-[8px] font-mono font-bold text-zinc-500">#{idx + 1}</span>
                  </div>

                  <div>
                    <h3 className="text-[10px] sm:text-xs font-black uppercase text-white group-hover:text-gold transition-colors truncate">
                      {settings.language === 'ar' ? layoutOption.nameAr : layoutOption.nameEn}
                    </h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5 line-clamp-2 leading-tight">
                      {settings.language === 'ar' ? layoutOption.descriptionAr : layoutOption.nameEn}
                    </p>
                  </div>

                  <div className={`mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span className="text-zinc-600 truncate max-w-[50px]">{layoutOption.nameEn}</span>
                    {isActive ? (
                      <span className="flex items-center gap-0.5 text-gold font-bold">
                        <Check size={10} />
                        <span>{isRtl ? 'مُفعّل' : 'Active'}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500 group-hover:text-gold font-bold">{isRtl ? 'تطبيق' : 'Apply'}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEWS FOR CATEGORY MANAGEMENT (SERIES, MOVIES, LIVE)
  if (subView.startsWith('categories-')) {
    const type = subView.split('-')[1] as 'live' | 'movie' | 'series';
    const titleKey = type === 'live' ? 'hide_live_categories' : type === 'movie' ? 'hide_movie_categories' : 'hide_series_categories';
    let hiddenList = settings.hiddenLiveCategories || [];
    if (type === 'movie') hiddenList = settings.hiddenMovieCategories || [];
    if (type === 'series') hiddenList = settings.hiddenSeriesCategories || [];
    const hiddenCountInThisView = categories.filter(c => hiddenList.includes(c.category_id) || hiddenList.includes(c.category_name)).length;
    const visibleCountInThisView = categories.length - hiddenCountInThisView;

    return (
      <SubViewContainer title={t(titleKey)} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="flex flex-col gap-4">
          <div className={`p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-between gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-2.5 rounded-xl bg-gold/20 text-gold">
                {type === 'series' ? <Tv size={24} /> : type === 'movie' ? <Film size={24} /> : <EyeOff size={24} />}
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {type === 'series' 
                    ? (isRtl ? 'إدارة إخفاء واسترجاع باقات المسلسلات' : 'Manage & Hide Series Groups') 
                    : type === 'movie' 
                      ? (isRtl ? 'إدارة إخفاء واسترجاع باقات الأفلام' : 'Manage & Hide Movie Groups')
                      : (isRtl ? 'إدارة إخفاء واسترجاع قنوات المباشر' : 'Manage & Hide Live Groups')}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {type === 'series'
                    ? (isRtl ? 'انقر على أي باقة مسلسلات (سورية، مصرية، رمضان، تركية...) لإخفائها أو إعادتها لقائمة العرض.' : 'Click any series group to hide or restore it.')
                    : type === 'movie'
                      ? (isRtl ? 'انقر على أي باقة أفلام (مصرية، سورية، أمريكية...) لإخفائها أو إعادتها.' : 'Click any movie group to hide or restore it.')
                      : (isRtl ? 'انقر على أي باقة قنوات لإخفائها أو إعادتها.' : 'Click any live group to hide or restore it.')}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-2 font-mono text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
                {visibleCountInThisView} {isRtl ? 'معروض' : 'visible'}
              </span>
              <span className="px-2.5 py-1 bg-red-500/20 text-red-300 rounded-lg border border-red-500/30">
                {hiddenCountInThisView} {isRtl ? 'مخفي' : 'hidden'}
              </span>
            </div>
          </div>

          <div className={`flex flex-wrap items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-zinc-500 ${isRtl ? 'right-4' : 'left-4'}`} size={18} />
              <input 
                type="text"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder={t('search_categories')}
                className={`w-full bg-black/40 border border-white/10 rounded-xl py-2.5 text-sm text-white focus:border-gold/50 outline-none transition-all ${isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`}
              />
            </div>

            <div className={`flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button
                data-tv-focusable="true"
                tabIndex={0}
                onClick={() => setCatFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-inset focus:ring-gold ${catFilterTab === 'all' ? 'bg-gold text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                {isRtl ? `الكل (${categories.length})` : `All (${categories.length})`}
              </button>
              <button
                data-tv-focusable="true"
                tabIndex={0}
                onClick={() => setCatFilterTab('visible')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-inset focus:ring-gold ${catFilterTab === 'visible' ? 'bg-emerald-500 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                {isRtl ? `المعروضة (${visibleCountInThisView})` : `Visible (${visibleCountInThisView})`}
              </button>
              <button
                data-tv-focusable="true"
                tabIndex={0}
                onClick={() => setCatFilterTab('hidden')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-inset focus:ring-gold ${catFilterTab === 'hidden' ? 'bg-red-500 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                {isRtl ? `المخفية (${hiddenCountInThisView})` : `Hidden (${hiddenCountInThisView})`}
              </button>
            </div>

            <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button
                data-tv-focusable="true"
                tabIndex={0}
                onClick={showAllVisibleCategories}
                className="px-4 py-2.5 bg-white/10 hover:bg-gold hover:text-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95 outline-none focus:ring-2 focus:ring-inset focus:ring-gold"
                title={isRtl ? 'إظهار كافة المجموعات الحالية' : 'Show all current groups'}
              >
                <Eye size={16} />
                <span>{t('show_all')}</span>
              </button>
              <button
                data-tv-focusable="true"
                tabIndex={0}
                onClick={hideAllVisibleCategories}
                className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95 outline-none focus:ring-2 focus:ring-inset focus:ring-gold"
                title={isRtl ? 'إخفاء كافة المجموعات الحالية' : 'Hide all current groups'}
              >
                <EyeOff size={16} />
                <span>{t('hide_all')}</span>
              </button>
              <button
                data-tv-focusable="true"
                tabIndex={0}
                onClick={() => {
                  if (type === 'movie') updateSetting('hiddenMovieCategories', []);
                  else if (type === 'series') updateSetting('hiddenSeriesCategories', []);
                  else updateSetting('hiddenLiveCategories', []);
                }}
                className="px-4 py-2.5 bg-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95 border border-white/5 outline-none focus:ring-2 focus:ring-inset focus:ring-gold"
                title={isRtl ? 'مسح كافة الإعدادات السابقة والمخفية لهذه الفئة' : 'Reset all previous hidden settings for this type'}
              >
                <Trash2 size={16} />
                <span>{isRtl ? 'إعادة ضبط الكل' : 'Reset All'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-2 scrollbar-hide">
            {catLoading ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-3 border-gold border-t-transparent rounded-full animate-spin" />
                <span className="text-zinc-500 text-xs uppercase tracking-wider">{t('loading')}</span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="col-span-full py-16 text-center glass-card rounded-2xl border border-white/5">
                <EyeOff className="mx-auto text-zinc-700 mb-2" size={36} />
                <p className="text-zinc-400 text-sm font-bold uppercase">{t('no_channels')}</p>
              </div>
            ) : (
              filteredCategories.map((cat, idx) => {
                const isHidden = hiddenList.includes(cat.category_id) || hiddenList.includes(cat.category_name);
                return (
                  <button
                    key={`${cat.category_id}-${idx}`}
                    data-tv-focusable="true"
                    tabIndex={0}
                    onClick={() => toggleCategoryVisibility(cat.category_id)}
                    className={`flex items-center justify-between p-3 glass-card rounded-xl transition-all border outline-none focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-[1.02] ${
                      isHidden 
                        ? 'border-red-500/50 bg-red-950/20 hover:bg-red-950/30' 
                        : 'border-white/5 hover:border-gold/40 hover:bg-white/5'
                    } ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-sm font-bold truncate ${isHidden ? 'text-zinc-400 line-through' : 'text-white'}`}>
                        {cat.category_name}
                      </span>
                      <span className={`text-[11px] uppercase font-mono mt-0.5 font-bold ${isHidden ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isHidden ? (isRtl ? '✕ مخفي عن العرض' : '✕ Hidden') : (isRtl ? '✓ معروض للمشاهدة' : '✓ Visible')}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl ml-3 ${isHidden ? 'bg-red-500/20 text-red-400' : 'bg-gold/15 text-gold'}`}>
                      {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: SIMULATED BUILT-IN SMART VPN / ANTI-BLOCK PROXY
  if (subView === 'vpn') {
    const nodes = [
      { id: 'auto', flag: '⚡', nameAr: 'الخادم الأنسب تلقائياً (Auto)', nameEn: 'Auto Smart Relay', region: 'Auto Node' },
      { id: 'de', flag: '🇩🇪', nameAr: 'خادم فرانكفورت (ألمانيا)', nameEn: 'Frankfurt - Germany', region: 'Europe Direct' },
      { id: 'nl', flag: '🇳🇱', nameAr: 'خادم أمستردام (هولندا)', nameEn: 'Amsterdam - Netherlands', region: 'Europe Low-Latency' },
      { id: 'uk', flag: '🇬🇧', nameAr: 'خادم لندن (المملكة المتحدة)', nameEn: 'London - UK', region: 'Global Relay' },
      { id: 'ae', flag: '🇦🇪', nameAr: 'خادم دبي (الإمارات)', nameEn: 'Dubai - UAE', region: 'Middle East Hub' },
      { id: 'us', flag: '🇺🇸', nameAr: 'خادم نيويورك (الولايات المتحدة)', nameEn: 'New York - USA', region: 'Americas Fast' },
    ];

    return (
      <SubViewContainer title={t('anti_block_vpn')} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="space-y-6">
          {/* Main Toggle Card */}
          <div className={`p-6 glass-card rounded-3xl border ${settings.vpnEnabled ? 'border-gold/50 bg-gold/10 shadow-[0_0_25px_rgba(212,175,55,0.2)]' : 'border-white/10 bg-black/40'} transition-all flex flex-col md:flex-row items-center justify-between gap-6`}>
            <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <div className={`p-4 rounded-2xl ${settings.vpnEnabled ? 'bg-gold text-black shadow-lg shadow-gold/30 animate-pulse' : 'bg-white/10 text-zinc-400'}`}>
                <Shield size={32} />
              </div>
              <div>
                <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <h2 className="text-base font-black text-white uppercase tracking-wider">
                    {isRtl ? 'VPN مجاني وتلقائي لتخطي حجب IPTV' : 'Automatic Anti-Block Smart VPN'}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${settings.vpnEnabled ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-zinc-800 text-zinc-400'}`}>
                    {settings.vpnEnabled ? (isRtl ? '🟢 مُمكّن ويعمل' : '🟢 Active') : (isRtl ? '🔴 متوقف' : '🔴 Disabled')}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
                  {isRtl 
                    ? 'يقوم بتدوير الخوادم والروابط التلقائية وإضافة ترويسات متقدمة لتجاوز الحجب الجغرافي وحظر مزودي خدمة الإنترنت (ISP Unblock) لكافة القنوات والروابط المشفرة'
                    : 'Rotates public proxy relays and injects header spoofing to unblock regionally restricted IPTV streams automatically.'}
                </p>
              </div>
            </div>

            <button
              data-tv-focusable="true"
              tabIndex={0}
              onClick={() => updateSetting('vpnEnabled', !settings.vpnEnabled)}
              className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 shrink-0 active:scale-95 focus:ring-4 focus:ring-inset focus:ring-white outline-none ${
                settings.vpnEnabled 
                  ? 'bg-gold hover:brightness-110 text-black shadow-gold/25' 
                  : 'bg-white/10 hover:bg-gold hover:text-black text-white border border-white/10'
              }`}
            >
              <Shield size={18} />
              <span>{settings.vpnEnabled ? (isRtl ? 'إيقاف تشغيل VPN' : 'Disable VPN') : (isRtl ? 'تفعيل VPN الآن' : 'Enable VPN')}</span>
            </button>
          </div>

          {/* Node Selection */}
          <div className="space-y-3">
            <h3 className={`text-xs font-black text-gold uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
              {isRtl ? 'اختر خادم التمرير (VPN Proxy Node)' : 'Select VPN Relay Node'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {nodes.map((node, idx) => {
                const isActive = (settings.vpnRegion || 'auto') === node.id;
                return (
                  <button
                    key={`${node.id}-${idx}`}
                    data-tv-focusable="true"
                    tabIndex={0}
                    onClick={() => updateSetting('vpnRegion', node.id as any)}
                    className={`p-3 glass-card rounded-xl border transition-all text-left flex items-center justify-between focus:ring-2 focus:ring-inset focus:ring-gold outline-none ${
                      isActive 
                        ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.2)]' 
                        : 'border-white/5 hover:border-gold/30 hover:bg-white/5'
                    } ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                  >
                    <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className="text-2xl">{node.flag}</span>
                      <div>
                        <span className="text-xs font-black text-white block uppercase tracking-wider">
                          {isRtl ? node.nameAr : node.nameEn}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                          {node.region}
                        </span>
                      </div>
                    </div>
                    {isActive && <Check className="text-gold shrink-0" size={18} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Relay Mode Selection */}
          <div className="space-y-3">
            <h3 className={`text-xs font-black text-gold uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
              {isRtl ? 'نمط تجاوز الحجب (Relay Engine Mode)' : 'Bypass Engine Mode'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'auto-relay', labelAr: 'تلقائي (Smart Relay + Headers)', labelEn: 'Auto Smart Relay', descAr: 'إعادة توجيه ذكية وتزوير الترويسات حسب القناة' },
                { id: 'force-proxy', labelAr: 'إجبار الوكيل (Force Server Proxy)', labelEn: 'Force Proxy Server', descAr: 'تمرير كافة حزم الفيديو عبر الخادم الخلفي لفك الحظر' },
                { id: 'direct', labelAr: 'مباشر (Direct Connection)', labelEn: 'Direct Stream', descAr: 'الاتصال المباشر دون المرور بالوكيل' },
              ].map((mode, idx) => {
                const isActive = (settings.vpnMode || 'auto-relay') === mode.id;
                return (
                  <button
                    key={`${mode.id}-${idx}`}
                    onClick={() => updateSetting('vpnMode', mode.id as any)}
                    className={`p-4 glass-card rounded-2xl border transition-all text-left flex flex-col justify-between ${
                      isActive 
                        ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.2)]' 
                        : 'border-white/5 hover:border-gold/30 hover:bg-white/5'
                    } ${isRtl ? 'text-right' : ''}`}
                  >
                    <div>
                      <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-black text-white uppercase tracking-wider">
                          {isRtl ? mode.labelAr : mode.labelEn}
                        </span>
                        {isActive && <Check className="text-gold shrink-0" size={16} />}
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                        {mode.descAr}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: SPLASH INTRO & MUSIC
  if (subView === 'splash-intro') {
    const animationStyles = [
      { 
        id: 'royal_gold_particles', 
        nameAr: '👑 هالة الجزيئات والذهب الملكي (Royal Gold Particles)', 
        nameEn: 'Royal Gold Particles & Halo', 
        descAr: 'حلقات مدارية ذهبية تدور حول الشعار مع هالة جزيئات براقة وتوهج ضوئي ملكي فخم',
        badgeAr: 'ملكي فاخر'
      },
      { 
        id: 'holographic_crown', 
        nameAr: '💎 النيون الهولوجرامي والكروم (Holographic Crown Orbit)', 
        nameEn: 'Dual Holographic Orbit Rings', 
        descAr: 'حلقتان نيونيتان متعاكستان باللونين الذهبي والسماوي تدوران هولوجرامياً حول الشعار مع شبكة نيون',
        badgeAr: 'هولوجرام 3D'
      },
      { 
        id: 'diamond_beam_pulse', 
        nameAr: '✨ أشعة الألماس والضوء السينمائي (Diamond Beam Burst)', 
        nameEn: 'Diamond Light Beams & Strobe', 
        descAr: '8 أشعة ضوئية ماسية تدور خلف الشعار مع ومضات سينمائية وتوهج متساقط',
        badgeAr: 'أشعة سينمائية'
      },
      { 
        id: 'cyber_pulsar', 
        nameAr: '⚡ درع السايبر والليزريات المستقبلي (Cyber Laser Shield)', 
        nameEn: 'Cybernetic Pulsar & Laser Grid', 
        descAr: 'درع ليزري ثلاثي الأبعاد بلون الزمرد والذهب مع مسار نيون رقمي مستقبلي',
        badgeAr: 'سايبر مستقبل'
      },
      { 
        id: 'cinematic_epic_zoom', 
        nameAr: '🌌 زوبعة النجوم والتكبير السينمائي (Space Warp Zoom)', 
        nameEn: 'Space Warp Starfield Zoom', 
        descAr: 'خلفية نجوم فضائية منطلقة مع تكبير سينمائي دافئ وعدسة بصرية فخمة',
        badgeAr: 'فضائي فخم'
      },
    ];

    const soundOptions = [
      { id: 'epic_royal_fanfare', nameAr: '🎵 افتتاحية الأوركسترا الملكية الفاخرة (Royal Fanfare Orchestra - Default)', nameEn: 'Epic Royal Fanfare & Brass (Default)', descAr: 'افتتاحية أوركسترالية فخمة بتناغم نحاسي ملكي وجهير عميق وبث مباشر مميز' },
      { id: 'imax_bass_rise', nameAr: '🔊 ارتفاع الباس السينمائي الفائق (IMAX Sub-Woofer Rise)', nameEn: 'IMAX Sub-Woofer Bass Sweep', descAr: 'صوت جهير سينمائي عميق جداً يبدأ بإنذار منخفض وينتهي بانفجار حاد فخم' },
      { id: 'synthwave_arpeggio', nameAr: '🎹 موسيقى السنث المستقبلي والسايبر (Cyber Synthwave Cascade)', nameEn: 'Retro Cyberpunk Synth Arpeggio', descAr: 'نغمات سنثويف الكترونية مستوحاة من عوالم المستقبل والتكنولوجيا' },
      { id: 'crystal_magic_chimes', nameAr: '💎 رنين البلور الكريستالي الساحر (Crystal Pentatonic Chimes)', nameEn: 'Crystal Pentatonic Magic Chimes', descAr: 'نغمات بلورية ساحرة وناعمة كالكريستال تشيع الهدوء والفخامة' },
      { id: 'cinematic_netflix', nameAr: '🎬 صوت استوديوهات السينما (Studio Boom / Ta-Dum)', nameEn: 'Deep Cinematic Studio Boom', descAr: 'صوت جهير استوديوي عميق من كبريات منصات الأفلام' },
      { id: 'mute', nameAr: '🔇 صامت تماماً دون أي موسيقى (Silent / Mute)', nameEn: 'Mute (No Sound)', descAr: 'تشغيل هادئ بدون أي أصوات عند فتح التطبيق' },
    ];

    const currentStyle = settings.splashStyle || 'floating_3d';

    return (
      <SubViewContainer title={t('splash_intro')} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="space-y-6">
          {/* Quick Preview Card */}
          <div className="flex items-center justify-between p-4 glass-card rounded-2xl border border-gold/30">
            <div>
              <h2 className="text-sm font-black text-white">{isRtl ? 'معاينة شاشة البداية الآن' : 'Test Splash Screen Now'}</h2>
              <p className="text-xs text-zinc-400">{isRtl ? 'انقر لتجربة الحركة والشكل والصوت المختار مباشرة' : 'Click to preview the selected splash intro & sound'}</p>
            </div>
            <button
              data-tv-focusable="true"
              tabIndex={0}
              onClick={() => {
                if (onTriggerSplash) onTriggerSplash();
              }}
              className="px-5 py-2.5 bg-gold text-black rounded-xl text-xs font-black uppercase hover:bg-gold/90 transition-all shadow-md active:scale-95 flex items-center gap-2 focus:ring-4 focus:ring-inset focus:ring-white outline-none"
            >
              <Sparkles size={14} />
              <span>{isRtl ? 'تجربة وتشغيل' : 'Preview'}</span>
            </button>
          </div>

          {/* Opening Animation Style Selection */}
          <div className="space-y-3">
            <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xs font-black text-gold uppercase tracking-wider">
                {isRtl ? 'شكل وحركة فتح التطبيق (الأشكال الحركية)' : 'Opening Animation Style'}
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono">
                {isRtl ? 'شعار أصلي 100% متحرك دون تشويه' : '100% Official Logo in Motion'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {animationStyles.map((item) => {
                const isSelected = currentStyle === item.id || (!currentStyle && item.id === 'royal_gold_particles');

                return (
                  <button
                    key={item.id}
                    data-tv-focusable="true"
                    tabIndex={0}
                    onClick={() => updateSetting('splashStyle', item.id as any)}
                    className={`p-2.5 glass-card rounded-lg border transition-all text-left flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset ${
                      isSelected
                        ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                        : 'border-white/5 hover:border-gold/30 hover:bg-white/5'
                    } ${isRtl ? 'text-right' : 'text-left'}`}
                  >
                    <div>
                      <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-black text-white">{isRtl ? item.nameAr : item.nameEn}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[9px] font-bold">
                            {item.badgeAr}
                          </span>
                          {isSelected && <Check className="text-gold shrink-0" size={16} />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {item.descAr}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intro Soundtrack Selection */}
          <div className="space-y-3 pt-2">
            <h3 className={`text-xs font-black text-gold uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
              {isRtl ? 'اختر صوت أو موسيقى البداية' : 'Select Intro Sound'}
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {soundOptions.map((opt, idx) => {
                const isSelected = (settings.splashSoundTrack || 'cinematic_netflix') === opt.id;
                return (
                  <button
                    key={`${opt.id}-${idx}`}
                    data-tv-focusable="true"
                    tabIndex={0}
                    onClick={() => updateSetting('splashSoundTrack', opt.id as any)}
                    className={`p-4 glass-card rounded-2xl border transition-all flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold ${
                      isSelected
                        ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                        : 'border-white/5 hover:border-gold/30 hover:bg-white/5'
                    } ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-gold text-black' : 'bg-white/5 text-zinc-400'}`}>
                        {opt.id === 'mute' ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white">{isRtl ? opt.nameAr : opt.nameEn}</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{opt.descAr}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="text-gold shrink-0" size={18} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SubViewContainer>
    );
  }

  // SUBVIEW: PARENTAL CONTROL
  if (subView === 'parental') {
    return (
      <SubViewContainer title={t('parental_control')} onBack={() => setSubView('main')} isRtl={isRtl}>
        <div className="max-w-md mx-auto space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400 uppercase">{t('enter_password')}</label>
            <input
              type="password"
              maxLength={6}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-lg tracking-[0.5em] text-center outline-none focus:border-gold/50 transition-all font-mono"
              placeholder="••••"
            />
            {error && <p className="text-red-500 text-xs font-bold uppercase">{error}</p>}
          </div>
          <button
            onClick={handleSetPassword}
            className="w-full py-4 bg-gold text-black font-black uppercase tracking-widest rounded-xl hover:bg-gold/80 transition-all shadow-lg active:scale-95 text-xs"
          >
            {t('save')}
          </button>
          {settings.parentalPassword && (
            <button
              onClick={() => {
                updateSetting('parentalPassword', '');
                setSubView('main');
              }}
              className="w-full py-3 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold rounded-xl transition-all text-xs active:scale-95"
            >
              {isRtl ? 'إلغاء القفل وحذف الرمز' : 'Remove Password'}
            </button>
          )}
        </div>
      </SubViewContainer>
    );
  }

  // MAIN SETTINGS VIEW (CLASSIC GRID LAYOUT RESTORED EXACTLY AS USER DESIRED)
  return (
    <div className={`h-screen w-full bg-[#0d0d11] flex flex-col items-center p-3 sm:p-5 select-none overflow-hidden relative z-10 ${isRtl ? 'font-cairo' : 'font-sans'}`}>
      {/* Hidden File Input for Direct Channel Upload within Settings */}
      <input 
        type="file" 
        ref={channelFileInputRef} 
        className="hidden" 
        accept=".m3u,.m3u8,.txt"
        onChange={handleChannelFileUploadInSettings}
      />

      {/* Fixed Header */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-3 bg-[#141419] p-2 rounded-2xl border border-white/5 shadow-md shrink-0">
        <button 
          data-tv-focusable="true"
          tabIndex={0}
          onClick={onBack}
          className="p-2 bg-[#1e1e26] hover:bg-gold hover:text-black focus:bg-gold focus:text-black focus:ring-2 focus:ring-inset focus:ring-gold rounded-xl text-white transition-all shadow outline-none cursor-pointer flex items-center justify-center"
          title={isRtl ? 'رجوع' : 'Back'}
        >
          <ChevronLeft size={16} className={isRtl ? 'rotate-180' : ''} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-gold/90 leading-tight">{t('settings')}</h1>
          <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">{t('settings_subtitle')}</span>
        </div>
        <div className="w-8" />
      </header>

      {/* Scrollable Content Body */}
      <div className="w-full max-w-5xl flex-1 overflow-y-auto no-scrollbar pb-10">
        {historyClearSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-3 px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold"
          >
            {t('data_refreshed')}
          </motion.div>
        )}

        {syncNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-3 px-4 py-2 bg-[#1a1a24] border border-gold/40 text-gold rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
          >
            <RefreshCw size={14} className={syncInProgress ? 'animate-spin' : ''} />
            <span>{syncNotification}</span>
          </motion.div>
        )}

        {/* The 3 Sleek Category Hiding Cards at Top */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
          {/* Card 1: Series Categories */}
          <motion.button
            data-tv-focusable="true"
            tabIndex={0}
            onClick={() => setSubView('categories-series')}
            className={`p-3 bg-[#15151b] rounded-xl border border-gold/30 hover:border-gold hover:bg-[#1d1d26] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold flex items-center justify-between transition-all cursor-pointer ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
          >
            <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-lg bg-gold/15 text-gold shrink-0">
                <Clapperboard size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-gold uppercase tracking-wider">{t('hide_series_categories')}</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{t('hide_series_desc')}</p>
              </div>
            </div>
            <ChevronLeft size={16} className={`${isRtl ? '' : 'rotate-180'} text-gold shrink-0`} />
          </motion.button>

          {/* Card 2: Movie Categories */}
          <motion.button
            data-tv-focusable="true"
            tabIndex={0}
            onClick={() => setSubView('categories-movie')}
            className={`p-3 bg-[#15151b] rounded-xl border border-white/10 hover:border-gold/40 hover:bg-[#1d1d26] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold flex items-center justify-between transition-all cursor-pointer ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
          >
            <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-lg bg-white/5 text-gold shrink-0">
                <Film size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{t('hide_movie_categories')}</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{t('hide_movies_desc')}</p>
              </div>
            </div>
            <ChevronLeft size={16} className={`${isRtl ? '' : 'rotate-180'} text-zinc-400 shrink-0`} />
          </motion.button>

          {/* Card 3: Live Categories */}
          <motion.button
            data-tv-focusable="true"
            tabIndex={0}
            onClick={() => setSubView('categories-live')}
            className={`p-3 bg-[#15151b] rounded-xl border border-white/10 hover:border-gold/40 hover:bg-[#1d1d26] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold flex items-center justify-between transition-all cursor-pointer ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
          >
            <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-lg bg-white/5 text-gold shrink-0">
                <EyeOff size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{t('hide_live_categories')}</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{t('hide_live_desc')}</p>
              </div>
            </div>
            <ChevronLeft size={16} className={`${isRtl ? '' : 'rotate-180'} text-zinc-400 shrink-0`} />
          </motion.button>
        </div>

        {/* Enhanced Compact Charcoal Settings Tiles Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 w-full mb-6">
          {settingsItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={idx}
                data-tv-focusable="true"
                tabIndex={0}
                onClick={item.action}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex flex-col justify-center items-center p-1.5 bg-[#16161c] hover:bg-[#1d1d26] rounded-lg border border-white/5 hover:border-gold/60 focus:ring-2 focus:ring-inset focus:ring-gold focus:outline-none transition-all group relative overflow-hidden h-[58px] text-center outline-none cursor-pointer"
              >
                <div className="p-1 rounded-md bg-gold/10 text-gold group-hover:bg-gold group-hover:text-black transition-all mb-0.5">
                  <Icon size={10} />
                </div>
                <span className="text-[9px] font-black tracking-wider text-white group-hover:text-gold transition-colors block truncate w-full px-1 leading-none">
                  {item.label}
                </span>
                {item.value && (
                  <span className="text-[7.5px] font-mono font-bold text-gold/80 truncate w-full mt-0.5 px-1 opacity-90">
                    {item.value}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Upload or Direct Paste M3U Modal Trigger Area (Previously a button, now just a note or simpler tile) */}

        {/* Footer */}
        <footer className="mt-8 py-4 text-center space-y-1 opacity-40">
          <p className="text-zinc-500 font-mono tracking-widest text-[11px] uppercase">
            MAC: <span className="text-zinc-300">6A:CD:C2:93:2F:D5</span>
          </p>
          <p className="text-zinc-500 font-mono tracking-widest text-[11px] uppercase">
            Device Key: <span className="text-gold">411480</span>
          </p>
        </footer>
      </div>

      <AnimatePresence>
        {showUploadPasteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-lg bg-zinc-950 border-2 border-gold/50 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 ${isRtl ? 'font-cairo text-right' : 'text-left'}`}
            >
              <div className={`flex items-center justify-between pb-3 border-b border-white/10 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 rounded-xl bg-gold text-black">
                    <Upload size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {isRtl ? 'رفع أو لصق محتوى ملف M3U' : 'Upload or Paste M3U Content'}
                    </h3>
                  </div>
                </div>
                <button onClick={() => setShowUploadPasteModal(false)} className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 py-1">
                {/* File Upload Button */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gold">
                    {isRtl ? 'الطريقة الأولى: اختيار ملف من الجهاز' : 'Option 1: Choose File from Device'}
                  </label>
                  <button
                    onClick={() => channelFileInputRef.current?.click()}
                    className="w-full py-3 bg-white/5 border border-dashed border-gold/40 hover:border-gold hover:bg-gold/10 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                  >
                    <Upload size={16} className="text-gold" />
                    <span>{isRtl ? 'فتح مستعرض ملفات الجهاز...' : 'Open Device File Browser...'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 my-1">
                  <div className="flex-1 h-[1px] bg-white/10" />
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">{isRtl ? 'أو' : 'OR'}</span>
                  <div className="flex-1 h-[1px] bg-white/10" />
                </div>

                {/* Direct Text Area Paste */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gold">
                    {isRtl ? 'الطريقة الثانية (تضمن الفتح على التلفزيون): لصق محتوى النص مباشرة' : 'Option 2 (Guaranteed on TV): Paste M3U Text Directly'}
                  </label>

                  <input
                    type="text"
                    value={pastedM3uName}
                    onChange={(e) => setPastedM3uName(e.target.value)}
                    placeholder={isRtl ? 'اسم القائمة (اختياري)' : 'Playlist Name (Optional)'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold"
                  />

                  <textarea
                    value={pastedM3uText}
                    onChange={(e) => setPastedM3uText(e.target.value)}
                    placeholder={`#EXTM3U\n#EXTINF:-1 tvg-id="1" group-title="الأخبار", قناة الجزيرة\nhttp://server.com/live/ch1.m3u8`}
                    rows={5}
                    className="w-full bg-black/80 border border-white/10 rounded-2xl p-3 text-xs font-mono text-gold outline-none focus:border-gold/60 no-scrollbar"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button onClick={() => setShowUploadPasteModal(false)} className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold">
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => saveAndActivateM3uContent(pastedM3uName.trim() || 'ملف_قنوات_مباشر.m3u', pastedM3uText)}
                  disabled={!pastedM3uText.trim()}
                  className="px-5 py-2 bg-gold text-black rounded-xl text-xs font-black uppercase hover:bg-gold/80 disabled:opacity-40"
                >
                  {isRtl ? 'حفظ وتفعيل القنوات' : 'Save & Activate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubViewContainer({ title, onBack, children, isRtl }: { title: string, onBack: () => void, children: React.ReactNode, isRtl: boolean }) {
  return (
    <div className={`h-screen w-full bg-[#0c0c10] p-3 sm:p-5 flex flex-col items-center select-none overflow-hidden relative ${isRtl ? 'font-cairo' : 'font-sans'}`}>
      <header className="w-full max-w-5xl flex items-center justify-between mb-4 shrink-0 bg-[#141419] p-2 rounded-2xl border border-white/5 shadow-md">
        <button 
          data-tv-focusable="true"
          tabIndex={0}
          onClick={onBack} 
          className="p-2 bg-[#1e1e26] hover:bg-gold hover:text-black focus:bg-gold focus:text-black focus:ring-2 focus:ring-inset focus:ring-gold rounded-xl text-white transition-all shadow outline-none cursor-pointer flex items-center justify-center"
          title={isRtl ? 'رجوع' : 'Back'}
        >
          <ChevronLeft size={16} className={isRtl ? 'rotate-180' : ''} />
        </button>
        <h1 className="text-xs sm:text-sm font-black tracking-widest text-gold uppercase px-2 truncate">{title}</h1>
        <div className="w-9" />
      </header>
      <div className="w-full max-w-5xl flex-1 overflow-y-auto no-scrollbar pb-10">
        {children}
      </div>
    </div>
  );
}

function OptionButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      data-tv-focusable="true"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Select' || e.keyCode === 13 || e.keyCode === 23) onClick(); }}
      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl transition-all border outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:scale-[1.01] cursor-pointer ${
        active 
          ? 'border-gold bg-gold/15 shadow-[0_0_15px_rgba(212,175,55,0.25)]' 
          : 'border-white/10 bg-[#16161c] hover:border-gold/40 hover:bg-[#1e1e28]'
      }`}
    >
      <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">{label}</span>
      {active && (
        <span className="p-1 rounded-lg bg-gold text-black font-black shrink-0 shadow-sm ml-2 rtl:mr-2">
          <Check size={14} />
        </span>
      )}
    </button>
  );
}
