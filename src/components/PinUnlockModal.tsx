import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, X, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '../utils/i18n';
import { Language } from '../types';

interface PinUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
  playlistName: string;
  language: Language;
}

export default function PinUnlockModal({
  isOpen,
  onClose,
  onSuccess,
  correctPin,
  playlistName,
  language
}: PinUnlockModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { t, isRtl } = useI18n(language);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === correctPin) {
      setError('');
      setPin('');
      onSuccess();
    } else {
      setError(t('wrong_pin'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-sm bg-zinc-950 border border-gold/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(212,175,55,0.2)] text-center ${isRtl ? 'font-cairo' : ''}`}
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gold/15 text-gold flex items-center justify-center mb-4">
          <Lock size={28} />
        </div>

        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-1">{t('enter_pin')}</h3>
        <p className="text-xs text-zinc-400 mb-6">
          {isRtl ? `هذه القائمة (${playlistName}) محمية برمز مرور للرقابة الأبوية.` : `This playlist (${playlistName}) is password-protected.`}
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/[^0-9]/g, ''));
              setError('');
            }}
            placeholder="••••"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 text-center text-xl font-mono tracking-[0.6em] text-white focus:border-gold/60 outline-none transition-all"
          />

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-red-400 text-xs font-bold">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-xs font-bold transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gold hover:bg-gold/90 text-black font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-md shadow-gold/20 flex items-center justify-center gap-1"
            >
              <Check size={16} />
              <span>{t('unlocked')}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
