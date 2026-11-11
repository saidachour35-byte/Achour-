import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Search, Zap, Loader2 } from 'lucide-react';

interface AIOcrModalProps {
  onClose: () => void;
  onSelectChannel: (name: string) => void;
}

export default function AIOcrModal({ onClose, onSelectChannel }: AIOcrModalProps) {
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
        setResults(data.result.split(',').map((s: string) => s.trim()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="font-bold">AI Channel Discovery</h2>
              <p className="text-xs text-zinc-500">Upload a screenshot to find channels instantly</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {!preview ? (
            <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-zinc-800 rounded-3xl cursor-pointer hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group">
              <Upload size={48} className="text-zinc-600 group-hover:text-[#D4AF37] mb-4 transition-colors" />
              <span className="text-zinc-500 font-medium">Click to upload screenshot</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-6">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-800">
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                <button 
                  onClick={() => { setFile(null); setPreview(null); setResults([]); }}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black rounded-full"
                >
                  <X size={16} />
                </button>
              </div>

              {results.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Identified Channels</h3>
                  <div className="flex flex-wrap gap-2">
                    {results.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => onSelectChannel(res)}
                        className="px-4 py-2 bg-zinc-800 hover:bg-[#D4AF37] hover:text-black rounded-full text-sm transition-all"
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  disabled={loading}
                  onClick={handleAnalyze}
                  className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
                  <span>{loading ? 'AI Analyzing...' : 'Analyze Image'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
