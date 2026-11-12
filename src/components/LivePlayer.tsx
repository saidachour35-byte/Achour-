import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import { PLAYER_PACKAGES, getPlayerPackage } from '../utils/players';
import { 
  Search, Zap, LayoutGrid, List, ArrowUpDown, Trash2, Clock, 
  Play, Pause, EyeOff, MonitorPlay, Plus, X, History, Database, 
  Maximize, Minimize, Eye, RotateCcw, AlertTriangle, ShieldCheck, ChevronLeft, ChevronRight,
  Star, Volume2, VolumeX, Sun, Tv, HelpCircle, Filter, Sparkles, Radio,
  Film, Clapperboard, Check, Sliders, Monitor, ChevronUp, ChevronDown, Layers, Info, ArrowUp, ArrowDown, Move, Copy, Mic, MicOff, Calendar, ChevronsUp
} from 'lucide-react';
import AIOcrModal from './AIOcrModal';
import PinUnlockModal from './PinUnlockModal';
import VodPlayerModal from './VodPlayerModal';
import EPGGrid from './EPGGrid';
import VirtualizedChannelList from './VirtualizedChannelList';
import PositionEditModal from './PositionEditModal';
import logoImg from '../assets/logo';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import axios from 'axios';
import { AppSettings, Channel, Language, Playlist } from '../types';
import { fetchChannels, fetchChannelsForType, iptvGlobalCache, parseM3U } from '../utils/iptv';
import { useI18n } from '../utils/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getLocalFavoriteIds, 
  syncFavoritesFromFirestore, 
  toggleFavorite as toggleFavoriteService, 
  subscribeFavorites 
} from '../utils/favoritesService';
import { xtreamFetch } from '../utils/iptv';
import { getRecents, addToRecents } from '../utils/recentService';
import { getPlatformUrl, isAndroid } from '../utils/platform';
import { formatLanguageLabel } from '../utils/mediaTracks';
import { pushBackHandler, BackPriority } from '../utils/tvNavigation';
import { parseExpiryDate } from '../utils/subscription';
import { 
  initDB, 
  saveChannels, 
  getChannelsByType, 
  getCategoriesByType, 
  getChannelsByCategory,
  getChannelsByPlaylistAndType,
  getCategoriesByPlaylistAndType
} from '../lib/db';
import { processInChunks } from '../utils/performance';

// Helper for long press detection with touch-movement cancellation
const useLongPress = (callback: () => void, ms = 500, enabled = true) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback((clientX?: number, clientY?: number) => {
    if (!enabled) return;
    isLongPress.current = false;
    if (clientX !== undefined && clientY !== undefined) {
      startPos.current = { x: clientX, y: clientY };
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      callback();
    }, ms);
  }, [callback, ms, enabled]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPos.current.x);
    const dy = Math.abs(touch.clientY - startPos.current.y);
    if (dx > 6 || dy > 6) {
      stop();
    }
  }, [stop]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > 8 || dy > 8) {
      stop();
    }
  }, [stop]);

  const onClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enabled) return;
    const isOkKey = e.key === 'Enter' || e.key === 'Select' || e.key === 'Ok' || e.key === 'OK' || e.keyCode === 13 || e.keyCode === 23;
    if (isOkKey) {
      if (!timerRef.current && !isLongPress.current) {
        start();
      }
    }
  }, [start, enabled]);

  const onKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (!enabled) return;
    const isOkKey = e.key === 'Enter' || e.key === 'Select' || e.key === 'Ok' || e.key === 'OK' || e.keyCode === 13 || e.keyCode === 23;
    if (isOkKey) {
      stop();
    }
  }, [stop, enabled]);

  return {
    onMouseDown: (e: React.MouseEvent) => start(e.clientX, e.clientY),
    onMouseMove: handleMouseMove,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        start(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    onTouchMove: handleTouchMove,
    onTouchEnd: stop,
    onTouchCancel: stop,
    onKeyDown,
    onKeyUp,
    onContextMenu: (e: React.MouseEvent) => {
      if (enabled) {
        e.preventDefault();
        e.stopPropagation();
        callback();
      }
    },
    onClick
  };
};

const CategoryButton = React.memo(({ cat, catIdx, isSelected, onSelect, onReorder, categories }: any) => {
  const longPress = useLongPress(() => {
    if (onReorder) {
      const realIdx = categories.findIndex((c: any) => c.category_id === cat.category_id);
      onReorder({ type: 'category', id: cat.category_id, index: realIdx !== -1 ? realIdx : catIdx, name: cat.category_name });
    }
  }, 450, !!onReorder);

  return (
    <div
      role="button"
      tabIndex={0}
      data-tv-focusable="true"
      data-tv-pane="categories"
      data-index={catIdx + 1}
      {...longPress}
      onClick={() => onSelect(cat.category_id)}
      className={`w-full flex items-center justify-between px-3.5 py-3 sm:py-3.5 text-xs sm:text-sm md:text-base font-black transition-colors border-b border-white/5 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset focus:bg-gold/30 focus:shadow-[0_0_15px_rgba(212,175,55,0.4)] ${
        isSelected
          ? 'bg-white/10 text-gold border-l-4 border-l-gold'
          : 'text-zinc-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className="truncate pr-1 text-xs sm:text-sm md:text-base font-black leading-snug">{cat.category_name}</span>
      {cat.count > 0 && (
        <span className="text-[10px] sm:text-xs font-mono font-bold text-zinc-400 bg-white/10 px-2 py-0.5 rounded-full shrink-0">{cat.count}</span>
      )}
    </div>
  );
});



const getAspectRatioClass = (ratio: string) => {
  if (ratio === '16:9') return 'w-full h-full object-contain aspect-video bg-black mx-auto';
  if (ratio === '4:3') return 'w-[82%] h-full object-contain aspect-[4/3] bg-black mx-auto';
  if (ratio === 'fill') return 'w-full h-full object-cover bg-black';
  return 'w-full h-full object-contain bg-black';
};




interface LivePlayerProps {
  onBack: () => void;
  settings: AppSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  userId: string;
  initialType?: 'live' | 'movie' | 'series' | 'favorites';
}

export interface ParsedChannel {
  stream_id: string;
  name: string;
  stream_icon?: string;
  logo?: string;
  cover?: string;
  url: string;
  category_id: string;
  category_name?: string;
  category?: string;
  container_extension?: string;
  season?: number;
  episode?: number;
  type?: 'live' | 'movie' | 'series';
}


export interface ParsedCategory {
  category_id: string;
  category_name: string;
  count?: number;
}

export function detectGenre(channelName: string, categoryName: string = ''): string {
  const text = (channelName + ' ' + categoryName).toLowerCase();
  if (/sport|bein|ssc|kora|foot|espn|eurosport|رياض/i.test(text)) return 'sports';
  if (/news|jazeera|arabiya|bbc|cnn|sky news|أخبار|الجزيرة|العربية/i.test(text)) return 'news';
  if (/movie|cinema|film|action|hbo|mbc2|mbc max|أفلام|سينما|أكشن/i.test(text)) return 'movies';
  if (/series|drama|mbc drama|مسلسل|دراما/i.test(text)) return 'series';
  if (/kid|cartoon|disney|spacetoon|cn|أطفال|كرتون|سبيستون/i.test(text)) return 'kids';
  if (/quran|sunnah|islam|قرآن|سنة|إسلام/i.test(text)) return 'religious';
  if (/music|rotana|mtv|موسيقى|اغاني/i.test(text)) return 'music';
  if (/doc|nat geo|discovery|history|وثائقي/i.test(text)) return 'documentary';
  return 'general';
}

export function isMovieItem(name: string, group: string = '', url: string = ''): boolean {
  const text = (name + ' ' + group + ' ' + url).toLowerCase();
  return text.includes('.mp4') || text.includes('.mkv') || text.includes('.avi') || text.includes('.mov') || text.includes('.m4v') ||
         text.includes('movie') || text.includes('film') || text.includes('vod') || text.includes('cinema') ||
         text.includes('netflix') || text.includes('shahed') || text.includes('osn') || text.includes('boxoffice') ||
         text.includes('أفلام') || text.includes('افلام') || text.includes('الأفلام') || text.includes('الافلام') ||
         text.includes('سينما') || text.includes('السينما') || text.includes('فيلم') || text.includes('الفيلم') ||
         text.includes('مترجم') || text.includes('مدبلج') || text.includes('شاهد') || text.includes('نتفليكس');
}

export function isSeriesItem(name: string, group: string = '', url: string = ''): boolean {
  const text = (name + ' ' + group + ' ' + url).toLowerCase();
  return text.includes('series') || text.includes('serie') || text.includes('مسلسل') || text.includes('المسلسل') ||
         text.includes('مسلسلات') || text.includes('المسلسلات') || text.includes('دراما') || text.includes('drama') ||
         text.includes('s0') || text.includes('s1') || text.includes('s2') || text.includes('s3') || text.includes('s4') || text.includes('s5') ||
         text.includes('season') || text.includes('episode') || text.includes('حلقة') || text.includes('حلقات') ||
         text.includes('موسم') || text.includes('مواسم') || text.includes('انمي') || text.includes('anime');
}





export default function LivePlayer({ onBack, settings, onUpdateSettings, userId, initialType = 'live' }: LivePlayerProps) {

  const { t, isRtl } = useI18n(settings.language);
  const playlistId = settings.activePlaylistId || 'default';

  const launchExternalPlayer = (url: string) => {
    const player = settings.selectedPlayer || '';
    const packageName = getPlayerPackage(player);
    
    // Resolve proxy URL if necessary (especially for Xtream/Authenticated streams)
    let finalUrl = url;
    if (activePlaylist?.type === 'xtream' || url.includes('/live/') || url.includes('/movie/')) {
       finalUrl = `/api/proxy/stream?url=${encodeURIComponent(url)}&vpnRegion=${encodeURIComponent(settings.vpnRegion || 'auto')}`;
       // If running in a web context, we need the full absolute URL
       if (finalUrl.startsWith('/')) {
         finalUrl = window.location.origin + finalUrl;
       }
    }

    // MEDIA3 NATIVE BRIDGE INTEGRATION (Android APK Wrapper)
    const native = (window as any).AchourNative;
    if (native && typeof native.playMedia === 'function') {
      try {
        const isFav = favorites.includes(selectedChannel?.stream_id || '');
        native.playMedia(finalUrl, JSON.stringify({
          title: selectedChannel?.name || 'Achour TV',
          logo: selectedChannel?.stream_icon || '',
          stream_id: selectedChannel?.stream_id || '',
          type: mediaType,
          isFavorite: isFav,
          packageName: packageName || undefined,
          headers: {
            'User-Agent': 'Android/Media3/1.1.1',
            'X-Requested-With': 'com.nathnetwork.iptvsmarters'
          }
        }));
        return;
      } catch (e) {
        console.warn('Media3 Bridge Call Failed, falling back to Intent:', e);
      }
    }

    // Safe Android Intent launch
    try {
      const intentUrl = packageName
        ? `intent:${encodeURI(finalUrl)}#Intent;action=android.intent.action.VIEW;type=video/*;package=${packageName};end`
        : `intent:${encodeURI(finalUrl)}#Intent;action=android.intent.action.VIEW;type=video/*;end`;
        
      window.location.href = intentUrl;
    } catch (e) {
      console.error('External player launch failed:', e);
      alert(isRtl ? 'تعذر تشغيل المشغل الخارجي. يرجى استخدام المشغل الداخلي.' : 'Could not launch external player. Please use the internal player.');
    }
  };


  const [mediaType, setMediaType] = useState<'live' | 'movie' | 'series' | 'favorites'>(initialType as any);
  const [categories, setCategories] = useState<ParsedCategory[]>([]);
  const [channels, setChannels] = useState<ParsedChannel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<ParsedChannel | null>(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'none' | 'az'>('none');
  const [loading, setLoading] = useState(true);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  
  // Load categories and initial data from DB
  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      setSelectedCategory('');
      setChannels([]);
      const playlistId = settings.activePlaylistId || 'default';
      const typeToLoad = mediaType === 'favorites' ? 'live' : mediaType;
      try {
        const cachedCats = await getCategoriesByPlaylistAndType(playlistId, typeToLoad as any);
        if (cachedCats.length > 0) {
          const formattedCats = cachedCats.map((c: any) => ({
            category_id: String(c.category_id || c.id || ''),
            category_name: String(c.category_name || c.name || ''),
            count: c.count || 0
          }));
          setCategories(formattedCats);
          if (formattedCats.length > 0) {
            setSelectedCategory(formattedCats[0].category_id);
          }
        } else {
          const cachedChannels = await getChannelsByPlaylistAndType(playlistId, typeToLoad as any);
          if (cachedChannels.length > 0) {
            const catMap = new Map<string, ParsedCategory>();
            cachedChannels.forEach(ch => {
              const catName = ch.category_name || ch.category || 'General';
              if (!catMap.has(catName)) {
                catMap.set(catName, { category_id: catName, category_name: catName, count: 0 });
              }
              catMap.get(catName)!.count!++;
            });
            const extracted = Array.from(catMap.values());
            setCategories(extracted);
            if (extracted.length > 0) {
              setSelectedCategory(extracted[0].category_id);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load categories:', e);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, [mediaType]);

  // Lazy load channels for the selected category
  useEffect(() => {
    if (!selectedCategory) return;
    
    let isMounted = true;
    const loadChannels = async () => {
      try {
        const rawCategoryChannels = await getChannelsByCategory(mediaType, selectedCategory, playlistId);
        if (!isMounted) return;
        const categoryChannels = (rawCategoryChannels || []).map((ch: any) => ({
          ...ch,
          stream_icon: ch.stream_icon || ch.logo || ch.cover || '',
          logo: ch.logo || ch.stream_icon || ch.cover || ''
        }));
        setChannels(categoryChannels);
      } catch (e) {
        console.error('Failed to load category channels:', e);
      }
    };
    loadChannels();
    return () => { isMounted = false; };
  }, [selectedCategory, mediaType, playlistId]);

  const [streamingHost, setStreamingHost] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showOcr, setShowOcr] = useState(false);
  const [showRemoteHelp, setShowRemoteHelp] = useState(false);
  const [showOverlayChannelDrawer, setShowOverlayChannelDrawer] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeVodPlayer, setActiveVodPlayer] = useState<ParsedChannel | null>(null);
  const [showEpgGrid, setShowEpgGrid] = useState(false);
  
  const [itemsToShow, setItemsToShow] = useState(100);
  const [movieDetailsModal, setMovieDetailsModal] = useState<ParsedChannel | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // D-Pad TV Remote Control Navigation States & Preview Refs
  const tvFocusedPane = useRef<'categories' | 'channels' | 'header' | 'player' | 'player-controls'>('categories');
  const tvFocusedCatIndex = useRef<number>(0);
  const tvFocusedChannelIndex = useRef<number>(0);
  const tvFocusedControlIndex = useRef<number>(0);

  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const categoryNavDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const currentHighlightedChannelRef = useRef<string | null>(null);
  const filteredChannelsRef = useRef<ParsedChannel[]>([]);
  const handleHighlightChannelRef = useRef<(ch: ParsedChannel) => void>(() => {});
  const handleOpenFullscreenRef = useRef<(ch: ParsedChannel) => void>(() => {});
  const handleChannelClickRef = useRef<(ch: ParsedChannel) => void>(() => {});
  const toggleFullscreenRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
      if (categoryNavDebounceRef.current) {
        clearTimeout(categoryNavDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const restoreLastChannel = async () => {
      // Do not auto-select or auto-play channel on Live TV initial load so user can browse categories/channels first
      if (mediaType !== 'live' && channels.length > 0 && !selectedChannel) {
        try {
          const lastId = localStorage.getItem('achour_last_stream_id');
          if (lastId) {
            const lastCh = channels.find(c => c.stream_id === lastId);
            if (lastCh) {
              setSelectedChannel(lastCh);
            }
          }
        } catch (e) {}
      }
    };
    if (!loading) restoreLastChannel();
  }, [loading, channels, selectedChannel, mediaType]);

  // Register pushBackHandler in LivePlayer so remote & phone Back button navigates back cleanly


  useEffect(() => {
    setItemsToShow(100);
  }, [selectedCategory, search, mediaType]);

  // Auto-focus "Play Now" button when Movie/Series details modal opens
  useEffect(() => {
    if (movieDetailsModal) {
      const timer = setTimeout(() => {
        const playBtn = document.querySelector<HTMLElement>('[data-tv-play-now="true"]');
        if (playBtn) {
          playBtn.focus();
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [movieDetailsModal]);



  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      setItemsToShow(prev => prev + 100);
    }
  }, []);

  const [mediaDetailInfo, setMediaDetailInfo] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activePlayingMovie, setActivePlayingMovie] = useState<ParsedChannel | null>(null);
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(1);

  const seriesSeasonsData = useMemo(() => {
    const targetMedia = movieDetailsModal || activeVodPlayer;
    if (mediaType !== 'series' || !targetMedia) return [];

    let epMap: Record<string, any[]> = {};
    if (mediaDetailInfo?.episodes) {
      if (Array.isArray(mediaDetailInfo.episodes)) {
        mediaDetailInfo.episodes.forEach((ep: any) => {
          const sNum = String(ep.season || ep.season_num || 1);
          if (!epMap[sNum]) epMap[sNum] = [];
          epMap[sNum].push(ep);
        });
      } else if (typeof mediaDetailInfo.episodes === 'object') {
        epMap = mediaDetailInfo.episodes;
      }
    }

    const keys = Object.keys(epMap).map(k => parseInt(k, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    if (keys.length > 0) {
      return keys.map(seasonNum => {
        const rawEps = epMap[String(seasonNum)] || [];
        const episodesList = rawEps.map((ep: any, idx: number) => {
          const epNum = ep.episode_num || ep.episode || idx + 1;
          const rawStreamId = String(ep.id || ep.stream_id || `${targetMedia.stream_id}-s${seasonNum}-e${epNum}`);
          const cleanStreamId = rawStreamId.replace(/\.(mp4|mkv|avi|mov|webm|ts|m3u8)$/i, '');
          const ext = ep.container_extension || targetMedia.container_extension || 'mp4';
          
          let epDirectUrl = ep.stream_url || ep.url || targetMedia.url;
          if (activePlaylist?.type === 'xtream' && activePlaylist.username && activePlaylist.password) {
            const baseHost = streamingHost || (activePlaylist.url || '').trim().replace(/\/+$/, '').replace(/\/(player_api|get|index)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\?.*$/, '');
            epDirectUrl = `${baseHost}/series/${activePlaylist.username}/${activePlaylist.password}/${cleanStreamId}.${ext}`;
          }

          return {
            stream_id: cleanStreamId,
            name: `${targetMedia.name} - S${seasonNum} E${epNum}: ${ep.title || ep.name || (isRtl ? `الحلقة ${epNum}` : `Episode ${epNum}`)}`,
            stream_icon: ep.info?.movie_image || ep.info?.cover_big || targetMedia.stream_icon,
            url: epDirectUrl,
            category_id: targetMedia.category_id,
            category_name: targetMedia.category_name,
            container_extension: ext,
            season: seasonNum,
            episode: epNum
          };
        });

        return {
          seasonNumber: seasonNum,
          title: isRtl ? `الموسم ${seasonNum}` : `Season ${seasonNum}`,
          episodes: episodesList
        };
      });
    }

    return [];
  }, [mediaType, movieDetailsModal, activeVodPlayer, mediaDetailInfo, activePlaylist, streamingHost, isRtl]);

  const parsedSubscription = useMemo(() => {
    if (!activePlaylist || !activePlaylist.expDate) return null;
    return parseExpiryDate(activePlaylist.expDate, isRtl);
  }, [activePlaylist?.expDate, isRtl]);

  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedQuality, setSelectedQuality] = useState<string>('4K Ultra HD');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | 'fill' | 'fit'>('16:9');
  
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState('Audio 1 (الأساسي - Primary)');
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState('Off (مغلق)');
  const [subtitleActive, setSubtitleActive] = useState<boolean>(false);





  const handleNextChannel = useCallback(() => {
    if (!channels || channels.length === 0) return;
    const curIndex = channels.findIndex(c => c.stream_id === selectedChannel?.stream_id);
    const nextIndex = curIndex >= 0 ? (curIndex + 1) % channels.length : 0;
    const nextCh = channels[nextIndex];
    setSelectedChannel(nextCh);
    setActivePlayingMovie(nextCh);
    addToRecents(nextCh);
  }, [channels, selectedChannel]);

  const handlePrevChannel = useCallback(() => {
    if (!channels || channels.length === 0) return;
    const curIndex = channels.findIndex(c => c.stream_id === selectedChannel?.stream_id);
    const prevIndex = curIndex > 0 ? curIndex - 1 : channels.length - 1;
    const prevCh = channels[prevIndex];
    setSelectedChannel(prevCh);
    setActivePlayingMovie(prevCh);
    addToRecents(prevCh);
  }, [channels, selectedChannel]);



  const [showControls, setShowControls] = useState<boolean>(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerControlsVisibility = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showAudioMenu && !showSubMenu && !showQualityMenu && !movieDetailsModal) {
        setShowControls(false);
      }
    }, isFullscreen ? 8000 : 5000);
  }, [showAudioMenu, showSubMenu, showQualityMenu, movieDetailsModal, isFullscreen]);

  const toggleControlsVisibility = useCallback(() => {
    setShowControls(prev => {
      const next = !prev;
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (next) {
        controlsTimeoutRef.current = setTimeout(() => {
          if (!showAudioMenu && !showSubMenu && !showQualityMenu && !movieDetailsModal) {
            setShowControls(false);
          }
        }, isFullscreen ? 8000 : 5000);
      }
      return next;
    });
  }, [showAudioMenu, showSubMenu, showQualityMenu, movieDetailsModal, isFullscreen]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (showAudioMenu || showSubMenu || showQualityMenu) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [showAudioMenu, showSubMenu, showQualityMenu]);

  const [showEpgTimeline, setShowEpgTimeline] = useState(false);

  useEffect(() => {
    const hasActiveModal = !!(showOcr || showPinModal || showRemoteHelp || showOverlayChannelDrawer || movieDetailsModal || showEpgGrid || showEpgTimeline || showAudioMenu || showSubMenu || showQualityMenu || isFullscreen || activeVodPlayer);
    const priority = hasActiveModal ? BackPriority.MODAL : BackPriority.VIEW;

    const unregister = pushBackHandler(() => {
      if (showOcr) { setShowOcr(false); return true; }
      if (showPinModal) { setShowPinModal(false); return true; }
      if (showRemoteHelp) { setShowRemoteHelp(false); return true; }
      if (showOverlayChannelDrawer) { setShowOverlayChannelDrawer(false); return true; }
      if (movieDetailsModal) { setMovieDetailsModal(null); return true; }
      if (showEpgGrid) { setShowEpgGrid(false); return true; }
      if (showEpgTimeline) { setShowEpgTimeline(false); return true; }
      if (showAudioMenu || showSubMenu || showQualityMenu) {
        setShowAudioMenu(false); setShowSubMenu(false); setShowQualityMenu(false);
        return true;
      }

      // 1. Back from full-screen playback returns to the 3-column layout
      if (isFullscreen) {
        if (toggleFullscreenRef.current) toggleFullscreenRef.current();
        else setIsFullscreen(false);
        return true;
      }

      if (activeVodPlayer) {
        setActiveVodPlayer(null);
        return true;
      }

      // 2. Back from player pane returns focus to channels list
      if (tvFocusedPane.current === 'player') {
        tvFocusedPane.current = 'channels';
        const chEl = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${tvFocusedChannelIndex.current}"]`) ||
                     document.querySelector<HTMLElement>('[data-tv-pane="channels"]');
        chEl?.focus();
        return true;
      }

      // 3. Back from channel list moves focus to categories list
      if (tvFocusedPane.current === 'channels') {
        tvFocusedPane.current = 'categories';
        const catButtons = document.querySelectorAll<HTMLElement>('[data-tv-pane="categories"]');
        catButtons[tvFocusedCatIndex.current]?.focus();
        return true;
      }

      // 4. Back from categories list returns to the dashboard
      onBack();
      return true;
    }, priority);

    return unregister;
  }, [
    showOcr, showPinModal, showRemoteHelp, showOverlayChannelDrawer,
    movieDetailsModal, showEpgGrid, showEpgTimeline, showAudioMenu,
    showSubMenu, showQualityMenu, isFullscreen, activeVodPlayer, onBack
  ]);

  const [epgData, setEpgData] = useState<any[]>([]);
  const [epgLoading, setEpgLoading] = useState(false);
  const [xmltvData, setXmltvData] = useState<Record<string, any[]>>({});

  const parseXMLTV = (xmlText: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const programs = xmlDoc.getElementsByTagName("programme");
      const epgMap: Record<string, any[]> = {};

      for (let i = 0; i < programs.length; i++) {
        const prog = programs[i];
        const channelId = prog.getAttribute("channel");
        if (!channelId) continue;

        const title = prog.getElementsByTagName("title")[0]?.textContent || (isRtl ? "بدون عنوان" : "No Title");
        const desc = prog.getElementsByTagName("desc")[0]?.textContent || "";
        const start = prog.getAttribute("start");
        const stop = prog.getAttribute("stop");

        if (!start || !stop) continue;

        const parseXmlTime = (timeStr: string) => {
          const y = parseInt(timeStr.substring(0, 4));
          const m = parseInt(timeStr.substring(4, 6)) - 1;
          const d = parseInt(timeStr.substring(6, 8));
          const h = parseInt(timeStr.substring(8, 10));
          const min = parseInt(timeStr.substring(10, 12));
          const s = parseInt(timeStr.substring(12, 14));
          return new Date(y, m, d, h, min, s);
        };

        const startTime = parseXmlTime(start);
        const stopTime = parseXmlTime(stop);

        if (!epgMap[channelId]) epgMap[channelId] = [];
        epgMap[channelId].push({
          title,
          description: desc,
          start: startTime,
          stop: stopTime,
          timeRange: `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')} - ${stopTime.getHours()}:${String(stopTime.getMinutes()).padStart(2, '0')}`
        });
      }

      Object.keys(epgMap).forEach(cid => {
        epgMap[cid].sort((a, b) => a.start.getTime() - b.start.getTime());
      });

      setXmltvData(epgMap);
    } catch (err) {}
  };

  const fetchEPG = async (streamId: string) => {
    if (activePlaylist?.type !== 'xtream') return;
    setEpgLoading(true);
    try {
      const host = (activePlaylist.url || '').trim().replace(/\/+$/, '').replace(/\/(player_api|get|index)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\?.*$/, '');
      const res = await xtreamFetch(host, activePlaylist.username || '', activePlaylist.password || '', 'get_short_epg', { stream_id: streamId });
      if (res.ok && res.data?.epg_listings) setEpgData(res.data.epg_listings);
      else setEpgData([]);
    } catch (e) {
      setEpgData([]);
    } finally {
      setEpgLoading(false);
    }
  };

  useEffect(() => {
    const loadGlobalEPG = async () => {
      let epgUrlToUse = activePlaylist?.epgUrl;
      if (!epgUrlToUse && activePlaylist?.type === 'xtream') {
        const rawHost = activePlaylist.url || activePlaylist.portal || '';
        let cleanHost = rawHost.trim().replace(/\/+$/, '').replace(/\/(player_api|get|index)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\?.*$/, '').replace(/\/+$/, '');
        if (cleanHost && !cleanHost.startsWith('http')) cleanHost = 'http://' + cleanHost;
        if (cleanHost && activePlaylist.username && activePlaylist.password) {
          epgUrlToUse = `${cleanHost}/xmltv.php?username=${encodeURIComponent(activePlaylist.username)}&password=${encodeURIComponent(activePlaylist.password)}`;
        }
      }

      if (!epgUrlToUse) {
        setXmltvData({});
        return;
      }

      try {
        const fetchUrl = getPlatformUrl('epg', epgUrlToUse);
        const res = await axios.get(fetchUrl);
        if (typeof res.data === 'string') parseXMLTV(res.data);
      } catch (err) {
        console.warn('Global EPG fetch error:', err);
      }
    };
    loadGlobalEPG();
  }, [activePlaylist]);

  useEffect(() => {
    if (showEpgTimeline && selectedChannel) {
      const cid = selectedChannel.stream_id;
      const epgId = (selectedChannel as any).epg_channel_id || (selectedChannel as any).tvg_id;
      const foundInXml = xmltvData[cid] || (epgId ? xmltvData[epgId] : null) || xmltvData[selectedChannel.name];
      if (foundInXml) {
        setEpgData(foundInXml.map(p => ({
          title: p.title,
          start: p.start.toISOString(),
          end: p.stop.toISOString(),
          description: p.description
        })));
      } else {
        fetchEPG(selectedChannel.stream_id);
      }
    }
  }, [showEpgTimeline, selectedChannel, xmltvData]);

  const findProgramsForChannel = (channel: ParsedChannel | null) => {
    if (!channel) return null;
    const cid = channel.stream_id;
    const epgId = (channel as any).epg_channel_id || (channel as any).tvg_id;
    const cleanName = channel.name ? channel.name.replace(/\|AR\||\|EN\||HD|FHD|4K|RAW|SD|HEVC|\+|:-/gi, '').trim() : '';

    return (
      xmltvData[cid] ||
      (epgId ? xmltvData[epgId] : null) ||
      xmltvData[channel.name] ||
      (cleanName ? xmltvData[cleanName] : null) ||
      null
    );
  };

  const getCurrentProgram = (channel: ParsedChannel | null) => {
    const programs = findProgramsForChannel(channel);
    if (!programs) return null;
    const now = new Date();
    return programs.find(p => p.start <= now && p.stop >= now);
  };

  const getNextProgram = (channel: ParsedChannel | null) => {
    const programs = findProgramsForChannel(channel);
    if (!programs) return null;
    const now = new Date();
    return programs.find(p => p.start > now);
  };

  const [reorderTarget, setReorderTarget] = useState<{ type: 'category' | 'channel', id: string, index: number, name: string } | null>(null);
  const [targetPosInput, setTargetPosInput] = useState('');
  const prevReorderTargetIdRef = useRef<string | null>(null);

  // Auto-focus move-up button when Reorder / Context Action modal opens (only when opening a new modal)
  useEffect(() => {
    if (reorderTarget) {
      if (prevReorderTargetIdRef.current !== reorderTarget.id) {
        prevReorderTargetIdRef.current = reorderTarget.id;
        const timer = setTimeout(() => {
          const firstMoveUpBtn = document.querySelector<HTMLElement>('[data-tv-modal="reorder"][data-tv-move-up="true"]') ||
                                 document.querySelector<HTMLElement>('[data-tv-modal="reorder"]');
          if (firstMoveUpBtn) {
            firstMoveUpBtn.focus();
          }
        }, 60);
        return () => clearTimeout(timer);
      }
    } else {
      prevReorderTargetIdRef.current = null;
    }
  }, [reorderTarget]);

  const [favorites, setFavorites] = useState<string[]>(() => getLocalFavoriteIds());

  // TV Remote OK Button Long-Press Detection Refs
  const okPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const okLongPressFiredRef = useRef<boolean>(false);
  const okPressedChannelRef = useRef<ParsedChannel | null>(null);
  const okPressedIndexRef = useRef<number>(0);
  const lastDpadKeyTimeRef = useRef<number>(0);

  // 2-Pane D-Pad TV Remote Control Navigation Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const code = e.keyCode;

      const now = Date.now();
      if (now - lastDpadKeyTimeRef.current < 55) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key) || (code >= 37 && code <= 40)) {
          e.preventDefault();
          return;
        }
      }
      lastDpadKeyTimeRef.current = now;

      const isBackKey = key === 'Escape' || key === 'Backspace' || key === 'GoBack' || key === 'Back' ||
                        code === 10009 || code === 461 || code === 27 || code === 8;

      // Don't intercept typing in search / text inputs: only blur on real escape / back keys, NEVER on Backspace!
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        const isTrueEscape = key === 'Escape' || key === 'GoBack' || code === 10009 || code === 461 || code === 27;
        const isNavKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key) || (code >= 37 && code <= 40);
        
        if (isTrueEscape) {
          (document.activeElement as HTMLElement).blur();
          e.preventDefault();
          return;
        }
        
        // If it's a navigation key, we allow the rest of the function to handle it
        if (!isNavKey) {
          return;
        }
      }

      // Handle Back button on TV Remote for any open modals / overlays
      if (isBackKey) {
        e.preventDefault();
        if (movieDetailsModal) { setMovieDetailsModal(null); return; }
        if (activeVodPlayer) { setActiveVodPlayer(null); return; }
        if (reorderTarget) { setReorderTarget(null); return; }
        if (showEpgGrid) { setShowEpgGrid(false); return; }
        if (showEpgTimeline) { setShowEpgTimeline(false); return; }
        if (showAudioMenu || showSubMenu || showQualityMenu) {
          setShowAudioMenu(false); setShowSubMenu(false); setShowQualityMenu(false);
          return;
        }
        if (isFullscreen) { toggleFullscreenRef.current(); return; }
        if (showPinModal) { onBack(); return; }
        
        if (tvFocusedPane.current === 'player') {
          tvFocusedPane.current = 'channels';
          const chEl = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${tvFocusedChannelIndex.current}"]`) ||
                       document.querySelector<HTMLElement>('[data-tv-pane="channels"]');
          chEl?.focus();
          return;
        }

        if (tvFocusedPane.current === 'channels') {
          tvFocusedPane.current = 'categories';
          const cats = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-pane="categories"]'));
          cats[tvFocusedCatIndex.current]?.focus();
          return;
        }
        
        onBack();
        return;
      }

      // Yellow key / F3 / Menu / ContextMenu / 'm' / 'r' shortcut to open reorder modal on focused category or channel
      const isReorderShortcut = key === 'F3' || key === 'Yellow' || code === 114 || code === 405 ||
                                key === 'm' || key === 'M' || key === 'r' || key === 'Menu' || code === 82 ||
                                key === 'ContextMenu' || key === 'Guide' || code === 457;
      if (isReorderShortcut && !reorderTarget && !movieDetailsModal) {
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl) {
          const isCat = activeEl.getAttribute('data-tv-pane') === 'categories';
          const isCh = activeEl.getAttribute('data-tv-pane') === 'channels';
          if (isCat) {
            e.preventDefault();
            const catId = categories[tvFocusedCatIndex.current]?.category_id;
            const catName = categories[tvFocusedCatIndex.current]?.category_name;
            if (catId) {
              setReorderTarget({ type: 'category', id: catId, index: tvFocusedCatIndex.current, name: catName || 'Category' });
              setTargetPosInput(String(tvFocusedCatIndex.current + 1));
              return;
            }
          } else if (isCh) {
            e.preventDefault();
            const curList = filteredChannelsRef.current && filteredChannelsRef.current.length > 0 ? filteredChannelsRef.current : filteredChannels;
            const ch = curList[tvFocusedChannelIndex.current];
            if (ch) {
              setReorderTarget({ type: 'channel', id: ch.stream_id, index: tvFocusedChannelIndex.current, name: ch.name });
              setTargetPosInput(String(tvFocusedChannelIndex.current + 1));
              return;
            }
          }
        }
      }

      // If Movie/Series Details Modal is open, handle D-Pad navigation inside the modal
      if (movieDetailsModal) {
        const modalFocusables = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-modal="details"]'));
        if (modalFocusables.length > 0) {
          const currentEl = document.activeElement as HTMLElement;
          const activeIndex = modalFocusables.findIndex(el => el === currentEl);
          let current = activeIndex >= 0 ? activeIndex : 0;

          const isSeasonTab = currentEl?.hasAttribute('data-season-tab');
          const isEpisodeItem = currentEl?.hasAttribute('data-episode-item');

          if (key === 'ArrowDown' || code === 40) {
            e.preventDefault();
            if (isSeasonTab) {
              const firstEp = modalFocusables.find(el => el.hasAttribute('data-episode-item'));
              if (firstEp) {
                firstEp.focus();
                firstEp.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                return;
              }
            }
            const next = Math.min(modalFocusables.length - 1, current + 1);
            modalFocusables[next]?.focus();
            modalFocusables[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          } else if (key === 'ArrowUp' || code === 38) {
            e.preventDefault();
            if (isEpisodeItem && currentEl === modalFocusables.find(el => el.hasAttribute('data-episode-item'))) {
              const activeSeason = modalFocusables.find(el => el.hasAttribute('data-season-tab') && el.classList.contains('bg-gold'));
              const anySeason = modalFocusables.find(el => el.hasAttribute('data-season-tab'));
              const targetSeason = activeSeason || anySeason;
              if (targetSeason) {
                targetSeason.focus();
                targetSeason.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                return;
              }
            }
            const next = Math.max(0, current - 1);
            modalFocusables[next]?.focus();
            modalFocusables[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          } else if (key === 'ArrowRight' || code === 39) {
            e.preventDefault();
            if (isSeasonTab) {
              const seasonTabs = modalFocusables.filter(el => el.hasAttribute('data-season-tab'));
              const sIdx = seasonTabs.indexOf(currentEl);
              const nextSIdx = isRtl ? Math.max(0, sIdx - 1) : Math.min(seasonTabs.length - 1, sIdx + 1);
              seasonTabs[nextSIdx]?.focus();
              seasonTabs[nextSIdx]?.click();
              return;
            }
            const step = isRtl ? -1 : 1;
            const next = Math.max(0, Math.min(modalFocusables.length - 1, current + step));
            modalFocusables[next]?.focus();
          } else if (key === 'ArrowLeft' || code === 37) {
            e.preventDefault();
            if (isSeasonTab) {
              const seasonTabs = modalFocusables.filter(el => el.hasAttribute('data-season-tab'));
              const sIdx = seasonTabs.indexOf(currentEl);
              const nextSIdx = isRtl ? Math.min(seasonTabs.length - 1, sIdx + 1) : Math.max(0, sIdx - 1);
              seasonTabs[nextSIdx]?.focus();
              seasonTabs[nextSIdx]?.click();
              return;
            }
            const step = isRtl ? 1 : -1;
            const next = Math.max(0, Math.min(modalFocusables.length - 1, current + step));
            modalFocusables[next]?.focus();
          } else if (key === 'Enter' || code === 13 || key === 'Select' || code === 23) {
            e.preventDefault();
            modalFocusables[current]?.click();
          }
        }
        return;
      }

      // If Position Reorder / Context Actions Modal is open, handle D-Pad navigation and direct numpad input inside the modal
      if (reorderTarget) {
        const isDigit = (key >= '0' && key <= '9') || (code >= 48 && code <= 57) || (code >= 96 && code <= 105);
        const isErase = key === 'Backspace' || code === 8 || key === 'Delete' || code === 46;
        const isInputActive = document.activeElement && document.activeElement.tagName === 'INPUT';

        if (isDigit && !isInputActive) {
          e.preventDefault();
          const digit = (key >= '0' && key <= '9') ? key : String(code >= 96 ? code - 96 : code - 48);
          setTargetPosInput(prev => {
            if (!prev || prev === '0') return digit;
            if (prev.length >= 5) return prev;
            return prev + digit;
          });
          return;
        }

        if (isErase && !isInputActive) {
          e.preventDefault();
          setTargetPosInput(prev => (prev.length > 0 ? prev.slice(0, -1) : ''));
          return;
        }

        const modalBtns = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-modal="reorder"]'));
        if (modalBtns.length > 0) {
          const currentEl = document.activeElement as HTMLElement;
          const activeIdx = modalBtns.indexOf(currentEl);
          let cur = activeIdx >= 0 ? activeIdx : 0;

          if (key === 'ArrowDown' || code === 40) {
            e.preventDefault();
            const next = Math.min(modalBtns.length - 1, cur + 1);
            modalBtns[next]?.focus();
          } else if (key === 'ArrowUp' || code === 38) {
            e.preventDefault();
            const next = Math.max(0, cur - 1);
            modalBtns[next]?.focus();
          } else if (key === 'ArrowRight' || code === 39) {
            e.preventDefault();
            const next = isRtl ? Math.max(0, cur - 1) : Math.min(modalBtns.length - 1, cur + 1);
            modalBtns[next]?.focus();
          } else if (key === 'ArrowLeft' || code === 37) {
            e.preventDefault();
            const next = isRtl ? Math.min(modalBtns.length - 1, cur + 1) : Math.max(0, cur - 1);
            modalBtns[next]?.focus();
          } else if (key === 'Enter' || code === 13 || key === 'Select' || code === 23) {
            e.preventDefault();
            if (isInputActive) {
              moveItemToPosition(reorderTarget.type, reorderTarget.id, parseInt(targetPosInput, 10) || 1, true);
            } else {
              modalBtns[cur]?.click();
            }
          }
        }
        return;
      }

      // In Fullscreen mode, VodPlayerModal directly handles all D-pad navigation and control bar interactions
      if (isFullscreen) {
        return;
      }

      if (tvFocusedPane.current === 'header') {
        const headerTabs = document.querySelectorAll<HTMLElement>('[data-tv-pane="header"]');
        if (headerTabs.length > 0) {
          const currentActive = document.activeElement as HTMLElement;
          let cur = -1;
          for (let i = 0; i < headerTabs.length; i++) {
             if (headerTabs[i] === currentActive) { cur = i; break; }
          }
          if (cur === -1) cur = 0;

          if (key === 'ArrowDown' || code === 40) {
            e.preventDefault();
            const chItems = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-pane="channels"]')).filter(el => el.offsetWidth > 0);
            if (chItems.length > 0) {
              tvFocusedPane.current = 'channels';
              tvFocusedChannelIndex.current = 0;
              chItems[0].focus();
              chItems[0].scrollIntoView({ block: 'nearest', inline: 'nearest' });
            } else {
              tvFocusedPane.current = 'categories';
              const catButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-pane="categories"]')).filter(el => el.offsetWidth > 0);
              if (catButtons.length > 0) {
                tvFocusedCatIndex.current = 0;
                catButtons[0].focus();
                catButtons[0].scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }
            }
          } else if (key === 'ArrowRight' || code === 39) {
            e.preventDefault();
            const next = isRtl ? Math.max(0, cur - 1) : Math.min(headerTabs.length - 1, cur + 1);
            headerTabs[next]?.focus();
          } else if (key === 'ArrowLeft' || code === 37) {
            e.preventDefault();
            const next = isRtl ? Math.min(headerTabs.length - 1, cur + 1) : Math.max(0, cur - 1);
            headerTabs[next]?.focus();
          } else if (key === 'Enter' || code === 13 || key === 'Select' || code === 23) {
            e.preventDefault();
            headerTabs[cur]?.click();
          }
        }
        return;
      }

      if (tvFocusedPane.current === 'categories') {
        const catButtons = document.querySelectorAll<HTMLElement>('[data-tv-pane="categories"]');
        if (catButtons.length === 0) return;

        let cur = tvFocusedCatIndex.current;
        if (cur < 0 || cur >= catButtons.length) cur = 0;

        if (key === 'ArrowDown' || code === 40) {
          e.preventDefault();
          const next = Math.min(catButtons.length - 1, cur + 1);
          tvFocusedCatIndex.current = next;
          catButtons[next]?.focus();
          catButtons[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

          if (categoryNavDebounceRef.current) clearTimeout(categoryNavDebounceRef.current);
          categoryNavDebounceRef.current = setTimeout(() => {
            catButtons[next]?.click();
          }, 150);
        } else if (key === 'ArrowUp' || code === 38) {
          e.preventDefault();
          if (cur === 0) {
            tvFocusedPane.current = 'header';
            const headerTabs = document.querySelectorAll<HTMLElement>('[data-tv-pane="header"]');
            const targetTabIdx = mediaType === 'movie' ? 2 : mediaType === 'series' ? 3 : 1;
            headerTabs[targetTabIdx]?.focus();
          } else {
            const next = cur - 1;
            tvFocusedCatIndex.current = next;
            catButtons[next]?.focus();
            catButtons[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

            if (categoryNavDebounceRef.current) clearTimeout(categoryNavDebounceRef.current);
            categoryNavDebounceRef.current = setTimeout(() => {
              catButtons[next]?.click();
            }, 150);
          }
        } else if ((key === 'ArrowRight' && !isRtl) || (key === 'ArrowLeft' && isRtl) || key === 'Enter' || code === 13 || key === 'Select' || code === 23) {
          e.preventDefault();
          tvFocusedPane.current = 'channels';
          tvFocusedChannelIndex.current = 0;
          setTimeout(() => {
            const chItems = document.querySelectorAll<HTMLElement>('[data-tv-pane="channels"]');
            if (chItems[0]) {
              chItems[0].focus();
              chItems[0].scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
          }, 50);
        }
      } else if (tvFocusedPane.current === 'channels') {
        const channelsList = filteredChannelsRef.current;
        if (!channelsList || channelsList.length === 0) {
          tvFocusedPane.current = 'categories';
          return;
        }

        const isGrid = mediaType === 'movie' || mediaType === 'series';
        const cols = isGrid ? (window.innerWidth < 640 ? 4 : window.innerWidth < 1200 ? 5 : 6) : 1;

        const activeEl = document.activeElement as HTMLElement;
        let curIdx = tvFocusedChannelIndex.current;
        if (activeEl && activeEl.hasAttribute('data-index')) {
          const parsed = parseInt(activeEl.getAttribute('data-index') || '', 10);
          if (!isNaN(parsed)) curIdx = parsed;
        }
        if (curIdx < 0) curIdx = 0;
        if (curIdx >= channelsList.length) curIdx = channelsList.length - 1;

        if (key === 'ArrowDown' || code === 40) {
          e.preventDefault();
          const nextIdx = Math.min(channelsList.length - 1, curIdx + cols);
          tvFocusedChannelIndex.current = nextIdx;

          const listContainer = document.querySelector<HTMLElement>('[data-channel-list-container="true"]');
          if (listContainer) {
            const itemHeight = isGrid ? 190 : 50;
            const targetTop = isGrid ? Math.floor(nextIdx / cols) * itemHeight : nextIdx * itemHeight;
            const viewTop = listContainer.scrollTop;
            const viewBottom = viewTop + listContainer.clientHeight;
            if (targetTop < viewTop) {
              listContainer.scrollTop = targetTop;
            } else if (targetTop + itemHeight > viewBottom) {
              listContainer.scrollTop = targetTop + itemHeight - listContainer.clientHeight;
            }
          }

          const targetEl = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${nextIdx}"]`);
          if (targetEl) {
            targetEl.focus();
          } else {
            requestAnimationFrame(() => {
              const el = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${nextIdx}"]`);
              el?.focus();
            });
          }
        } else if (key === 'ArrowUp' || code === 38) {
          e.preventDefault();
          if (curIdx < cols) {
            tvFocusedPane.current = 'header';
            const headerTabs = document.querySelectorAll<HTMLElement>('[data-tv-pane="header"]');
            const targetTabIdx = mediaType === 'movie' ? 2 : mediaType === 'series' ? 3 : 1;
            headerTabs[targetTabIdx]?.focus();
          } else {
            const nextIdx = Math.max(0, curIdx - cols);
            tvFocusedChannelIndex.current = nextIdx;

            const listContainer = document.querySelector<HTMLElement>('[data-channel-list-container="true"]');
            if (listContainer) {
              const itemHeight = isGrid ? 190 : 50;
              const targetTop = isGrid ? Math.floor(nextIdx / cols) * itemHeight : nextIdx * itemHeight;
              const viewTop = listContainer.scrollTop;
              const viewBottom = viewTop + listContainer.clientHeight;
              if (targetTop < viewTop) {
                listContainer.scrollTop = targetTop;
              } else if (targetTop + itemHeight > viewBottom) {
                listContainer.scrollTop = targetTop + itemHeight - listContainer.clientHeight;
              }
            }

            const targetEl = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${nextIdx}"]`);
            if (targetEl) {
              targetEl.focus();
            } else {
              requestAnimationFrame(() => {
                const el = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${nextIdx}"]`);
                el?.focus();
              });
            }
          }
        } else if (key === 'ArrowRight' || code === 39) {
          e.preventDefault();
          if (isRtl) {
            // In RTL, Categories sidebar is on the RIGHT.
            // Pressing ArrowRight on rightmost column (curIdx % cols === 0) or in list view focuses Categories!
            if (!isGrid || curIdx % cols === 0) {
              tvFocusedPane.current = 'categories';
              const catButtons = document.querySelectorAll<HTMLElement>('[data-tv-pane="categories"]');
              const targetCat = catButtons[tvFocusedCatIndex.current] || catButtons[0];
              targetCat?.focus();
              targetCat?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            } else {
              const nextIdx = Math.max(0, curIdx - 1);
              tvFocusedChannelIndex.current = nextIdx;
              const el = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${nextIdx}"]`);
              el?.focus();
              el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
          } else {
            // In LTR, Categories sidebar is on the LEFT. ArrowRight moves to next item in row/list.
            if (isGrid) {
              const nextIdx = Math.min(channelsList.length - 1, curIdx + 1);
              tvFocusedChannelIndex.current = nextIdx;
              const el = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${nextIdx}"]`);
              el?.focus();
              el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            } else {
              tvFocusedPane.current = 'player';
              const playerEl = document.querySelector<HTMLElement>('[data-tv-pane="player"]');
              playerEl?.focus();
            }
          }
        } else if (key === 'ArrowLeft' || code === 37) {
          e.preventDefault();
          if (!isRtl) {
            // In LTR, Categories sidebar is on the LEFT.
            // Pressing ArrowLeft on leftmost column (curIdx % cols === 0) or in list view focuses Categories!
            if (!isGrid || curIdx % cols === 0) {
              tvFocusedPane.current = 'categories';
              const catButtons = document.querySelectorAll<HTMLElement>('[data-tv-pane="categories"]');
              const targetCat = catButtons[tvFocusedCatIndex.current] || catButtons[0];
              targetCat?.focus();
              targetCat?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            } else {
              const nextIdx = Math.max(0, curIdx - 1);
              tvFocusedChannelIndex.current = nextIdx;
              const el = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${nextIdx}"]`);
              el?.focus();
              el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
          } else {
            // In RTL, Categories sidebar is on the RIGHT. ArrowLeft moves to next item (leftwards).
            if (isGrid) {
              const nextIdx = Math.min(channelsList.length - 1, curIdx + 1);
              tvFocusedChannelIndex.current = nextIdx;
              const el = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${nextIdx}"]`);
              el?.focus();
              el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            } else {
              tvFocusedPane.current = 'player';
              const playerEl = document.querySelector<HTMLElement>('[data-tv-pane="player"]');
              playerEl?.focus();
            }
          }
        } else if (key === 'Enter' || code === 13 || key === 'Select' || code === 23) {
          e.preventDefault();
          if (!e.repeat) {
            okLongPressFiredRef.current = false;
            const targetCh = channelsList[curIdx];
            okPressedChannelRef.current = targetCh || null;
            okPressedIndexRef.current = curIdx;

            if (okPressTimerRef.current) clearTimeout(okPressTimerRef.current);
            okPressTimerRef.current = setTimeout(() => {
              okLongPressFiredRef.current = true;
              if (targetCh) {
                setReorderTarget({
                  type: 'channel',
                  id: targetCh.stream_id,
                  index: curIdx,
                  name: targetCh.name
                });
                setTargetPosInput(String(curIdx + 1));
              }
            }, 420);
          }
        }
      } else if (tvFocusedPane.current === 'player') {
        if ((key === 'ArrowLeft' && !isRtl) || (key === 'ArrowRight' && isRtl)) {
          e.preventDefault();
          tvFocusedPane.current = 'channels';
          const chEl = document.querySelector<HTMLElement>(`[data-tv-pane="channels"][data-index="${tvFocusedChannelIndex.current}"]`) ||
                       document.querySelector<HTMLElement>('[data-tv-pane="channels"]');
          chEl?.focus();
        } else if (key === 'Enter' || code === 13 || key === 'Select' || code === 23) {
          e.preventDefault();
          const target = selectedChannel || activePlayingMovie || filteredChannelsRef.current[0];
          if (target) handleOpenFullscreenRef.current(target);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      const code = e.keyCode;
      const isOkKey = key === 'Enter' || code === 13 || key === 'Select' || code === 23;

      if (isOkKey && tvFocusedPane.current === 'channels') {
        if (okPressTimerRef.current) {
          clearTimeout(okPressTimerRef.current);
          okPressTimerRef.current = null;
        }

        // If long press DID NOT fire, it was a short click -> Play channel!
        if (!okLongPressFiredRef.current) {
          const chToSelect = okPressedChannelRef.current;
          if (chToSelect) {
            handleChannelClickRef.current(chToSelect);
          }
        }

        okLongPressFiredRef.current = false;
        okPressedChannelRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (okPressTimerRef.current) {
        clearTimeout(okPressTimerRef.current);
        okPressTimerRef.current = null;
      }
    };
  }, [isRtl, mediaType, onBack, showPinModal, showEpgGrid, showEpgTimeline, showAudioMenu, showSubMenu, showQualityMenu, reorderTarget, activeVodPlayer, movieDetailsModal, isFullscreen, showControls, toggleControlsVisibility]);

  useEffect(() => {
    return subscribeFavorites(userId, (next: string[]) => setFavorites(next));
  }, [userId]);

  const toggleFavorite = (streamId: string) => {
    const ch = channels.find(c => c.stream_id === streamId);
    toggleFavoriteService(userId, streamId, ch ? {
      name: ch.name,
      logo: ch.stream_icon,
      url: ch.url,
      category: ch.category_name,
      category_id: ch.category_id,
      type: mediaType === 'live' ? 'live' : mediaType === 'movie' ? 'movie' : 'series'
    } : undefined);
  };

  const moveChannel = (streamId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const curList = filteredChannelsRef.current && filteredChannelsRef.current.length > 0 ? filteredChannelsRef.current : filteredChannels;
    const filteredIdx = curList.findIndex(c => c.stream_id === streamId);
    if (filteredIdx === -1) return;
    const targetFilteredIdx = direction === 'up' ? filteredIdx - 1 : filteredIdx + 1;
    if (targetFilteredIdx < 0 || targetFilteredIdx >= curList.length) return;

    moveItemToPosition('channel', streamId, targetFilteredIdx + 1, false);
  };

  const moveItemToPosition = (type: 'category' | 'channel', id: string, toPosNum: number, closeModal = true) => {
    if (type === 'category') {
      setCategories(prev => {
        const fromIdx = prev.findIndex(c => c.category_id === id);
        if (fromIdx === -1) return prev;
        const toIdx = Math.max(0, Math.min(prev.length - 1, toPosNum - 1));
        if (fromIdx === toIdx) return prev;
        const copy = [...prev];
        const [item] = copy.splice(fromIdx, 1);
        copy.splice(toIdx, 0, item);
        const newOrderIds = copy.map(c => c.category_id);
        onUpdateSettings(st => ({
          ...st,
          categoryOrders: { ...(st.categoryOrders || {}), [mediaType]: newOrderIds }
        }));
        try {
          localStorage.setItem(`achour_category_orders_${mediaType}`, JSON.stringify(newOrderIds));
        } catch (e) {}
        return copy;
      });
    } else {
      const curList = filteredChannelsRef.current && filteredChannelsRef.current.length > 0
        ? filteredChannelsRef.current
        : filteredChannels;
      
      const fromCurIdx = curList.findIndex(c => c.stream_id === id);
      const toCurIdx = Math.max(0, Math.min(curList.length - 1, toPosNum - 1));

      if (fromCurIdx !== -1 && fromCurIdx !== toCurIdx) {
        const reorderedCurList = [...curList];
        const [movedItem] = reorderedCurList.splice(fromCurIdx, 1);
        reorderedCurList.splice(toCurIdx, 0, movedItem);

        setChannels(prevMaster => {
          const curListIds = new Set(curList.map(c => c.stream_id));
          const masterIndices: number[] = [];
          for (let i = 0; i < prevMaster.length; i++) {
            if (curListIds.has(prevMaster[i].stream_id)) {
              masterIndices.push(i);
            }
          }

          const nextMaster = [...prevMaster];
          if (masterIndices.length === reorderedCurList.length) {
            for (let k = 0; k < reorderedCurList.length; k++) {
              nextMaster[masterIndices[k]] = reorderedCurList[k];
            }
          } else {
            const fromMasterIdx = nextMaster.findIndex(c => c.stream_id === id);
            if (fromMasterIdx !== -1) {
              const [item] = nextMaster.splice(fromMasterIdx, 1);
              const targetNeighbor = reorderedCurList[toCurIdx === 0 ? 1 : toCurIdx - 1];
              const targetNeighborIdx = targetNeighbor ? nextMaster.findIndex(c => c.stream_id === targetNeighbor.stream_id) : -1;
              if (targetNeighborIdx !== -1) {
                const insertIdx = toCurIdx === 0 ? targetNeighborIdx : targetNeighborIdx + 1;
                nextMaster.splice(insertIdx, 0, item);
              } else {
                nextMaster.splice(Math.max(0, Math.min(nextMaster.length, toCurIdx)), 0, item);
              }
            }
          }

          const newOrderIds = nextMaster.map(c => c.stream_id);
          onUpdateSettings(st => ({
            ...st,
            channelOrders: { ...(st.channelOrders || {}), [mediaType]: newOrderIds }
          }));
          try {
            localStorage.setItem(`achour_channel_orders_${mediaType}`, JSON.stringify(newOrderIds));
          } catch (e) {}

          return nextMaster;
        });
      }
    }

    if (closeModal) {
      setReorderTarget(null);
    } else {
      setReorderTarget(prev => prev ? { ...prev, index: toPosNum - 1 } : null);
      setTargetPosInput(String(toPosNum));
    }
  };

  const handleMoveStep = (direction: 'up' | 'down') => {
    if (!reorderTarget) return;
    const currentPos = parseInt(targetPosInput, 10) || (reorderTarget.index + 1);
    const curList = filteredChannelsRef.current && filteredChannelsRef.current.length > 0 ? filteredChannelsRef.current : filteredChannels;
    const max = reorderTarget.type === 'category' ? categories.length : curList.length;
    const newPos = direction === 'up' ? Math.max(1, currentPos - 1) : Math.min(max, currentPos + 1);
    if (newPos === currentPos) return;

    moveItemToPosition(reorderTarget.type, reorderTarget.id, newPos, false);
  };

  const handleJumpToFirst = () => {
    if (!reorderTarget) return;
    moveItemToPosition(reorderTarget.type, reorderTarget.id, 1, false);
  };

  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const playerVideoElements = useRef<(HTMLVideoElement | null)[]>([null, null, null, null]);
  const hlsInstances = useRef<(Hls | null)[]>([null, null, null, null]);



  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Background Pre-fetch all playlist content once per playlist change
  useEffect(() => {
    if (!settings.activePlaylistId) return;
    
    const preFetchAll = async () => {
      const p = await fetchActivePlaylist();
      if (p) {
        console.log('[Background] Pre-fetching all content for playlist:', p.id);
        await fetchChannels(p, [], false);
      }
    };
    preFetchAll().catch(console.error);
  }, [settings.activePlaylistId]);

  const sortCategoriesBySavedOrder = (incomingCats: ParsedCategory[]): ParsedCategory[] => {
    let savedOrder = settings.categoryOrders?.[mediaType];
    if (!savedOrder || !Array.isArray(savedOrder) || savedOrder.length === 0) {
      try {
        const raw = localStorage.getItem(`achour_category_orders_${mediaType}`);
        if (raw) savedOrder = JSON.parse(raw);
      } catch (e) {}
    }
    if (!savedOrder || !Array.isArray(savedOrder) || savedOrder.length === 0) {
      return incomingCats;
    }
    const orderMap = new Map<string, number>();
    savedOrder.forEach((id, idx) => orderMap.set(id, idx));
    return [...incomingCats].sort((a, b) => {
      const idxA = orderMap.has(a.category_id) ? (orderMap.get(a.category_id) as number) : 99999;
      const idxB = orderMap.has(b.category_id) ? (orderMap.get(b.category_id) as number) : 99999;
      return idxA - idxB;
    });
  };

  const sortChannelsBySavedOrder = useCallback((incomingChs: ParsedChannel[]): ParsedChannel[] => {
    let savedOrder = settings.channelOrders?.[mediaType];
    if (!savedOrder || !Array.isArray(savedOrder) || savedOrder.length === 0) {
      try {
        const raw = localStorage.getItem(`achour_channel_orders_${mediaType}`);
        if (raw) savedOrder = JSON.parse(raw);
      } catch (e) {}
    }
    if (!savedOrder || !Array.isArray(savedOrder) || savedOrder.length === 0) {
      return incomingChs;
    }
    const orderMap = new Map<string, number>();
    savedOrder.forEach((id, idx) => orderMap.set(id, idx));
    return incomingChs.slice().sort((a, b) => {
      const idxA = orderMap.has(a.stream_id) ? (orderMap.get(a.stream_id) as number) : 999999;
      const idxB = orderMap.has(b.stream_id) ? (orderMap.get(b.stream_id) as number) : 999999;
      if (idxA === idxB) return 0;
      return idxA - idxB;
    });
  }, [settings.channelOrders, mediaType]);

  const fetchActivePlaylist = async (): Promise<Playlist | null> => {
    try {
      const rawLocal = localStorage.getItem('achour_local_playlists');
      const localList: Playlist[] = rawLocal ? JSON.parse(rawLocal) : [];

      // 1. If explicit active playlist selected
      if (settings.activePlaylistId) {
        const localFound = localList.find(p => p.id === settings.activePlaylistId);
        if (localFound) {
          setActivePlaylist(localFound);
          if (localFound.isProtected && localFound.pin && !isUnlocked) setShowPinModal(true);
          return localFound;
        }
        try {
          const docRef = doc(db, 'playlists', settings.activePlaylistId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Playlist;
            setActivePlaylist(data);
            if (data.isProtected && data.pin && !isUnlocked) setShowPinModal(true);
            return data;
          }
        } catch (e) {}
      }

      // 2. Prioritize first available playlist
      if (localList.length > 0) {
        const first = localList[0];
        setActivePlaylist(first);
        if (settings.activePlaylistId !== first.id) {
          onUpdateSettings(prev => ({ ...prev, activePlaylistId: first.id }));
        }
        if (first.isProtected && first.pin && !isUnlocked) setShowPinModal(true);
        return first;
      }

      // 3. Check Firestore for user's playlists
      try {
        const q = query(collection(db, 'playlists'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const first = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Playlist;
          setActivePlaylist(first);
          if (settings.activePlaylistId !== first.id) {
            onUpdateSettings(prev => ({ ...prev, activePlaylistId: first.id }));
          }
          if (first.isProtected && first.pin && !isUnlocked) setShowPinModal(true);
          return first;
        }
      } catch (e) {}

      // 4. Fallback to first available in local storage
      if (localList.length > 0) {
        const first = localList[0];
        setActivePlaylist(first);
        if (first.isProtected && first.pin && !isUnlocked) setShowPinModal(true);
        return first;
      }
    } catch (err) {}
    return null;
  };

  const parseM3U = (rawContent: string, baseUrl?: string): ParsedChannel[] => {
    if (!rawContent) return [];
    let content = rawContent.replace(/^\uFEFF/, '').trim();
    if (!content) return [];

    // Reject HTML content (e.g. when fetching a GitHub web page instead of raw M3U)
    if (content.startsWith('<!DOCTYPE') || content.startsWith('<html') || content.startsWith('<div')) {
      console.warn('Received HTML response instead of valid M3U text file');
      return [];
    }

    if (content.startsWith('{') || content.startsWith('[')) {
      try {
        const json = JSON.parse(content);
        let list = Array.isArray(json) ? json : (json.available_channels || json.channels || json.streams || json.live_streams || json.vod_streams || json.series || json.vod_data || json.data || []);
        if ((!Array.isArray(list) || list.length === 0) && typeof json === 'object' && json !== null) {
          const vals = Object.values(json);
          if (vals.length > 0 && typeof vals[0] === 'object' && vals[0] !== null) {
            list = vals;
          }
        }
        if (Array.isArray(list) && list.length > 0) {
          return list.map((ch: any, idx: number) => ({
            stream_id: String(ch.stream_id || ch.id || `${Date.now()}-${idx}`),
            name: String(ch.name || ch.title || `Channel ${idx + 1}`),
            stream_icon: ch.stream_icon || ch.logo || ch.cover || undefined,
            url: ch.url || (ch.stream_id ? `${baseUrl || ''}/live/${ch.stream_id}.ts` : ''),
            category_id: String(ch.category_id || ch.group || 'عام (General)'),
            category_name: String(ch.category_name || ch.group || 'عام (General)'),
          }));
        }
      } catch (e) {}
    }

    const lines = content.split(/\r?\n/);
    const result: ParsedChannel[] = [];
    let curName = '';
    let curLogo = '';
    let curGroup = 'عام (General)';
    let curId = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;


      if (line.startsWith('#EXTINF:')) {
        const logoMatch = line.match(/tvg-logo=["']([^"']*)["']/i) || line.match(/tvg-logo=([^\s,]+)/i);
        const groupMatch = line.match(/group-title=["']([^"']*)["']/i) || line.match(/group-title=([^\s,]+)/i);
        const idMatch = line.match(/tvg-id=["']([^"']*)["']/i) || line.match(/tvg-id=([^\s,]+)/i);
        const tvgNameMatch = line.match(/tvg-name=["']([^"']*)["']/i) || line.match(/tvg-name=([^\s,]+)/i);

        let inQuotes = false;
        let quoteChar = '';
        let commaPos = -1;
        for (let cIdx = 0; cIdx < line.length; cIdx++) {
          const char = line[cIdx];
          if (char === '"' || char === "'") {
            if (!inQuotes) { inQuotes = true; quoteChar = char; }
            else if (char === quoteChar) { inQuotes = false; }
          } else if (char === ',' && !inQuotes) {
            commaPos = cIdx;
            break;
          }
        }

        let extractedName = '';
        if (commaPos !== -1) extractedName = line.substring(commaPos + 1).trim();
        else if (tvgNameMatch && tvgNameMatch[1]) extractedName = tvgNameMatch[1].trim();

        curName = extractedName;
        curLogo = logoMatch ? logoMatch[1].trim() : '';
        curGroup = groupMatch ? groupMatch[1].trim() : 'عام (General)';
        curId = idMatch ? idMatch[1].trim() : '';
      } else if (line.startsWith('#EXTGRP:')) {
        curGroup = line.replace('#EXTGRP:', '').trim();
      } else if (!line.startsWith('#')) {
        let streamUrl = line.replace(/&amp;/g, '&');
        // Filter out non-media assets
        if (streamUrl.endsWith('.js') || streamUrl.endsWith('.css') || streamUrl.includes('githubassets.com')) {
          continue;
        }
        if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
          if (baseUrl) {
            try {
              const base = new URL(baseUrl);
              streamUrl = new URL(streamUrl, base.origin).toString();
            } catch (e) {}
          }
        }

        // Generate safe stable ID if missing, avoiding unescape/btoa crashes
        const finalId = curId || ('ch_' + Math.abs((curName + streamUrl).split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(36) + '_' + result.length);

        result.push({
          stream_id: finalId,
          name: curName || `Channel ${result.length + 1}`,
          stream_icon: curLogo || undefined,
          url: streamUrl,
          category_id: curGroup || 'عام (General)',
          category_name: curGroup || 'عام (General)'
        });
        curName = '';
        curLogo = '';
        curGroup = 'عام (General)';
        curId = '';
      }
    }
    return result;
  };

  // We use the global cache from iptv.ts now to persist across Live/Movies/Series
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string>('');

  const fetchIPTVData = useCallback(async (forceRefresh = false) => {
    const fetchKey = `${userId}_${mediaType}_${settings.activePlaylistId || 'default'}`;
    
    // 1. Check in-memory cache
    if (!forceRefresh && iptvGlobalCache.has(fetchKey)) {
      const cached = iptvGlobalCache.get(fetchKey)!;
      setCategories(cached.categories);
      setChannels(cached.channels);
      if (cached.categories.length > 0 && !selectedCategory) {
        setSelectedCategory(cached.categories[0].category_id);
      }
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    // 2. Check for system background cache if normal cache is missing
    const sysCacheKey = `system_background_${mediaType}_${settings.activePlaylistId}`;
    if (!forceRefresh && iptvGlobalCache.has(sysCacheKey)) {
      const cached = iptvGlobalCache.get(sysCacheKey)!;
      setCategories(cached.categories);
      setChannels(cached.channels);
      if (cached.categories.length > 0 && !selectedCategory) {
        setSelectedCategory(cached.categories[0].category_id);
      }
      setLoading(false);
      isFetchingRef.current = false;
      // Move sys cache to active cache
      iptvGlobalCache.set(fetchKey, cached);
      return;
    }

    // 3. Check IndexedDB cache
    if (!forceRefresh) {
      try {
        const { getChannelsByPlaylistAndType, getCategoriesByPlaylistAndType } = await import('../lib/db');
        const playlistId = settings.activePlaylistId || 'default';
        const typeToQuery = mediaType === 'favorites' ? 'live' : mediaType;
        const cachedChannels = await getChannelsByPlaylistAndType(playlistId, typeToQuery);
        const cachedCategories = await getCategoriesByPlaylistAndType(playlistId, typeToQuery);
        
        if (cachedChannels.length > 0) {
          setChannels(cachedChannels);
          setCategories(cachedCategories);
          if (cachedCategories.length > 0 && !selectedCategory) {
            setSelectedCategory(cachedCategories[0].category_id);
          }
          setLoading(false);
          isFetchingRef.current = false;
          iptvGlobalCache.set(fetchKey, { categories: cachedCategories, channels: cachedChannels });
          return;
        }
      } catch (e) {
        console.warn('[Fetch] DB Cache read error:', e);
      }
    }

    if (!forceRefresh && isFetchingRef.current && lastFetchKeyRef.current === fetchKey) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchKeyRef.current = fetchKey;
    setLoading(true);
    setStreamError(null);

    const playlist = await fetchActivePlaylist();
    if (!playlist) {
      setChannels([]);
      setCategories([]);
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      const typeToLoad = mediaType === 'favorites' ? 'live' : mediaType;
      const { categories, channels: fetchedChannels } = await fetchChannelsForType(playlist, typeToLoad, [], forceRefresh);

      if (fetchedChannels.length > 0 || categories.length > 0) {
        setCategories(categories);
        setChannels(fetchedChannels);
        if (categories.length > 0 && !selectedCategory) {
          setSelectedCategory(categories[0].category_id);
        }

      } else {
        setStreamError(isRtl ? 'لم يتم العثور على قنوات أو محتوى في هذا السيرفر.' : 'No channels or content found on this server.');
      }
    } catch (e: any) {
      console.error('Fetch failed', e);
      setStreamError(isRtl ? `فشل الاتصال بالسيرفر: ${e?.message || 'تعذر الاتصال'}` : `Connection failed: ${e?.message || 'Network error'}`);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId, mediaType, settings.activePlaylistId, selectedCategory, sortCategoriesBySavedOrder, sortChannelsBySavedOrder, activePlaylist, isRtl]);

  const fetchXtreamStreams = async (catId: string, p: Playlist, actionName?: string, sHost?: string, passedCats?: ParsedCategory[]) => {
    if (catId === 'ALL_CATEGORIES' || !catId || catId === 'FAVORITES_INTERNAL') return;
    if (catId === 'أفلام تجريبية (Test Movies)' || catId === 'مسلسلات تجريبية (Test Series)') return;

    let action = actionName || 'get_live_streams';
    if (!actionName) {
      if (mediaType === 'movie') action = 'get_vod_streams';
      if (mediaType === 'series') action = 'get_series';
    }

    try {
      const host = (p.url || '').trim().replace(/\/+$/, '').replace(/\/(player_api|get|index)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\?.*$/, '');
      const extraParams: any = {};
      if (catId && catId !== 'All' && catId !== 'all' && catId !== 'ALL_CATEGORIES') extraParams.category_id = catId;

      let res = await xtreamFetch(host, p.username || '', p.password || '', action, extraParams);
      
      // Fallback: If category_id query returned 0 items, try full list
      if ((!res.ok || res.rawList.length === 0) && extraParams.category_id) {
        const fullRes = await xtreamFetch(host, p.username || '', p.password || '', action);
        if (fullRes.ok && fullRes.rawList.length > 0) {
          res = fullRes;
        }
      }

      if (res.ok && res.rawList.length > 0) {
        const baseStreamUrl = sHost || streamingHost || host;
        let rawList = res.rawList;

        if (catId && catId !== 'All' && catId !== 'all' && catId !== 'ALL_CATEGORIES') {
          const cleanTarget = String(catId).trim().toLowerCase();
          const filtered = rawList.filter((ch: any) => {
            const cid = String(ch.category_id || '').trim().toLowerCase();
            const cname = String(ch.category_name || ch.category || '').trim().toLowerCase();
            return (
              cid === cleanTarget ||
              cname === cleanTarget ||
              (cleanTarget && cname && (cname.includes(cleanTarget) || cleanTarget.includes(cname)))
            );
          });
          if (filtered.length > 0) rawList = filtered;
        }

        const catsToUse = (passedCats && passedCats.length > 0) ? passedCats : categories;

        const mapped: ParsedChannel[] = rawList.map((ch: any, idx: number) => {
          const rawStreamId = String(ch.stream_id || ch.series_id || ch.id || `${catId}-${idx}`);
          const cleanStreamId = rawStreamId.replace(/\.(m3u8|ts|mp4|mkv|avi|flv)$/i, '');
          const ext = ch.container_extension || (mediaType === 'live' ? 'm3u8' : 'mp4');
          
          let directUrl = ch.stream_url || ch.direct_source || ch.url || '';
          if (!directUrl) {
            if (mediaType === 'live') directUrl = `${baseStreamUrl}/live/${p.username}/${p.password}/${cleanStreamId}.${ext}`;
            else if (mediaType === 'movie') directUrl = `${baseStreamUrl}/movie/${p.username}/${p.password}/${cleanStreamId}.${ext}`;
            else directUrl = `${baseStreamUrl}/series/${p.username}/${p.password}/${cleanStreamId}.${ext}`;
          }

          const rawCatId = String(ch.category_id || catId || 'general');
          const matchedCat = catsToUse.find(c => String(c.category_id) === rawCatId);
          const resolvedCatName = String(ch.category_name || (matchedCat ? matchedCat.category_name : '') || rawCatId || 'عام (General)');

          return {
            stream_id: cleanStreamId,
            name: String(ch.name || ch.title || 'Channel ' + (idx + 1)),
            stream_icon: ch.stream_icon || ch.cover || ch.logo || undefined,
            url: directUrl,
            category_id: rawCatId,
            category_name: resolvedCatName,
            container_extension: ext
          };
        });

        saveChannels(mapped, (mediaType === 'favorites' ? 'live' : mediaType) as 'live' | 'movie' | 'series', settings.activePlaylistId || 'default');

        setChannels(prev => {
          const existingIds = new Set(prev.map(c => c.stream_id));
          const newStreams = mapped.filter(c => !existingIds.has(c.stream_id));
          return sortChannelsBySavedOrder(prev.concat(newStreams));
        });

      }
    } catch (err) {}
  };

  const fetchStalkerStreams = async (catId: string, p: Playlist) => {
    try {
      const fetchUrl = getPlatformUrl('stalker', p.url || p.portal || '', {
        action: 'get_ordered_list',
        type: 'itv',
        category: catId,
        mac: p.macAddress || ''
      });
      const chRes = await axios.get(fetchUrl);
      const rawData = chRes.data?.js?.data || chRes.data?.js || chRes.data?.data;
      if (Array.isArray(rawData)) {
        const cleanHost = (p.url || p.portal || '').replace(/\/+$/, '');
        const mapped: ParsedChannel[] = rawData.map((ch: any, idx: number) => ({
          stream_id: String(ch.id || ch.cmd || idx),
          name: String(ch.name || 'Channel ' + (idx + 1)),
          stream_icon: ch.logo,
          url: ch.cmd || `${cleanHost}/play/${ch.id}`,
          category_id: catId
        }));
        setChannels(prev => {
          const existingIds = new Set(prev.map(c => c.stream_id));
          const newStreams = mapped.filter(c => !existingIds.has(c.stream_id));
          return sortChannelsBySavedOrder(prev.concat(newStreams));
        });

      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchIPTVData();
  }, [userId, mediaType, settings.activePlaylistId]);

  const loadedCategoriesSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < channels.length; i++) {
      if (channels[i].category_id) s.add(String(channels[i].category_id).trim().toLowerCase());
      if (channels[i].category_name) s.add(String(channels[i].category_name).trim().toLowerCase());
      if (channels[i].category) s.add(String(channels[i].category).trim().toLowerCase());
    }
    return s;
  }, [channels]);

  useEffect(() => {
    const update = async () => {
      if (!selectedCategory || !activePlaylist) return;
      if (selectedCategory === 'ALL_CATEGORIES' || selectedCategory === 'All' || selectedCategory === 'all' || selectedCategory === 'FAVORITES_INTERNAL') return;
      
      const cleanSel = String(selectedCategory).trim().toLowerCase();
      if (loadedCategoriesSet.has(cleanSel)) return;

      if (activePlaylist.type === 'xtream') {
        await fetchXtreamStreams(selectedCategory, activePlaylist);
      } else if (activePlaylist.type === 'stalker') {
        await fetchStalkerStreams(selectedCategory, activePlaylist);
      }
    };
    update();
  }, [selectedCategory, activePlaylist, loadedCategoriesSet]);

  const getTargetVideoElement = (slotIdx: number = 0): HTMLVideoElement | null => {
    return playerVideoElements.current[slotIdx] || null;
  };

  const hiddenList = useMemo(() => {
    if (mediaType === 'movie') return settings.hiddenMovieCategories || settings.hiddenCategories || [];
    if (mediaType === 'series') return settings.hiddenSeriesCategories || settings.hiddenCategories || [];
    return settings.hiddenLiveCategories || settings.hiddenCategories || [];
  }, [mediaType, settings.hiddenLiveCategories, settings.hiddenMovieCategories, settings.hiddenSeriesCategories, settings.hiddenCategories]);

  const hiddenSet = useMemo(() => new Set(hiddenList), [hiddenList]);
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const visibleCategories = useMemo(() => {
    const base = categories.filter(cat => 
      !hiddenSet.has(cat.category_id) && 
      !hiddenSet.has(cat.category_name) &&
      cat.category_name !== 'جميع المجموعات' &&
      cat.category_name !== 'All Groups' &&
      cat.category_name !== 'ALL' &&
      cat.category_name !== 'All'
    );
    if (favorites.length > 0) {
      let favsCount = 0;
      for (let i = 0; i < channels.length; i++) {
        if (favSet.has(channels[i].stream_id)) favsCount++;
      }

      if (favsCount > 0) {
        return [{
          category_id: 'FAVORITES_INTERNAL',
          category_name: isRtl ? 'المفضلة ★' : 'Favorites ★',
          count: favsCount
        }, ...base];
      }
    }
    return base;
  }, [categories, hiddenSet, favSet, favorites.length, channels, isRtl]);

  // Pre-index channels by category for O(1) lookup
  const channelsByCategory = useMemo(() => {
    const map = new Map<string, ParsedChannel[]>();
    for (let i = 0; i < channels.length; i++) {
      const catId = String(channels[i].category_id);
      if (!map.has(catId)) map.set(catId, []);
      map.get(catId)!.push(channels[i]);
    }
    return map;
  }, [channels]);

  const filteredChannels = useMemo(() => {
    const query = search.trim().toLowerCase();
    const targetCategory = (selectedCategory && selectedCategory !== 'ALL_CATEGORIES' && selectedCategory !== 'All' && selectedCategory !== 'all') ? String(selectedCategory) : null;

    let result: ParsedChannel[] = [];
    
    if (selectedCategory === 'FAVORITES_INTERNAL' || mediaType === 'favorites') {
      for (let i = 0; i < channels.length; i++) {
        if (favSet.has(channels[i].stream_id)) result.push(channels[i]);
      }
    } else if (targetCategory) {
      result = channelsByCategory.get(targetCategory) || [];
      if (result.length === 0) {
        const cleanTarget = targetCategory.trim().toLowerCase();
        result = channels.filter(ch => {
          const cid = String(ch.category_id || '').trim().toLowerCase();
          const cname = String(ch.category_name || ch.category || '').trim().toLowerCase();
          return (
            cid === cleanTarget ||
            cname === cleanTarget ||
            (cleanTarget && cname && (cname.includes(cleanTarget) || cleanTarget.includes(cname)))
          );
        });
      }
    } else {
      // If "All" is selected, we must filter for hidden categories
      for (let i = 0; i < channels.length; i++) {
        const ch = channels[i];
        if (hiddenSet.has(ch.category_id) || hiddenSet.has(ch.category_name || '')) continue;
        result.push(ch);
      }
    }

    if (query) {
      result = result.filter(ch => (ch.name || '').toLowerCase().includes(query));
    }

    if (result.length === 0 && !query && mediaType !== 'favorites' && selectedCategory !== 'FAVORITES_INTERNAL' && !targetCategory) {
      if (channels.length > 0) {
        result = channels.slice();
      }
    }

    if (sortOrder === 'az') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    } else if (result.length < 50000) { // Only sort if reasonably sized
      result = sortChannelsBySavedOrder(result);
    }
    
    return result;
  }, [channels, search, sortOrder, selectedCategory, hiddenSet, favSet, mediaType, sortChannelsBySavedOrder, channelsByCategory]);

  useEffect(() => {
    filteredChannelsRef.current = selectedCategory === 'recent'
      ? getRecents().map((r: any) => ({ ...r, stream_id: r.id }))
      : filteredChannels;
  }, [filteredChannels, selectedCategory]);

  const handleHighlightChannel = useCallback((ch: ParsedChannel) => {
    if (!ch || !ch.stream_id) return;
    currentHighlightedChannelRef.current = ch.stream_id;
  }, []);

  const handleOpenFullscreen = useCallback((ch: ParsedChannel) => {
    if (!ch) return;
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = null;
    }
    currentHighlightedChannelRef.current = ch.stream_id;
    addToRecents(ch);
    setSelectedChannel(ch);
    setActivePlayingMovie(ch);

    if (mediaType === 'movie' || mediaType === 'series') {
      setMovieDetailsModal(ch);
      setDetailLoading(true);
      setMediaDetailInfo(null);
      fetchMediaDetails(ch.stream_id, mediaType, activePlaylist!).then(info => {
        setMediaDetailInfo(info);
        setDetailLoading(false);
      });
      return;
    }

    if (settings.useExternalPlayer) {
      launchExternalPlayer(ch.url);
    } else {
      setIsFullscreen(true);
      setActiveVodPlayer(ch);
    }
  }, [mediaType, settings.useExternalPlayer, activePlaylist]);


  const handleChannelClick = useCallback((ch: ParsedChannel) => {
    if (!ch) return;

    if (mediaType === 'movie' || mediaType === 'series') {
      handleOpenFullscreen(ch);
      return;
    }

    // For Live channels:
    // First click: plays in small preview screen
    // Second click on the same selected channel: opens in FULLSCREEN!
    if (selectedChannel?.stream_id === ch.stream_id && !activeVodPlayer) {
      handleOpenFullscreen(ch);
    } else {
      setSelectedChannel(ch);
      setActivePlayingMovie(ch);
      addToRecents(ch);
    }
  }, [mediaType, selectedChannel?.stream_id, activeVodPlayer, handleOpenFullscreen]);

  useEffect(() => {
    handleHighlightChannelRef.current = handleHighlightChannel;
  }, [handleHighlightChannel]);

  useEffect(() => {
    handleOpenFullscreenRef.current = handleOpenFullscreen;
  }, [handleOpenFullscreen]);

  useEffect(() => {
    handleChannelClickRef.current = handleChannelClick;
  }, [handleChannelClick]);

  const switchChannelByOffset = useCallback((offset: number) => {
    if (filteredChannels.length === 0) return;
    const currentCh = selectedChannel;
    const currentIndex = currentCh ? filteredChannels.findIndex(c => c.stream_id === currentCh.stream_id) : 0;
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeCurrentIndex + offset + filteredChannels.length) % filteredChannels.length;
    const nextCh = filteredChannels[nextIndex];
    if (!nextCh) return;

    setSelectedChannel(nextCh);
    setActivePlayingMovie(nextCh);
    addToRecents(nextCh);
  }, [filteredChannels, selectedChannel]);

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Gestures disabled per user request
    triggerControlsVisibility();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Gestures disabled per user request
    touchStartY.current = null;
    touchStartX.current = null;
  };

  const handleSelectAudioTrack = (trackId: number, trackName: string) => {
    setSelectedAudioTrack(trackName);
    const hls = hlsInstances.current[0];
    if (hls && hls.audioTracks && hls.audioTracks.length > 0) hls.audioTrack = trackId;
    setShowAudioMenu(false);
    triggerControlsVisibility();
  };

  const handleSelectSubtitleTrack = (trackId: number, trackName: string) => {
    setSelectedSubtitleTrack(trackName);
    const hls = hlsInstances.current[0];
    if (hls) hls.subtitleTrack = trackId;
    setSubtitleActive(trackId >= 0);
    setShowSubMenu(false);
    triggerControlsVisibility();
  };

  const handleSelectQuality = (levelId: number, qualityLabel: string) => {
    setSelectedQuality(qualityLabel);
    const hls = hlsInstances.current[0];
    if (hls) hls.currentLevel = levelId;
    setShowQualityMenu(false);
    triggerControlsVisibility();
  };

  const toggleFullscreen = useCallback(() => {
    const container = fullscreenContainerRef.current;
    const currentIsFs = isFullscreen;
    
    setShowControls(true);
    setIsFullscreen(!currentIsFs);

    // Force aspect ratio to 'fill' or '16:9' when going fullscreen if it was 'fit'
    if (!currentIsFs && aspectRatio === 'fit') {
      setAspectRatio('16:9');
    }

    if (container) {
      const requestFs = container.requestFullscreen || (container as any).webkitRequestFullscreen || (container as any).mozRequestFullScreen || (container as any).msRequestFullscreen;
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement);
      
      if (!isFs) {
        if (requestFs) {
          requestFs.call(container).catch(() => {
            // Native fallback for mobile webviews
            const vid = getTargetVideoElement(0);
            if (vid) {
              const vidRequestFs = vid.requestFullscreen || (vid as any).webkitRequestFullscreen;
              if (vidRequestFs) vidRequestFs.call(vid).catch(() => {});
            }
          });
        }
      } else {
        const exitFs = document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).mozCancelFullScreen || (document as any).msExitFullscreen;
        if (exitFs) {
          exitFs.call(document).catch(() => {});
        }
      }
    }
  }, [isFullscreen, aspectRatio]);

  useEffect(() => {
    toggleFullscreenRef.current = toggleFullscreen;
  }, [toggleFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();

      if (key === 'escape' || key === 'back' || e.keyCode === 27 || e.keyCode === 4) {
        if (showAudioMenu || showSubMenu || showQualityMenu) {
          e.preventDefault();
          setShowAudioMenu(false);
          setShowSubMenu(false);
          setShowQualityMenu(false);
          return;
        }
        if (isFullscreen) {
          e.preventDefault();
          toggleFullscreen();
          return;
        }
      }

      if (key === 'r' || e.code === 'F1') {
        e.preventDefault();
        fetchIPTVData();
      } else if (key === 'g' || e.code === 'F2') {
        e.preventDefault();
        setShowRemoteHelp(prev => !prev);
      } else if (key === 'y' || e.code === 'F3') {
        e.preventDefault();
        const searchInput = document.getElementById('channel-search-input');
        if (searchInput) searchInput.focus();
      } else if (key === 'b' || e.code === 'F4') {
        e.preventDefault();
        if (selectedChannel) toggleFavorite(selectedChannel.stream_id);
      } else if (key === 'channelup' || key === 'pageup' || e.keyCode === 166 || e.keyCode === 33) {
        if (isFullscreen) {
          e.preventDefault();
          switchChannelByOffset(-1);
        }
      } else if (key === 'channeldown' || key === 'pagedown' || e.keyCode === 167 || e.keyCode === 34) {
        if (isFullscreen) {
          e.preventDefault();
          switchChannelByOffset(1);
        }
      } else if (key === 'arrowright') {
        if (isFullscreen && (mediaType === 'live' || mediaType === 'favorites')) {
          e.preventDefault();
          switchChannelByOffset(1);
        }
      } else if (key === 'arrowleft') {
        if (isFullscreen && (mediaType === 'live' || mediaType === 'favorites')) {
          e.preventDefault();
          switchChannelByOffset(-1);
        }
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'enter' || key === 'ok' || key === 'select' || e.keyCode === 13 || e.keyCode === 23) {
        if (okPressTimerRef.current) {
          clearTimeout(okPressTimerRef.current);
          okPressTimerRef.current = null;
          // Short press detected
          e.preventDefault();
          toggleControlsVisibility();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [filteredChannels, selectedChannel, switchChannelByOffset, isRtl, toggleControlsVisibility, showAudioMenu, showSubMenu, showQualityMenu, isFullscreen, toggleFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const fetchMediaDetails = async (id: string, type: 'movie' | 'series', p: Playlist) => {
    if (!id || !p) return null;
    const playlistId = p.id;
    try {
      // 0. CHECK INSTANT INDEXEDDB CACHE FOR SERIES EPISODES
      if (type === 'series') {
        const { getEpisodesBySeriesId } = await import('../lib/db');
        const cachedEps = await getEpisodesBySeriesId(playlistId, id);
        if (cachedEps && cachedEps.length > 0) {
          console.log(`[Cache] Found ${cachedEps.length} episodes for series ${id}`);
          return { episodes: cachedEps, info: {} };
        }
      }

      const action = type === 'movie' ? 'get_vod_info' : 'get_series_info';
      const rawHost = p?.url || streamingHost || '';
      const host = rawHost.trim().replace(/\/+$/, '').replace(/\/(player_api|get|index)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\?.*$/, '');
      
      let data = null;
      if (host && p?.username && p?.password) {
        const xtRes = await xtreamFetch(host, p.username, p.password, action, {
          [type === 'movie' ? 'vod_id' : 'series_id']: id
        }, 1);
        if (xtRes.ok && xtRes.data) {
          data = xtRes.data;
        }
      }

      if (!data) {
        const fetchUrl = getPlatformUrl('xtream', p?.url || '', {
          username: p?.username || '',
          password: p?.password || '',
          action: action,
          [type === 'movie' ? 'vod_id' : 'series_id']: id
        });
        const res = await axios.get(fetchUrl, { timeout: 10000 });
        data = res.data;
      }

      // 1. CACHE EPISODES IF SERIES
      if (type === 'series' && data?.episodes) {
        const { saveEpisodes } = await import('../lib/db');
        let epList: any[] = [];
        if (Array.isArray(data.episodes)) {
          epList = data.episodes;
        } else if (typeof data.episodes === 'object') {
          epList = Object.values(data.episodes).flat();
        }
        if (epList.length > 0) {
          saveEpisodes(playlistId, id, epList).catch(() => {});
        }
      }

      return data;
    } catch (e) {
      return null;
    }
  };


  return (
    <div 
      className={`flex flex-col h-screen bg-transparent text-white overflow-hidden select-none ${isRtl ? 'font-cairo' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full" />
      </div>

      {/* Requirement 2: Top Header - Search Field | Application Logo | Clock */}
      {!isFullscreen && (
        <header className="relative z-30 h-20 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md border-b border-white/5 shrink-0">
        <div className="grid grid-cols-3 items-center w-full gap-4">
          {/* Left Column: Search Field (Replaces subscription loading text) */}
          <div className="flex items-center justify-start min-w-0">
            <div className="relative w-full max-w-xs group">
              <Search size={14} className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-gold/70 group-focus-within:text-gold transition-colors pointer-events-none`} />
              <input 
                id="channel-search-input"
                data-tv-focusable="true"
                data-tv-pane="header"
                data-header-index="0"
                tabIndex={0}
                type="text"
                placeholder={
                  mediaType === 'live' 
                    ? (isRtl ? 'البحث عن قنوات المباشر...' : 'Search Live Channels...')
                    : mediaType === 'movie'
                    ? (isRtl ? 'البحث عن أفلام...' : 'Search Movies...')
                    : mediaType === 'series'
                    ? (isRtl ? 'البحث عن مسلسلات...' : 'Search Series...')
                    : (isRtl ? 'البحث...' : 'Search...')
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.keyCode === 40) {
                    e.preventDefault();
                    const chItems = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-pane="channels"]')).filter(el => el.offsetWidth > 0);
                    if (chItems.length > 0) {
                      tvFocusedPane.current = 'channels';
                      tvFocusedChannelIndex.current = 0;
                      chItems[0].focus();
                      chItems[0].scrollIntoView({ block: 'nearest', inline: 'nearest' });
                    }
                  }
                }}
                className={`w-full bg-zinc-950/80 border border-gold/40 focus:border-gold focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset rounded-2xl py-2 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs sm:text-sm text-white placeholder-zinc-400 outline-none transition-all shadow-inner`}
              />
              <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 flex items-center gap-1`}>
                <button
                  data-tv-focusable="true"
                  onClick={() => setShowOcr(true)}
                  className="p-1.5 bg-gold/10 hover:bg-gold/20 text-gold rounded-lg transition-all"
                  title={t('ai_discovery')}
                >
                  <Sparkles size={14} className="animate-pulse" />
                </button>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-zinc-400 hover:text-white p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Center Column: App Name (Top) & Logo (Bottom) */}
          <div className="flex flex-col items-center justify-center gap-1">
            <h1 className="text-sm sm:text-base font-black text-gold tracking-tighter uppercase italic leading-none drop-shadow-md">
              ACHOUR PLAYER
            </h1>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border border-gold/40 shadow-md overflow-hidden relative flex items-center justify-center bg-black shrink-0 transition-transform">
              <img 
                src="/logo.jpg" 
                onError={(e) => { e.currentTarget.src = logoImg; }}
                alt="Achour Player" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Column: Clock & Date */}
          <div className="flex items-center justify-end gap-4 min-w-0">
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xs sm:text-sm font-black font-mono text-gold leading-none">
                {currentTime.toLocaleTimeString(settings.language === 'ar' ? 'ar-EG' : settings.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: settings.timeFormat === '12h'
                })}
              </span>
              <span className="text-[9px] font-bold text-zinc-400 font-sans mt-0.5 whitespace-nowrap">
                {currentTime.toLocaleDateString(settings.language === 'ar' ? 'ar-EG' : settings.language, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
            </div>
          </div>
        </div>
      </header>
    )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Column 1: Categories Sidebar - Enlarged for TV & Mobile */}
        <aside className={`w-44 sm:w-56 md:w-64 lg:w-72 bg-black/60 backdrop-blur-md border-r border-white/10 flex flex-col shrink-0 overflow-x-hidden ${isRtl ? 'border-l border-r-0' : ''}`}>
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gold text-xs sm:text-sm font-black uppercase">
              {mediaType === 'movie' ? <Film size={16} /> : mediaType === 'series' ? <Clapperboard size={16} /> : <Tv size={16} />}
              <span>{isRtl ? (mediaType === 'movie' ? 'أقسام الأفلام' : mediaType === 'series' ? 'أقسام المسلسلات' : 'المجموعات') : 'Categories'}</span>
            </div>
            <span className="text-xs font-mono text-zinc-400 font-bold px-2 py-0.5 rounded-md bg-white/10">{visibleCategories.length}</span>
          </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-1">
                {loading && visibleCategories.length === 0 ? (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-3 text-gold text-xs font-bold animate-pulse">
                      <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                      <span></span>
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <div key={n} className="h-10 rounded-xl bg-white/5 border border-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>


                    {visibleCategories.map((cat, catIdx) => (
                      <CategoryButton
                        key={`${cat.category_id}-${catIdx}`}
                        cat={cat}
                        catIdx={catIdx}
                        categories={visibleCategories}
                        isSelected={selectedCategory === cat.category_id}
                        onSelect={setSelectedCategory}
                        mediaType={mediaType}
                        onReorder={mediaType === 'live' ? (item: any) => {
                          setReorderTarget({
                            type: 'category',
                            id: item.category_id,
                            index: item.realIdx,
                            name: item.name
                          });
                          setTargetPosInput(String(item.realIdx + 1));
                        } : undefined}
                      />
                    ))}
                  </>
                )}
              </div>
        </aside>

        {/* Column 2: Channel List / Posters Grid */}
        <section className={`${
          mediaType === 'movie' || mediaType === 'series'
            ? 'flex-1' 
            : 'w-64 sm:w-72 md:w-80 lg:w-96'
        } bg-black/40 backdrop-blur-md border-r border-white/5 flex flex-col shrink-0 transition-all duration-300 ${isRtl ? 'border-l border-r-0' : ''}`}>
          
          <div className="p-2.5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-gold text-[11px] font-black uppercase">
              <Tv size={14} />
              <span>{isRtl ? (mediaType === 'movie' ? 'قائمة الأفلام' : mediaType === 'series' ? 'قائمة المسلسلات' : 'قائمة القنوات') : 'Channels'}</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 font-bold">
              {loading && filteredChannels.length === 0 ? '...' : (selectedCategory === 'recent' ? getRecents().length : filteredChannels.length)}
            </span>
          </div>

          <div className="flex-1 overflow-hidden p-1.5 sm:p-2 outline-none ring-0 border-0">
            {loading && filteredChannels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-gold p-4 text-center">
                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin shadow-lg shadow-gold/20" />
                <span className="text-xs font-bold text-zinc-300">
                </span>
              </div>
            ) : (
            <VirtualizedChannelList
              items={selectedCategory === 'recent' ? getRecents().map((r: any) => ({ ...r, stream_id: r.id })) : filteredChannels}
              selectedChannelId={selectedChannel?.stream_id}
              activePlayingMovieId={activePlayingMovie?.stream_id}
              favorites={favorites}
              isRtl={isRtl}
              mediaType={mediaType}
              onHighlightChannel={handleHighlightChannel}
              onSelectChannel={handleChannelClick}
              onDoubleClickChannel={handleOpenFullscreen}
              onToggleFavorite={toggleFavorite}
              onMoveChannel={(streamId: string, direction: 'up' | 'down', e: React.MouseEvent) => moveChannel(streamId, direction, e)}
              onReorderChannel={mediaType === 'live' ? (item: any) => {
                setReorderTarget({
                  type: 'channel',
                  id: item.stream_id,
                  index: item.realIdx,
                  name: item.name
                });
                setTargetPosInput(String(item.realIdx + 1));
              } : undefined}
              />
            )}
          </div>
        </section>

        {/* Column 3: Small Player Area (Only for Live & Favorites) */}
        {(mediaType === 'live' || mediaType === 'favorites') && (
          <main className="flex-1 flex flex-col bg-black/20 relative min-w-0 h-full overflow-hidden p-2 sm:p-3">
            {/* Top Player Section - Small Video Player */}
            <div 
              data-tv-focusable="true"
              tabIndex={0}
              className="w-full aspect-video max-h-[45%] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold focus:ring-inset"
              onClick={() => selectedChannel && handleOpenFullscreen(selectedChannel)}
            >
              <div id="live-preview-container" className="w-full h-full"></div>
              
              {!selectedChannel && (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-600 flex-col gap-2">
                  <Play size={48} className="opacity-20" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-40">
                    {isRtl ? 'اختر قناة للمعاينة' : 'Select a channel to preview'}
                  </span>
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      {/* Unified Live Player (Preview & Fullscreen) */}
      {(mediaType === 'live' || mediaType === 'favorites') && selectedChannel && (
        <VodPlayerModal
          key="live-player"
          media={selectedChannel}
          mediaType="live"
          isPreview={!isFullscreen}
          containerId="live-preview-container"
          settings={settings}
          isRtl={isRtl}
          onClose={() => {
            if (isFullscreen) {
              setIsFullscreen(false);
              setActiveVodPlayer(null);
              // Focus back on channels list when exiting fullscreen
              setTimeout(() => {
                const chEl = document.querySelector<HTMLElement>(`[data-tv-pane="channels"]`);
                chEl?.focus();
              }, 100);
            } else {
              setSelectedChannel(null);
              setActiveVodPlayer(null);
            }
          }}
          itemsList={filteredChannels}
          epgData={xmltvData}
          onSelectMedia={(next: any) => {
            setSelectedChannel(next);
            setActivePlayingMovie(next);
          }}
        />
      )}

      {/* Rich Movie / Series Details Modal */}
      <AnimatePresence>
        {movieDetailsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/92 backdrop-blur-2xl select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-[90vw] max-w-2xl max-h-[78vh] bg-zinc-950/98 border-2 border-gold/50 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col overflow-hidden ${isRtl ? 'font-cairo text-right' : 'text-left'}`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between pb-2 border-b border-white/10 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2.5 min-w-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-gold/20 text-gold shrink-0">
                    {mediaType === 'movie' ? <Film size={16} /> : <Clapperboard size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider truncate">
                      {movieDetailsModal.name}
                    </h2>
                    <p className="text-[9px] sm:text-[10px] text-gold/80 font-bold uppercase truncate mt-0.5">
                      {movieDetailsModal?.category_name || (mediaType === 'movie' ? 'فيلم سينمائي' : 'مسلسل تلفزيوني')}
                    </p>
                  </div>
                </div>
                <button
                  data-tv-focusable="true"
                  data-tv-modal="details"
                  tabIndex={0}
                  onClick={() => setMovieDetailsModal(null)}
                  className="p-1.5 text-zinc-400 hover:text-white focus:text-gold focus:ring-4 focus:ring-inset focus:ring-gold rounded-full transition-all outline-none"
                  title={isRtl ? 'إغلاق (Esc)' : 'Close (Esc)'}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="py-3 flex flex-col md:flex-row gap-3 sm:gap-4 overflow-y-auto no-scrollbar flex-1">
                {/* Poster Image */}
                <div className="w-20 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden border border-gold/30 shadow-xl shrink-0 mx-auto md:mx-0">
                  <img 
                    src={movieDetailsModal.stream_icon || movieDetailsModal.cover || movieDetailsModal.logo} 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover" 
                    onError={e => e.currentTarget.style.display='none'} 
                    alt="" 
                  />
                </div>

                {/* Details & Episode Selector */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  <div>
                    <h3 className="text-[11px] sm:text-xs font-black uppercase text-gold tracking-widest mb-1">
                      {isRtl ? 'قصة الفيلم / المسلسل' : 'Synopsis & Plot'}
                    </h3>
                    {detailLoading ? (
                      <div className="flex items-center gap-2 py-2 text-gold text-xs font-bold animate-pulse">
                        <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                        <span>{isRtl ? 'جاري تحميل تفاصيل العنوان والحلقات...' : 'Loading details & episodes...'}</span>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed max-h-24 overflow-y-auto no-scrollbar font-medium">
                        {mediaDetailInfo?.info?.plot || mediaDetailInfo?.info?.description || mediaDetailInfo?.info?.overview || mediaDetailInfo?.info?.storyline || mediaDetailInfo?.info?.notes || mediaDetailInfo?.info?.plot_ar || (isRtl ? 'لا تتوفر تفاصيل إضافية لهذا العنوان حالياً. يمكنك النقر على زر التشغيل للمشاهدة المباشرة بالجودة العالية.' : 'No plot description available. Click play to start viewing in high quality.')}
                      </p>
                    )}
                  </div>

                  {mediaDetailInfo?.info?.cast && (
                    <div>
                      <h3 className="text-[11px] sm:text-xs font-black uppercase text-gold tracking-widest mb-0.5">
                        {isRtl ? 'طاقم العمل والممثلون' : 'Cast & Actors'}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate">{mediaDetailInfo.info.cast}</p>
                    </div>
                  )}

                  {/* Subtitles & Audio Languages Badges extracted from subscription */}
                  {Boolean(
                    (mediaDetailInfo?.info?.subtitles && (mediaDetailInfo.info.subtitles.length > 0 || Object.keys(mediaDetailInfo.info.subtitles).length > 0)) ||
                    (mediaDetailInfo?.movie_data?.subtitles && mediaDetailInfo.movie_data.subtitles.length > 0) ||
                    mediaDetailInfo?.info?.audio ||
                    mediaDetailInfo?.info?.audio_streams
                  ) && (
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
                      {/* Available Subtitles */}
                      {Boolean((mediaDetailInfo?.info?.subtitles && (Array.isArray(mediaDetailInfo.info.subtitles) ? mediaDetailInfo.info.subtitles.length > 0 : Object.keys(mediaDetailInfo.info.subtitles).length > 0)) || (mediaDetailInfo?.movie_data?.subtitles && mediaDetailInfo.movie_data.subtitles.length > 0)) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] sm:text-xs text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                            <Layers size={13} />
                            {isRtl ? 'الترجمة المتوفرة:' : 'Subtitles:'}
                          </span>
                          {(Array.isArray(mediaDetailInfo?.info?.subtitles)
                            ? mediaDetailInfo.info.subtitles
                            : Object.values(mediaDetailInfo?.info?.subtitles || mediaDetailInfo?.movie_data?.subtitles || {})
                          ).slice(0, 6).map((sub: any, sIdx: number) => {
                            const code = typeof sub === 'string' ? sub : (sub.language || sub.lang || sub.container || 'ar');
                            return (
                              <span key={sIdx} className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold">
                                {formatLanguageLabel(code, sIdx, 'subtitle')}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Available Audio Tracks */}
                      {Boolean(mediaDetailInfo?.info?.audio || mediaDetailInfo?.info?.audio_streams) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] sm:text-xs text-red-400 font-bold flex items-center gap-1 shrink-0">
                            <Volume2 size={13} />
                            {isRtl ? 'لغات الصوت:' : 'Audio:'}
                          </span>
                          {(Array.isArray(mediaDetailInfo?.info?.audio || mediaDetailInfo?.info?.audio_streams)
                            ? (mediaDetailInfo?.info?.audio || mediaDetailInfo?.info?.audio_streams)
                            : [mediaDetailInfo?.info?.audio || mediaDetailInfo?.info?.audio_streams]
                          ).slice(0, 6).map((aud: any, aIdx: number) => {
                            const code = typeof aud === 'string' ? aud : (aud.language || aud.lang || 'Stereo');
                            return (
                              <span key={aIdx} className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] sm:text-[10px] font-bold">
                                {formatLanguageLabel(code, aIdx, 'audio')}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seasons & Episodes Selector for Series */}
                  {(mediaType === 'series' || seriesSeasonsData.length > 0) && (
                    <div className="mt-1 space-y-2 border-t border-white/10 pt-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-gold tracking-widest">
                          {isRtl ? 'المواسم والحلقات' : 'Seasons & Episodes'}
                        </h3>
                        <span className="text-[10px] sm:text-xs text-zinc-400 font-bold">
                          {seriesSeasonsData.length} {isRtl ? 'مواسم' : 'Seasons'}
                        </span>
                      </div>

                      {/* Season Tabs */}
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        {seriesSeasonsData.map((s, sIdx) => {
                          const isSelected = selectedSeasonNum === s.seasonNumber;
                          return (
                            <button
                              key={`${s.seasonNumber}-${sIdx}`}
                              data-tv-focusable="true"
                              data-tv-modal="details"
                              data-season-tab="true"
                              tabIndex={0}
                              onClick={() => setSelectedSeasonNum(s.seasonNumber)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-105 ${
                                isSelected
                                  ? 'bg-gold text-black border-gold shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                                  : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:border-gold/40'
                              }`}
                            >
                              {s.title}
                            </button>
                          );
                        })}
                      </div>

                      {/* Episodes List */}
                      <div className="max-h-40 sm:max-h-48 overflow-y-auto no-scrollbar space-y-2 pr-1">
                        {(seriesSeasonsData.find(s => s.seasonNumber === selectedSeasonNum)?.episodes || seriesSeasonsData[0]?.episodes || []).map((ep: ParsedChannel, epIdx: number) => (
                          <div
                            key={`${ep.stream_id}-${epIdx}`}
                            data-tv-focusable="true"
                            data-tv-modal="details"
                            data-episode-item="true"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedChannel(ep);
                              setActivePlayingMovie(ep);
                              setActiveVodPlayer(ep);
                              setMovieDetailsModal(null);
                            }}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-black/60 border border-white/10 hover:border-gold/60 hover:bg-gold/15 focus:ring-4 focus:ring-inset focus:ring-gold focus:border-gold focus:bg-gold/25 focus:scale-[1.01] transition-all group cursor-pointer outline-none"
                          >
                              <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center text-gold font-mono font-bold group-hover:scale-110 shrink-0 transition-transform">
                                {ep.episode || epIdx + 1}
                              </div>
                              <div className="min-w-0 flex-1 ml-3">
                                <p className="text-xs sm:text-sm font-bold text-white group-hover:text-gold transition-colors truncate">
                                  {ep.name}
                                </p>
                              </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Sticky Action Buttons in Footer */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2 shrink-0">
                {mediaType === 'movie' && (
                  <button
                    data-tv-focusable="true"
                    data-tv-modal="details"
                    data-tv-play-now="true"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedChannel(movieDetailsModal);
                      setActivePlayingMovie(movieDetailsModal);
                      setActiveVodPlayer(movieDetailsModal);
                      setMovieDetailsModal(null);
                    }}
                    className="px-3.5 py-1 bg-gold hover:bg-gold/90 text-black rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-white transition-all shadow-sm"
                  >
                    <Play size={12} className="fill-black" />
                    <span>{isRtl ? 'تشغيل' : 'Play'}</span>
                  </button>
                )}
                <button
                  data-tv-focusable="true"
                  data-tv-modal="details"
                  tabIndex={0}
                  onClick={() => toggleFavorite(movieDetailsModal.stream_id)}
                  className={`p-1.5 rounded-md border transition-all outline-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-white flex items-center justify-center ${
                    favorites.includes(movieDetailsModal.stream_id) ? 'bg-gold text-black border-gold' : 'bg-white/5 border-white/10 text-zinc-300 hover:border-gold'
                  }`}
                  title={isRtl ? 'المفضلة' : 'Favorite'}
                >
                  <Star size={13} className={favorites.includes(movieDetailsModal.stream_id) ? 'fill-black' : ''} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Position Reorder & Channel Actions Strip Modal */}
      <AnimatePresence>
        {reorderTarget && (
          <PositionEditModal
            type={reorderTarget.type}
            id={reorderTarget.id}
            name={reorderTarget.name}
            currentIndex={reorderTarget.index}
            language={settings.language}
            onClose={() => setReorderTarget(null)}
            onSave={(newPos) => moveItemToPosition(reorderTarget.type, reorderTarget.id, newPos, true)}
            onToggleFavorite={reorderTarget.type === 'channel' ? () => toggleFavorite(reorderTarget.id) : undefined}
            isFavorite={favorites.includes(reorderTarget.id)}
          />
        )}
      </AnimatePresence>

      {/* Dedicated Player Modal for Movies & Series (Only non-live) */}
      {activeVodPlayer && (mediaType === 'movie' || mediaType === 'series') && (
        <VodPlayerModal
          media={activeVodPlayer}
          mediaType={activeVodPlayer.type || (mediaType === 'series' ? 'series' : 'movie')}
          activePlaylist={activePlaylist}
          settings={settings}
          isRtl={isRtl}
          onClose={() => setActiveVodPlayer(null)}
          episodesList={mediaType === 'series' ? (seriesSeasonsData.find(s => s.seasonNumber === selectedSeasonNum)?.episodes || seriesSeasonsData.flatMap(s => s.episodes)) : undefined}
          itemsList={filteredChannels}
          epgData={xmltvData}
          onSelectMedia={(next: any) => {
            setActiveVodPlayer(next);
            setSelectedChannel(next);
            setActivePlayingMovie(next);
          }}
          onToggleFavorite={(item: any) => {
            if (item?.stream_id) toggleFavorite(item.stream_id);
          }}
          isFavorite={activeVodPlayer?.stream_id ? favorites.includes(activeVodPlayer.stream_id) : false}
        />
      )}


      {/* Parental PIN Modal */}
      {showPinModal && activePlaylist?.pin && (
        <PinUnlockModal
          isOpen={showPinModal}
          onClose={onBack}
          onSuccess={() => {
            setIsUnlocked(true);
            setShowPinModal(false);
          }}
          correctPin={activePlaylist.pin}
          playlistName={activePlaylist.name}
          language={settings.language}
        />
      )}
      {showEpgGrid && (
        <EPGGrid
          isOpen={showEpgGrid}
          onClose={() => setShowEpgGrid(false)}
          channels={channels.filter(c => !isMovieItem(c.name) && !isSeriesItem(c.name)).map((c: any) => ({
            id: c.stream_id || c.id || String(Math.random()),
            name: c.name,
            logo: c.logo || c.stream_icon,
            url: c.url || '',
            category: c.category || c.category_id || 'عام',
            category_id: c.category_id || c.category || 'general',
            type: 'live' as const,
            stream_id: c.stream_id
          }))}
          epgData={xmltvData}
          onSelectChannel={(ch) => {
            const found = channels.find((c: any) => (c.stream_id === ch.stream_id) || (c.id === ch.id) || (c.name === ch.name));
            if (found) setSelectedChannel(found);
            setShowEpgGrid(false);
          }}
          settings={settings}
        />
      )}
      {showOcr && (
        <AIOcrModal 
          onClose={() => setShowOcr(false)} 
          onSelectChannel={(name) => {
            setSearch(name);
            setShowOcr(false);
          }} 
          language={settings.language}
        />
      )}
    </div>
  );
}
