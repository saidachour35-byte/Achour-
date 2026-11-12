import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Search, Zap, Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '../utils/i18n';
import { AppSettings } from '../types';

interface AIOcrModalProps {
  onClose: () => void;
  onSelectChannel: (name: string) => void;
  language?: AppSettings['language'];
}

export default function AIOcrModal({ onClose, onSelectChannel, language = 'ar' }: AIOcrModalProps) {
  const { t, isRtl } = useI18n(language);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleAnalyze = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const response = await fetch('/api/gemini/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview })
      });
      const data = await response.json();
      if (data.result) {
        // Handle result which might be a JSON or a CSV list
        if (data.result.trim().startsWith('{')) {
           try {
             const parsed = JSON.parse(data.result.replace(/```json|```/g, '').trim());
             if (parsed.channels) setResults(parsed.channels);
             else setResults([parsed.name || parsed.host || 'Unknown']);
           } catch(e) {
             setResults(data.result.split(',').map((s: string) => s.trim()));
           }
        } else {
          setResults(data.result.split(',').map((s: string) => s.trim()));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md ${isRtl ? 'font-cairo' : 'font-sans'}`}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-zinc-950 border border-gold/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(212,175,55,0.15)]"
      >
        <div className={`flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-gold/10 to-transparent ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="p-3 bg-gold/20 text-gold rounded-2xl shadow-lg">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">{t('ai_discovery')}</h2>
              <p className="text-xs text-gold font-bold">{isRtl ? 'التعرف على القنوات من الصور' : 'Visual Channel Recognition'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {!preview ? (
            <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-white/10 rounded-[2rem] cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
              <Upload size={56} className="text-zinc-600 group-hover:text-gold mb-4 transition-colors duration-300" />
              <span className="text-zinc-400 font-black uppercase tracking-widest text-xs group-hover:text-white transition-colors">
                {isRtl ? 'انقر لرفع لقطة شاشة' : 'Upload Screenshot'}
              </span>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-6">
              <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-gold/30 shadow-2xl">
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <button 
                  onClick={() => { setFile(null); setPreview(null); setResults([]); }}
                  className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-red-600 text-white rounded-full transition-all backdrop-blur-md border border-white/10 shadow-lg"
                >
                  <X size={16} />
                </button>
              </div>

              {results.length > 0 ? (
                <div className="space-y-4">
                  <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <h3 className="text-xs font-black text-gold uppercase tracking-widest">{isRtl ? 'القنوات التي تم اكتشافها' : 'Detected Channels'}</h3>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/30">
                      {results.length} {isRtl ? 'نتائج' : 'Results'}
                    </span>
                  </div>
                  <div className={`flex flex-wrap gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    {results.map((res, i) => (
                      <button
                        key={i}
                        data-tv-focusable="true"
                        onClick={() => onSelectChannel(res)}
                        className="px-5 py-2.5 bg-white/5 hover:bg-gold hover:text-black border border-white/10 hover:border-gold rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-md"
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => { setResults([]); setPreview(null); }}
                    className="w-full py-3 text-zinc-500 hover:text-white text-xs font-bold uppercase transition-colors"
                  >
                    {isRtl ? 'إعادة المحاولة' : 'Try Another Image'}
                  </button>
                </div>
              ) : (
                <button
                  disabled={loading}
                  data-tv-focusable="true"
                  onClick={handleAnalyze}
                  className="w-full py-5 bg-gold text-black font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-98 disabled:opacity-50 transition-all shadow-[0_10px_30px_rgba(212,175,55,0.3)] group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                  {loading ? <Loader2 className="animate-spin" /> : <Zap size={20} className="fill-current" />}
                  <span>{loading ? t('ai_analyzing') : (isRtl ? 'بدء التحليل الذكي' : 'Start AI Analysis')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

