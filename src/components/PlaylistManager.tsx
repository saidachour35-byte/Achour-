import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Plus, Trash2, Globe, Server, Link as LinkIcon, 
  Upload, CheckCircle2, Check, Lock, Tv, AlertCircle, Copy, Eye, 
  EyeOff, FileText, Sparkles, RefreshCw, Layers, ShieldCheck, Film, Clapperboard
} from 'lucide-react';
import axios from 'axios';
import { AppSettings, Playlist, PlaylistType } from '../types';
import { useI18n } from '../utils/i18n';
import PinUnlockModal from './PinUnlockModal';
import { parseExpiryDate } from '../utils/subscription';
import { getPlatformUrl } from '../utils/platform';
import { pushBackHandler, BackPriority } from '../utils/tvNavigation';
import { testXtreamConnection, iptvGlobalCache } from '../utils/iptv';
import { initDB, clearPlaylistData } from '../lib/db';

interface PlaylistManagerProps {
  userId: string;
  settings: AppSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onBack: () => void;
}

export default function PlaylistManager({ userId, settings, onUpdateSettings, onBack }: PlaylistManagerProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<PlaylistType>('xtream');
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    macAddress: '00:1A:79:',
    epgUrl: ''
  });
  const [isProtected, setIsProtected] = useState(false);
  const [pin, setPin] = useState('');
  const [selectedPendingPlaylist, setSelectedPendingPlaylist] = useState<Playlist | null>(null);

  // Link Inspector & View Modal state
  const [inspectPlaylist, setInspectPlaylist] = useState<Playlist | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register pushBackHandler for PlaylistManager
  useEffect(() => {
    const priority = (inspectPlaylist || selectedPendingPlaylist) ? BackPriority.SUBVIEW : BackPriority.VIEW;
    const unregister = pushBackHandler(() => {
      if (inspectPlaylist) {
        setInspectPlaylist(null);
        return true;
      }
      if (selectedPendingPlaylist) {
        setSelectedPendingPlaylist(null);
        return true;
      }
      onBack();
      return true;
    }, priority);
    return unregister;
  }, [inspectPlaylist, selectedPendingPlaylist, onBack]);


  // File Upload State
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (!formData.name.trim()) {
      setFormData(prev => ({ ...prev, name: file.name.replace(/\.(m3u|m3u8|txt)$/i, '') }));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setUploadedFileContent(text);
        setFormData(prev => ({ ...prev, url: 'local_file://' + file.name }));
      }
    };
    reader.readAsText(file);
  };

  const { t, isRtl } = useI18n(settings.language);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const rawLocal = localStorage.getItem('achour_local_playlists');
      const localList: Playlist[] = rawLocal ? JSON.parse(rawLocal) : [];

      let firestoreList: Playlist[] = [];
      const playlistsPath = 'playlists';
      try {
        const q = query(collection(db, playlistsPath), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        firestoreList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Playlist[];
      } catch (fireErr) {
        console.warn('Could not fetch remote playlists (using offline cache):', fireErr);
      }


      // Merge avoiding duplicates by id
      const combinedMap = new Map<string, Playlist>();
      localList.forEach(p => combinedMap.set(p.id, p));
      firestoreList.forEach(p => combinedMap.set(p.id, p));
      const fetched = Array.from(combinedMap.values());

      // Fetch expiration dates for Xtream playlists
      const playlistsWithExp = await Promise.all(fetched.map(async (p) => {
        if (p.type === 'xtream' && p.url && p.username && p.password && !p.expDate) {
          try {
            const fetchUrl = getPlatformUrl('xtream', p.url, {
              username: p.username,
              password: p.password,
              action: 'auth'
            });
            const res = await axios.get(fetchUrl);
            const exp = res.data?.user_info?.exp_date;
            return { ...p, expDate: exp };
          } catch (e) {

            return p;
          }
        }
        return p;
      }));

      setPlaylists(playlistsWithExp);
      
      if (!settings.activePlaylistId && playlistsWithExp.length > 0) {
        onUpdateSettings(prev => ({ ...prev, activePlaylistId: playlistsWithExp[0].id }));
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTrialPlaylists = async () => {
    const trialName = 'Achour TV Trial (قنوات وأفلام تجريبية)';
    // Remove from local storage
    try {
      const rawLocal = localStorage.getItem('achour_local_playlists');
      if (rawLocal) {
        const list: Playlist[] = JSON.parse(rawLocal);
        const filtered = list.filter(p => p.name !== trialName);
        localStorage.setItem('achour_local_playlists', JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Local playlist delete error', e);
    }

    // Remove from Firestore
    const playlistsPath = 'playlists';
    try {
      const q = query(collection(db, playlistsPath), where('userId', '==', userId), where('name', '==', trialName));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, playlistsPath, docSnap.id));
      }
    } catch (fireErr) {
      handleFirestoreError(fireErr, OperationType.DELETE, playlistsPath);
    }
    
    fetchPlaylists();
  };

  useEffect(() => {
    deleteTrialPlaylists();
  }, []);

  const activePlaylist = React.useMemo(() => {
    return playlists.find(p => p.id === settings.activePlaylistId) || playlists[0] || null;
  }, [playlists, settings.activePlaylistId]);

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedUrl = formData.url.trim();
    if (!trimmedUrl) {
      setUploadSuccessToast(isRtl ? 'يرجى إدخال الرابط أولاً' : 'Please provide a URL first');
      setTimeout(() => setUploadSuccessToast(null), 3000);
      return;
    }

    // Auto-generate name if empty
    let playlistName = formData.name.trim();
    if (!playlistName) {
      try {
        const u = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : 'http://' + trimmedUrl);
        playlistName = u.hostname || (type === 'xtream' ? 'اشتراك Xtream' : type === 'stalker' ? 'بورتال Stalker' : 'قائمة قنوات M3U');
      } catch (e) {
        playlistName = type === 'xtream' ? 'اشتراك Xtream' : type === 'stalker' ? 'بورتال Stalker' : 'قائمة قنوات M3U';
      }
    }

    let cleanUrl = trimmedUrl.replace(/\/+$/, '');
    let extractedUser = formData.username.trim();
    let extractedPass = formData.password.trim();
    let detectedType = type;
    let finalContent = uploadedFileContent || '';

    if (detectedType === 'm3u') {
      if (trimmedUrl.startsWith('#EXTM3U') || trimmedUrl.startsWith('#EXTINF') || trimmedUrl.includes('#EXTINF:')) {
        finalContent = trimmedUrl;
        const fileName = 'pasted_' + Date.now();
        cleanUrl = 'local_file://' + fileName;
      } else if (uploadedFileContent) {
        const fileName = uploadedFileName || ('file_' + Date.now());
        cleanUrl = 'local_file://' + fileName;
      }
    }

    // Auto-extract credentials from URL query parameters (Xtream / M3U)
    if (!cleanUrl.startsWith('local_file://')) {
      try {
        const testUrl = new URL(cleanUrl.startsWith('http') ? cleanUrl : 'http://' + cleanUrl);
        const u = testUrl.searchParams.get('username');
        const p = testUrl.searchParams.get('password');
        if (u && p) {
          extractedUser = extractedUser || u;
          extractedPass = extractedPass || p;
          if (detectedType === 'xtream') {
            cleanUrl = testUrl.origin;
          }
        }
      } catch (e) {}
    }

    // Validation per type
    if (detectedType === 'xtream') {
      cleanUrl = cleanUrl.replace(/\/(player_api|get|index)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\?.*$/, '').replace(/\/+$/, '');
      if (!extractedUser || !extractedPass) {
        setUploadSuccessToast(isRtl ? 'يرجى إدخال اسم المستخدم وكلمة السر لااشتراك اكستريم' : 'Please enter Xtream username and password');
        setTimeout(() => setUploadSuccessToast(null), 3000);
        return;
      }
    }
    if (detectedType === 'stalker' && !formData.macAddress.trim()) {
      setUploadSuccessToast(isRtl ? 'يرجى إدخال عنوان MAC' : 'Please provide Stalker MAC address');
      setTimeout(() => setUploadSuccessToast(null), 3000);
      return;
    }

    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('local_file://')) {
      cleanUrl = 'http://' + cleanUrl;
    }

    setIsSubmitting(true);
    try {
      const playlistPayload: any = {
        name: playlistName,
        type: detectedType,
        url: cleanUrl,
        portal: cleanUrl,
        m3uContent: finalContent || undefined,
        username: detectedType === 'xtream' ? extractedUser : (extractedUser || undefined),
        password: detectedType === 'xtream' ? extractedPass : (extractedPass || undefined),
        userId: userId,
        createdAt: serverTimestamp()
      };

      // 1. Always save in localStorage first to guarantee immediate access
      const localId = 'pl_' + Date.now();
      const localItem: Playlist = {
        id: localId,
        ...playlistPayload,
        createdAt: new Date().toISOString()
      };
      try {
        const rawLocal = localStorage.getItem('achour_local_playlists');
        const list: Playlist[] = rawLocal ? JSON.parse(rawLocal) : [];
        localStorage.setItem('achour_local_playlists', JSON.stringify([localItem, ...list]));
      } catch (err) {
        console.warn('LocalStorage save warning', err);
      }

      // 2. Try saving to Firestore in background without breaking execution
      let finalId = localId;
      const playlistsPath = 'playlists';
      try {
        const docRef = await addDoc(collection(db, playlistsPath), playlistPayload);
        finalId = docRef.id;
      } catch (err) {
        console.warn('Firestore sync warning (stored locally):', err);
      }

      setFormData({ name: '', url: '', username: '', password: '', macAddress: '', epgUrl: '' });
      setIsProtected(false);
      setPin('');
      onUpdateSettings(prev => ({ ...prev, activePlaylistId: finalId }));
      setUploadSuccessToast(isRtl ? `تم جلب وحفظ "${playlistName}" بنجاح!` : `Playlist "${playlistName}" fetched & activated successfully!`);
      setTimeout(() => setUploadSuccessToast(null), 3500);
      await fetchPlaylists();
    } catch (err) {
      console.error('Error adding playlist:', err);
      setUploadSuccessToast(isRtl ? 'حدث خطأ أثناء حفظ القائمة، يرجى التحقق من الرابط' : 'Error saving playlist. Please check URL');
      setTimeout(() => setUploadSuccessToast(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Cleanly clear cached channels, categories, and extraction metadata for this account only
      await clearPlaylistData(id);

      // Remove from local storage
      try {
        const rawLocal = localStorage.getItem('achour_local_playlists');
        if (rawLocal) {
          const list: Playlist[] = JSON.parse(rawLocal);
          localStorage.setItem('achour_local_playlists', JSON.stringify(list.filter(p => p.id !== id)));
        }
      } catch (e) {
        console.warn('Local playlist delete error', e);
      }

      // Try remove from Firestore
      const playlistPath = `playlists/${id}`;
      try {
        await deleteDoc(doc(db, 'playlists', id));
      } catch (fireErr) {
        handleFirestoreError(fireErr, OperationType.DELETE, playlistPath);
      }

      if (settings.activePlaylistId === id) {
        const remaining = playlists.filter(p => p.id !== id);
        onUpdateSettings(prev => ({ ...prev, activePlaylistId: remaining[0]?.id || null }));
      }
      fetchPlaylists();
    } catch (err) {
      console.error('Error deleting playlist:', err);
    }
  };

  const handleSelect = async (p: Playlist) => {
    if (p.isProtected && p.pin) {
      setSelectedPendingPlaylist(p);
    } else {
      iptvGlobalCache.clear();
      onUpdateSettings(prev => ({ ...prev, activePlaylistId: p.id }));
      setUploadSuccessToast(isRtl ? `تم تفعيل القائمة: ${p.name}` : `Activated playlist: ${p.name}`);
      setTimeout(() => setUploadSuccessToast(null), 3000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };


  return (
    <div className={`min-h-screen bg-black/40 backdrop-blur-md p-4 sm:p-6 pb-36 flex flex-col select-none overflow-y-auto scrollbar-hide ${isRtl ? 'font-cairo' : ''}`}>
      {/* Header */}
      <header className={`w-full max-w-6xl mx-auto flex items-center justify-between mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <button 
          tabIndex={-1}
          onClick={onBack}
          className="p-3 glass-card rounded-full text-white hover:bg-gold hover:text-black transition-all shadow-lg active:scale-90 outline-none pointer-events-auto select-none"
          title={isRtl ? 'رجوع' : 'Back'}
        >
          <ChevronLeft size={22} className={isRtl ? 'rotate-180' : ''} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-base sm:text-lg font-black tracking-[0.3em] uppercase text-gold/90">{t('playlist')}</h1>
          <span className="text-[11px] text-zinc-400 font-bold uppercase mt-0.5">
            {isRtl ? 'إدارة روابط وقوائم القنوات وملفات M3U' : 'Playlists, M3U Files & Links Manager'}
          </span>
        </div>
        <div className="w-10" />
      </header>

      {/* Toast Notification */}
      <AnimatePresence>
        {uploadSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-zinc-950/95 border border-gold/50 text-gold rounded-2xl shadow-2xl text-xs font-bold backdrop-blur-md"
          >
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span>{uploadSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-6xl mx-auto space-y-6">

        {/* 1. FEATURE: ACTIVE PLAYLIST & LINK INSPECTOR */}
        {activePlaylist && (
          <div className="glass-card p-4 sm:p-5 rounded-3xl border border-gold/40 relative overflow-hidden shadow-2xl bg-gradient-to-br from-gold/10 via-black/40 to-black/60">
            <div className={`flex items-center justify-between gap-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-3.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className="p-3 rounded-2xl bg-gold text-black shadow-lg shadow-gold/20 shrink-0">
                  {activePlaylist.type === 'xtream' ? <Server size={24} /> : activePlaylist.type === 'stalker' ? <Tv size={24} /> : <Globe size={24} />}
                </div>
                <div>
                  <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <h2 className="text-base font-black text-white uppercase tracking-wider">{activePlaylist.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold">
                      {isRtl ? '🟢 مفعّلة ونشطة حالياً' : '🟢 Active & Ready'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {isRtl ? 'هذه القائمة هي المصدر المعتمد لتشغيل البث المباشر والأفلام والمسلسلات' : 'Current active source for live streaming, movies, and series'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. GRID: ALL PLAYLISTS LIST & ADD NEW PLAYLIST LINK */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Saved Playlists */}
          <section className="lg:col-span-7 space-y-4">
            <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">
                {isRtl ? 'قوائم القنوات المحفوظة' : 'Saved Channel Lists'} ({playlists.length})
              </h2>
              <span className="text-[10px] text-zinc-500">
                {isRtl ? 'انقر على أي قائمة لتفعيلها ومشاهدة محتواها' : 'Click any list to activate it'}
              </span>
            </div>

            <div className="space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-20 glass-card rounded-2xl animate-pulse" />
                ))
              ) : playlists.length === 0 ? (
                <div className="p-12 glass-card rounded-3xl border border-dashed border-zinc-800 text-center">
                  <Globe className="mx-auto text-zinc-700 mb-3" size={40} />
                  <p className="text-zinc-500 font-bold uppercase tracking-wider text-xs">
                    {isRtl ? 'لا توجد قوائم قنوات مضافة حالياً. أضف رابط M3U أو اشتراك Xtream من النموذج الجانبي' : 'No playlists saved yet. Add an M3U or Xtream link from the form.'}
                  </p>
                </div>
              ) : (
                playlists.map((p, pIdx) => {
                  const isActive = settings.activePlaylistId === p.id;
                  return (
                    <div
                      key={`${p.id}-${pIdx}`}
                      onClick={() => handleSelect(p)}
                      className={`flex items-center justify-between p-4 glass-card rounded-2xl border transition-all cursor-pointer group relative ${
                        isActive 
                          ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.2)]' 
                          : 'border-white/5 hover:border-gold/40 hover:bg-white/5'
                      } ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}
                    >
                      <div className={`flex items-center gap-3.5 min-w-0 flex-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                          isActive ? 'bg-gold text-black shadow-md' : 'bg-gold/15 text-gold'
                        }`}>
                          {p.type === 'xtream' ? <Server size={20} /> : p.type === 'stalker' ? <Tv size={20} /> : <FileText size={20} />}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <span className={`font-black text-xs sm:text-sm truncate ${isActive ? 'text-gold' : 'text-zinc-100'}`}>
                              {p.name}
                            </span>
                            {p.isProtected && <Lock size={12} className="text-gold shrink-0" />}
                            {isActive && (
                              <span className="px-2 py-0.2 bg-gold/20 text-gold rounded font-bold text-[9px] uppercase shrink-0">
                                {isRtl ? 'مُفعّل' : 'Active'}
                              </span>
                            )}
                            {(() => {
                              const expInfo = parseExpiryDate(p.expDate, isRtl);
                              if (!expInfo.hasDate) return null;
                              return (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                                  expInfo.isExpired 
                                    ? 'bg-red-500/20 text-red-400' 
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {isRtl ? `انتهاء: ${expInfo.formattedDate}` : `Exp: ${expInfo.formattedDate}`}
                                </span>
                              );
                            })()}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">
                            {p.url || (p.type === 'xtream' ? `${p.username} @ ${p.url}` : 'M3U Channels')}
                          </span>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        {/* Test Connection Button */}
                        {p.type === 'xtream' && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Add a loading state here if needed
                              const res = await testXtreamConnection(p.url || '', p.username || '', p.password || '');
                              setUploadSuccessToast(res.isSuccess ? (isRtl ? 'الاتصال ناجح!' : 'Connection successful!') : (isRtl ? 'فشل الاتصال: ' + (res.error || 'خطأ غير معروف') : 'Connection failed: ' + (res.error || 'Unknown error')));
                              setTimeout(() => setUploadSuccessToast(null), 5000);
                            }}
                            className="p-2 text-zinc-400 hover:text-gold hover:bg-gold/10 rounded-xl transition-all"
                            title={isRtl ? 'فحص الاتصال' : 'Test Connection'}
                          >
                            <ShieldCheck size={16} />
                          </button>
                        )}
                        
                        {/* Inspect Link Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectPlaylist(p);
                          }}
                          className="p-2 text-zinc-400 hover:text-gold hover:bg-gold/10 rounded-xl transition-all"
                          title={isRtl ? 'رؤية الرابط والبيانات' : 'View Link & Details'}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Delete Button */}
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDelete(p.id); 
                          }} 
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                          title={isRtl ? 'حذف القائمة' : 'Delete Playlist'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Add New Playlist Form */}
          <section className="lg:col-span-5 bg-white/5 backdrop-blur-3xl p-5 sm:p-6 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
            <h2 className={`text-sm font-black uppercase tracking-widest text-gold ${isRtl ? 'text-right' : 'text-left'}`}>
              {t('add_playlist')}
            </h2>
            
            {/* Two Independent Server Cards: XTREAM CODES vs M3U PLAYLIST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: XTREAM CODES API */}
              <div
                role="button"
                tabIndex={0}
                data-tv-focusable="true"
                onClick={() => setType('xtream')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Select') setType('xtream'); }}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group outline-none focus:ring-4 focus:ring-gold ${
                  type === 'xtream'
                    ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                    : 'border-white/10 bg-black/50 hover:border-gold/30 hover:bg-white/5'
                }`}
              >
                <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-2 rounded-xl ${type === 'xtream' ? 'bg-gold text-black' : 'bg-white/10 text-gold'}`}>
                    <Server size={18} />
                  </div>
                  {type === 'xtream' && (
                    <span className="px-2 py-0.5 bg-gold text-black font-black text-[9px] uppercase rounded">
                      {isRtl ? 'مُحدد' : 'Selected'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className={`text-xs font-black uppercase text-white group-hover:text-gold ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('xtream_codes')}
                  </h3>
                </div>
              </div>

              {/* Card 2: M3U PLAYLIST & FILE */}
              <div
                role="button"
                tabIndex={0}
                data-tv-focusable="true"
                onClick={() => setType('m3u')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Select') setType('m3u'); }}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group outline-none focus:ring-4 focus:ring-gold ${
                  type === 'm3u'
                    ? 'border-gold bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                    : 'border-white/10 bg-black/50 hover:border-gold/30 hover:bg-white/5'
                }`}
              >
                <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-2 rounded-xl ${type === 'm3u' ? 'bg-gold text-black' : 'bg-white/10 text-gold'}`}>
                    <Globe size={18} />
                  </div>
                  {type === 'm3u' && (
                    <span className="px-2 py-0.5 bg-gold text-black font-black text-[9px] uppercase rounded">
                      {isRtl ? 'مُحدد' : 'Selected'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className={`text-xs font-black uppercase text-white group-hover:text-gold ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'رابط M3U أو ملف قنوات' : 'M3U Playlist & File'}
                  </h3>
                </div>
              </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-3.5">
              <div className="space-y-1">
                <label className={`text-[10px] font-black text-zinc-400 uppercase tracking-widest block ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'اسم القائمة' : 'Playlist Name'}
                </label>
                <input 
                  required
                  disabled={isSubmitting}
                  className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus:border-gold/50 outline-none transition-all text-xs font-medium text-white disabled:opacity-50 ${isRtl ? 'text-right' : 'text-left'}`}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isRtl ? 'مثال: اشتراك القنوات الملكي' : 'My IPTV Playlist'}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black text-zinc-400 uppercase tracking-widest block ${isRtl ? 'text-right' : 'text-left'}`}>
                  {type === 'xtream' ? (isRtl ? 'رابط السيرفر (Server Host)' : 'Server Host') : (isRtl ? 'رابط M3U أو نص الملاحظات' : 'M3U Link or Text')}
                </label>
                <input 
                  required
                  disabled={isSubmitting}
                  className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus:border-gold/50 outline-none transition-all text-xs font-mono text-white disabled:opacity-50 ${isRtl ? 'text-right' : 'text-left'}`}
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  placeholder={type === 'xtream' ? 'http://server.com:8080' : 'http://server.com/get.php?...'}
                />
              </div>

              {type === 'xtream' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`text-[10px] font-black text-zinc-400 uppercase tracking-widest block ${isRtl ? 'text-right' : 'text-left'}`}>{t('username')}</label>
                    <input 
                      required
                      disabled={isSubmitting}
                      className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus:border-gold/50 outline-none transition-all text-xs font-mono text-white disabled:opacity-50 ${isRtl ? 'text-right' : 'text-left'}`}
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Username"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[10px] font-black text-zinc-400 uppercase tracking-widest block ${isRtl ? 'text-right' : 'text-left'}`}>{t('password')}</label>
                    <input 
                      required
                      type="password"
                      disabled={isSubmitting}
                      className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus:border-gold/50 outline-none transition-all text-xs font-mono text-white disabled:opacity-50 ${isRtl ? 'text-right' : 'text-left'}`}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••"
                    />
                  </div>
                </div>
              )}

              {/* Progress & Status indicator during verification/loading */}
              {isSubmitting && (
                <div className="p-3 rounded-xl bg-gold/10 border border-gold/40 flex items-center gap-3 text-gold">
                  <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin shrink-0" />
                  <div className="flex flex-col text-xs font-bold text-zinc-200">
                    <span className="text-gold font-black">{isRtl ? 'جاري فحص وتجهيز القائمة...' : 'Verifying and loading playlist...'}</span>
                    <span className="text-[10px] text-zinc-400">{isRtl ? 'يتم الاتصال بالسيرفر وجلب القنوات وتفعيلها' : 'Connecting to server and caching channels...'}</span>
                  </div>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gold hover:bg-gold/90 text-black font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md text-xs mt-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>{isRtl ? 'جاري الحفظ والتحميل...' : 'Saving & Loading...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{isRtl ? 'حفظ وتفعيل الرابط' : 'Save & Activate Link'}</span>
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* 4. MODAL: VIEW & INSPECT LINK DETAILS (ممكن رؤيته في أي وقت) */}
      <AnimatePresence>
        {inspectPlaylist && (
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
              className={`w-full max-w-lg bg-zinc-950 border border-gold/50 rounded-3xl p-6 shadow-2xl flex flex-col space-y-4 ${isRtl ? 'font-cairo text-right' : 'text-left'}`}
            >
              <div className={`flex items-center justify-between pb-3 border-b border-white/10 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2.5 rounded-xl bg-gold text-black">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {inspectPlaylist.name}
                    </h3>
                    <span className="text-[10px] text-gold font-mono uppercase font-bold">
                      {inspectPlaylist.type} Playlist
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setInspectPlaylist(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Details List */}
              <div className="space-y-3 py-2 text-xs">
                {/* Full Link / Host */}
                <div className="space-y-1">
                  <div className={`flex items-center justify-between text-zinc-400 text-[11px] font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span>{isRtl ? 'رابط السيرفر أو القائمة:' : 'Server / M3U Link:'}</span>
                    <button
                      onClick={() => copyToClipboard(inspectPlaylist.url || '')}
                      className="text-gold hover:underline flex items-center gap-1 text-[10px]"
                    >
                      <Copy size={12} />
                      <span>{copiedLink ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الرابط' : 'Copy')}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-black/60 rounded-xl border border-white/10 font-mono text-gold text-[11px] break-all select-all">
                    {inspectPlaylist.url || 'local_file://...'}
                  </div>
                </div>

                {/* EPG URL in Inspector */}
                {inspectPlaylist.epgUrl && (
                  <div className="space-y-1">
                    <span className="text-zinc-400 text-[11px] font-bold block">{isRtl ? 'رابط EPG:' : 'EPG URL:'}</span>
                    <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 font-mono text-gold text-[11px] select-all truncate">
                      {inspectPlaylist.epgUrl}
                    </div>
                  </div>
                )}

                {/* Xtream Credentials if applicable */}
                {inspectPlaylist.type === 'xtream' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <span className="text-zinc-400 text-[11px] font-bold block">{isRtl ? 'اسم المستخدم:' : 'Username:'}</span>
                      <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 font-mono text-white text-[11px] select-all">
                        {inspectPlaylist.username || '-'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className={`flex items-center justify-between text-zinc-400 text-[11px] font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span>{isRtl ? 'كلمة المرور:' : 'Password:'}</span>
                        <button onClick={() => setShowPassword(!showPassword)} className="text-zinc-500 hover:text-gold">
                          {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 font-mono text-white text-[11px]">
                        {showPassword ? (inspectPlaylist.password || '-') : '••••••••'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stalker MAC Address */}
                {inspectPlaylist.type === 'stalker' && inspectPlaylist.macAddress && (
                  <div className="space-y-1 pt-1">
                    <span className="text-zinc-400 text-[11px] font-bold block">{isRtl ? 'عنوان MAC:' : 'MAC Address:'}</span>
                    <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 font-mono text-gold text-[11px] select-all">
                      {inspectPlaylist.macAddress}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className={`pt-3 border-t border-white/10 flex items-center justify-between gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => {
                    handleSelect(inspectPlaylist);
                    setInspectPlaylist(null);
                  }}
                  className="px-5 py-2.5 bg-gold text-black rounded-xl text-xs font-black uppercase hover:bg-gold/80 transition-all shadow-md"
                >
                  {isRtl ? 'تفعيل هذه القائمة الآن' : 'Activate Playlist'}
                </button>
                <button
                  onClick={() => setInspectPlaylist(null)}
                  className="px-4 py-2.5 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all"
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parental PIN Modal on Select */}
      {selectedPendingPlaylist && selectedPendingPlaylist.pin && (
        <PinUnlockModal
          isOpen={true}
          onClose={() => setSelectedPendingPlaylist(null)}
          onSuccess={async () => {
            iptvGlobalCache.clear();
            onUpdateSettings(prev => ({ ...prev, activePlaylistId: selectedPendingPlaylist.id }));
            setSelectedPendingPlaylist(null);
          }}
          correctPin={selectedPendingPlaylist.pin}
          playlistName={selectedPendingPlaylist.name}
          language={settings.language}
        />
      )}
    </div>
  );
}
