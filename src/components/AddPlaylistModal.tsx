import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Globe, Server, Tv, Lock, Upload, 
  Check, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles 
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppSettings, Playlist, PlaylistType } from '../types';
import { useI18n } from '../utils/i18n';
import { sanitizeM3uUrl } from '../utils/iptv';
import { fetchLiveSubscriptionExpiry } from '../utils/subscription';
import { pushBackHandler, BackPriority } from '../utils/tvNavigation';

interface AddPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPlaylistAdded: (playlistId: string) => void;
  language: AppSettings['language'];
}

export default function AddPlaylistModal({
  isOpen,
  onClose,
  userId,
  onPlaylistAdded,
  language
}: AddPlaylistModalProps) {
  const { t, isRtl } = useI18n(language);
  const [tab, setTab] = useState<PlaylistType>('xtream');
  const [name, setName] = useState('');
  
  // Xtream fields
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // M3U fields
  const [m3uUrl, setM3uUrl] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAIScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const response = await fetch('/api/gemini/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 })
        });
        const data = await response.json();
        if (data.result) {
          try {
            // Clean Markdown if model returns it
            const jsonStr = data.result.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed.host) setHost(parsed.host);
            if (parsed.username) setUsername(parsed.username);
            if (parsed.password) setPassword(parsed.password);
            if (parsed.type) setTab(parsed.type);
            
            if (parsed.host && parsed.username) {
              setName(parsed.host.replace(/https?:\/\//, '').split(':')[0] || 'AI Extracted');
            }
          } catch (e) {
            setError(isRtl ? 'لم يتم العثور على بيانات صالحة في الصورة' : 'No valid credentials found in image');
          }
        }
      } catch (err) {
        setError(isRtl ? 'فشل تحليل الذكاء الاصطناعي' : 'AI Analysis failed');
      } finally {
        setAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (!name.trim()) {
      setName(file.name.replace(/\.(m3u|m3u8|txt)$/i, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setUploadedFileContent(text);
        setError('');
      }
    };
    reader.onerror = () => {
      setError(isRtl ? 'حدث خطأ أثناء قراءة الملف' : 'Error reading file');
    };
    reader.readAsText(file);
  };

  // Stalker fields
  const [portalUrl, setPortalUrl] = useState('');
  const [macAddress, setMacAddress] = useState('00:1A:79:');
  
  // Parental Control / PIN Protection
  const [isProtected, setIsProtected] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Register pushBackHandler when modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    const unregister = pushBackHandler(() => {
      onClose();
      return true;
    }, BackPriority.MODAL);

    return unregister;
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const playlistName = name.trim() || (
      tab === 'xtream' ? 'Xtream IPTV' :
      tab === 'stalker' ? 'Stalker Portal' :
      'M3U Playlist'
    );

    if (isProtected && (!pin || pin.length < 4)) {
      setError(isRtl ? 'يرجى إدخال رمز PIN مكون من 4 أرقام على الأقل للرقابة الأبوية' : 'Please enter at least 4 digits for parental control PIN');
      return;
    }

    setLoading(true);

    try {
      let playlistData: Partial<Playlist> & { userId: string; createdAt: any } = {
        name: playlistName,
        type: tab,
        userId,
        isProtected,
        pin: isProtected ? pin : undefined,
        createdAt: serverTimestamp()
      };

      if (tab === 'xtream') {
        if (!host.trim() || !username.trim() || !password.trim()) {
          setError(isRtl ? 'يرجى إدخال رابط المضيف واسم المستخدم وكلمة المرور' : 'Please enter host, username, and password');
          setLoading(false);
          return;
        }

        let cleanHost = host.trim().replace(/\/+$/, '');
        cleanHost = cleanHost.replace(/\/(player_api|get|index)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\?.*$/, '').replace(/\/+$/, '');
        if (!cleanHost.startsWith('http://') && !cleanHost.startsWith('https://')) {
          cleanHost = 'http://' + cleanHost;
        }

        playlistData = {
          ...playlistData,
          url: cleanHost,
          portal: cleanHost,
          username: username.trim(),
          password: password.trim()
        };
      } else if (tab === 'm3u') {
        let finalUrl = '';
        let finalContent = uploadedFileContent || '';
        let extractedUser = '';
        let extractedPass = '';
        let isActuallyXtream = false;

        if (m3uUrl.trim().startsWith('#EXTM3U') || m3uUrl.trim().startsWith('#EXTINF') || m3uUrl.includes('#EXTINF:')) {
          // User pasted raw M3U text
          finalContent = m3uUrl.trim();
          const fileName = 'pasted_' + Date.now();
          finalUrl = 'local_file://' + fileName;
        } else if (uploadedFileContent) {
          // User uploaded a file
          const fileName = uploadedFileName || ('file_' + Date.now());
          finalUrl = 'local_file://' + fileName;
        } else {
          if (!m3uUrl.trim()) {
            setError(isRtl ? 'يرجى إدخال رابط M3U أو رفع ملف قنوات' : 'Please enter an M3U URL or upload a playlist file');
            setLoading(false);
            return;
          }

          let cleanUrl = sanitizeM3uUrl(m3uUrl.trim());

          if (cleanUrl) {
            try {
              const testUrl = new URL(cleanUrl.startsWith('http') ? cleanUrl : 'http://' + cleanUrl);
              const u = testUrl.searchParams.get('username');
              const p = testUrl.searchParams.get('password');
              if (u && p) {
                extractedUser = u;
                extractedPass = p;
                isActuallyXtream = true;
              }
            } catch (e) {}
          }

          if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'http://' + cleanUrl;
          }
          finalUrl = cleanUrl;
        }

        if (isActuallyXtream && extractedUser && extractedPass) {
          // Exactly like IBO Player: Upgrade to Xtream Codes API connection
          try {
            const parsedUrl = new URL(finalUrl);
            const cleanOrigin = parsedUrl.origin;
            playlistData = {
              ...playlistData,
              type: 'xtream',
              url: cleanOrigin,
              portal: cleanOrigin,
              username: extractedUser,
              password: extractedPass,
              m3uContent: undefined
            };
          } catch (e) {
            playlistData = {
              ...playlistData,
              type: 'xtream',
              url: finalUrl,
              portal: finalUrl,
              username: extractedUser,
              password: extractedPass
            };
          }
        } else {
          playlistData = {
            ...playlistData,
            url: finalUrl,
            portal: finalUrl,
            m3uContent: finalContent || undefined
          };
        }

        // Save M3U file content in localStorage under various keys to guarantee retrieval
        if (finalContent) {
          try {
            if (finalUrl.startsWith('local_file://')) {
              const fileName = finalUrl.replace('local_file://', '');
              localStorage.setItem('achour_m3u_file_' + fileName, finalContent);
              localStorage.setItem('achour_m3u_file_' + decodeURIComponent(fileName), finalContent);
            }
            localStorage.setItem('achour_m3u_file_' + playlistName, finalContent);
          } catch (e) {
            console.warn('Could not save M3U file in localStorage', e);
          }
        }
      } else if (tab === 'stalker') {
        if (!portalUrl.trim() || !macAddress.trim()) {
          setError(isRtl ? 'يرجى إدخال رابط البورتال وعنوان MAC' : 'Please enter portal URL and MAC address');
          setLoading(false);
          return;
        }

        let cleanPortal = portalUrl.trim().replace(/\/+$/, '');
        if (!cleanPortal.startsWith('http://') && !cleanPortal.startsWith('https://')) {
          cleanPortal = 'http://' + cleanPortal;
        }

        playlistData = {
          ...playlistData,
          url: cleanPortal,
          portal: cleanPortal,
          macAddress: macAddress.trim()
        };
      }

      // Automatically fetch subscription expiry date from provider
      try {
        const liveExp = await fetchLiveSubscriptionExpiry(playlistData as any);
        if (liveExp !== null && liveExp !== undefined) {
          playlistData.expDate = liveExp;
        }
      } catch (expErr) {
        console.warn('Could not fetch live exp date', expErr);
      }

      // 1. Dual-Persistence: Always save in local storage first to guarantee access
      const localId = 'pl_' + Date.now();
      const localItem: Playlist = {
        id: localId,
        ...(playlistData as any),
        createdAt: new Date().toISOString()
      };

      try {
        const rawLocal = localStorage.getItem('achour_local_playlists');
        const list: Playlist[] = rawLocal ? JSON.parse(rawLocal) : [];
        localStorage.setItem('achour_local_playlists', JSON.stringify([localItem, ...list]));
      } catch (localErr) {
        console.warn('LocalStorage save warning', localErr);
      }

      // 2. Try Firestore persistence
      let finalId = localId;
      try {
        const docRef = await addDoc(collection(db, 'playlists'), playlistData);
        finalId = docRef.id;
      } catch (fireErr) {
        console.warn('Firestore save warning, running in local persistent mode:', fireErr);
      }

      onPlaylistAdded(localId);
      onClose();
    } catch (err: any) {
      console.error('Error saving playlist:', err);
      setError(err.message || 'Failed to save playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-2xl bg-zinc-950 border border-gold/30 rounded-3xl shadow-[0_0_60px_rgba(212,175,55,0.15)] overflow-hidden flex flex-col ${isRtl ? 'font-cairo text-right' : 'text-left'}`}
      >
        {/* Header */}
        <div className={`p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-gold/10 via-transparent to-transparent ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-gold/20 rounded-2xl text-gold">
              <Tv size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">{t('add_playlist')}</h2>
              <span className="text-xs text-gold font-bold">Achour TV System</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <input 
              type="file" 
              className="hidden" 
              ref={aiInputRef} 
              accept="image/*" 
              onChange={handleAIScan} 
            />
            <button
              type="button"
              data-tv-focusable="true"
              onClick={() => aiInputRef.current?.click()}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/40 rounded-xl text-gold flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              {aiLoading ? (
                <div className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles size={14} className="animate-pulse" />
              )}
              <span>{isRtl ? 'مسح بالذكاء الاصطناعي' : 'AI Scan'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Two Independent Server Cards: XTREAM CODES vs M3U PLAYLIST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: XTREAM CODES API */}
            <div
              role="button"
              tabIndex={0}
              data-tv-focusable="true"
              onClick={() => setTab('xtream')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Select') setTab('xtream'); }}
              className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group outline-none focus:ring-4 focus:ring-inset focus:ring-gold ${
                tab === 'xtream'
                  ? 'border-gold bg-gold/15 shadow-[0_0_25px_rgba(212,175,55,0.25)] ring-2 ring-gold/40'
                  : 'border-white/10 bg-black/50 hover:border-gold/40 hover:bg-white/5'
              }`}
            >
              <div className={`flex items-center justify-between mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`p-3 rounded-xl transition-colors ${tab === 'xtream' ? 'bg-gold text-black shadow-md' : 'bg-white/10 text-gold'}`}>
                  <Server size={22} />
                </div>
                {tab === 'xtream' && (
                  <span className="px-2.5 py-1 bg-gold text-black font-black text-[10px] uppercase rounded-lg shadow-sm">
                    {isRtl ? 'مُحدد' : 'Selected'}
                  </span>
                )}
              </div>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-wider text-white group-hover:text-gold ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('xtream_codes')}
                </h3>
                <p className={`text-xs text-zinc-400 mt-1 leading-snug ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl 
                    ? 'سيرفر اكستريم كود المباشر - يتطلب عنوان المضيف واسم المستخدم وكلمة المرور'
                    : 'Xtream Codes API server connection using host URL, username & password'}
                </p>
              </div>
            </div>

            {/* Card 2: M3U PLAYLIST & FILE */}
            <div
              role="button"
              tabIndex={0}
              data-tv-focusable="true"
              onClick={() => setTab('m3u')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Select') setTab('m3u'); }}
              className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group outline-none focus:ring-4 focus:ring-inset focus:ring-gold ${
                tab === 'm3u'
                  ? 'border-gold bg-gold/15 shadow-[0_0_25px_rgba(212,175,55,0.25)] ring-2 ring-gold/40'
                  : 'border-white/10 bg-black/50 hover:border-gold/40 hover:bg-white/5'
              }`}
            >
              <div className={`flex items-center justify-between mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`p-3 rounded-xl transition-colors ${tab === 'm3u' ? 'bg-gold text-black shadow-md' : 'bg-white/10 text-gold'}`}>
                  <Globe size={22} />
                </div>
                {tab === 'm3u' && (
                  <span className="px-2.5 py-1 bg-gold text-black font-black text-[10px] uppercase rounded-lg shadow-sm">
                    {isRtl ? 'مُحدد' : 'Selected'}
                  </span>
                )}
              </div>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-wider text-white group-hover:text-gold ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'رابط M3U أو ملف قنوات' : 'M3U Playlist & File'}
                </h3>
                <p className={`text-xs text-zinc-400 mt-1 leading-snug ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl 
                    ? 'رابط مباشر M3U / M3U8 أو رفع ملف قنوات مخزن على جهازك'
                    : 'Direct M3U/M3U8 URL or upload a channel playlist file'}
                </p>
              </div>
            </div>
          </div>

          {/* Playlist Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {isRtl ? 'اسم القائمة' : 'Playlist Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isRtl ? 'مثال: قائمة رويال بريميوم' : 'e.g. My Premium IPTV'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold/50 outline-none transition-all"
            />
          </div>

          {/* Xtream Tab */}
          {tab === 'xtream' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('host')}</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="http://example.com:8080"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold/50 outline-none transition-all font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('username')}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('username')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold/50 outline-none transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('password')}</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('password')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold/50 outline-none transition-all font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* M3U Tab */}
          {tab === 'm3u' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('m3u_url')}</label>
                <textarea
                  rows={4}
                  value={m3uUrl}
                  onChange={(e) => setM3uUrl(e.target.value)}
                  placeholder={isRtl ? 'ضع رابط M3U هنا (http://...)' : 'Paste M3U URL (http://...)'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-gold/50 outline-none transition-all font-mono resize-none"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className={`flex gap-3 pt-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold rounded-xl text-sm transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-gold hover:bg-gold/90 text-black font-black uppercase tracking-wider rounded-xl text-sm transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  <span>{t('save')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
