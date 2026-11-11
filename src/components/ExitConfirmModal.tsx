import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, AlertTriangle, ArrowLeft, Check } from 'lucide-react';
import { useI18n } from '../utils/i18n';
import { Language } from '../types';
import { parseTVKeyEvent } from '../utils/tvNavigation';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onConfirmExit: () => void;
  onCancel: () => void;
  language: Language;
}

export default function ExitConfirmModal({
  isOpen,
  onConfirmExit,
  onCancel,
  language
}: ExitConfirmModalProps) {
  const { t, isRtl } = useI18n(language);
  const [selectedAction, setSelectedAction] = useState<'no' | 'yes'>('no');
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const exitBtnRef = useRef<HTMLButtonElement | null>(null);

  // Default focus on "No" button whenever the modal opens to prevent accidental exits
  useEffect(() => {
    if (isOpen) {
      setSelectedAction('no');
      const timer = setTimeout(() => {
        if (cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // TV Remote / Keyboard Navigation inside the Exit Modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const action = parseTVKeyEvent(e);

      if (action === 'LEFT' || action === 'RIGHT') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedAction(prev => {
          const next = prev === 'no' ? 'yes' : 'no';
          if (next === 'no' && cancelBtnRef.current) cancelBtnRef.current.focus();
          if (next === 'yes' && exitBtnRef.current) exitBtnRef.current.focus();
          return next;
        });
        return;
      }

      if (action === 'UP' || action === 'DOWN') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (action === 'SELECT') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedAction === 'yes') {
          onConfirmExit();
        } else {
          onCancel();
        }
        return;
      }

      if (action === 'BACK' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, selectedAction, onConfirmExit, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md bg-[#131317] border-2 border-gold/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(212,175,55,0.25)] text-center relative overflow-hidden ${
              isRtl ? 'font-cairo text-right' : 'font-sans text-left'
            }`}
          >
            {/* Top gold accent line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />

            {/* Glowing warning icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 border border-gold/40 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <LogOut className="text-gold w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black text-white text-center mb-2 tracking-tight">
              {t('exit_modal_title')}
            </h2>

            {/* Description */}
            <p className="text-zinc-300 text-xs sm:text-sm text-center font-medium leading-relaxed mb-8 px-2">
              {t('exit_modal_desc')}
            </p>

            {/* Buttons (No / Yes) with clear remote focus */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* No / Cancel Button (Default selection) */}
              <button
                ref={cancelBtnRef}
                type="button"
                data-tv-focusable="true"
                tabIndex={0}
                onClick={onCancel}
                onFocus={() => setSelectedAction('no')}
                className={`py-3.5 px-4 rounded-xl font-black text-sm uppercase transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer outline-none ${
                  selectedAction === 'no'
                    ? 'bg-gold text-black shadow-[0_0_20px_rgba(212,175,55,0.5)] scale-[1.03] ring-4 ring-white/30'
                    : 'bg-[#1e1e26] text-zinc-300 border border-white/10 hover:border-gold/40 hover:text-white'
                }`}
              >
                <ArrowLeft size={16} className={isRtl ? 'rotate-180' : ''} />
                <span>{t('exit_confirm_no')}</span>
              </button>

              {/* Yes / Exit Button */}
              <button
                ref={exitBtnRef}
                type="button"
                data-tv-focusable="true"
                tabIndex={0}
                onClick={onConfirmExit}
                onFocus={() => setSelectedAction('yes')}
                className={`py-3.5 px-4 rounded-xl font-black text-sm uppercase transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer outline-none ${
                  selectedAction === 'yes'
                    ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-[1.03] ring-4 ring-white/30'
                    : 'bg-red-950/40 text-red-300 border border-red-500/30 hover:border-red-500 hover:bg-red-900/50'
                }`}
              >
                <LogOut size={16} />
                <span>{t('exit_confirm_yes')}</span>
              </button>
            </div>

            {/* Hint for remote control */}
            <div className="mt-5 pt-3 border-t border-white/5 text-center">
              <span className="text-[10px] text-zinc-500 font-medium">
                {isRtl
                  ? 'استخدم أسهم الريموت (يمين / يسار) ثم اضغط OK'
                  : 'Use remote D-pad (Left / Right) and press OK'}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
