import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronUp, ChevronDown, Star, Check, Trash2 } from 'lucide-react';
import { useI18n } from '../utils/i18n';
import { Language } from '../types';

interface PositionEditModalProps {
  type: 'category' | 'channel';
  id: string;
  name: string;
  currentIndex: number;
  onSave: (newPosition: number) => void;
  onClose: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  language: Language;
}

export default function PositionEditModal({
  type,
  name,
  currentIndex,
  onSave,
  onClose,
  onToggleFavorite,
  isFavorite,
  language
}: PositionEditModalProps) {
  const { t, isRtl } = useI18n(language);
  const [position, setPosition] = useState<string>((currentIndex + 1).toString());

  // Listen to remote numeric keypresses (0-9) directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setPosition(prev => {
          const newVal = prev === (currentIndex + 1).toString() ? e.key : prev + e.key;
          return newVal.slice(0, 5);
        });
      } else if (e.key === 'Backspace') {
        setPosition(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onClose]);

  const handleIncrement = () => {
    const currentNum = parseInt(position, 10) || (currentIndex + 1);
    setPosition((currentNum + 1).toString());
  };

  const handleDecrement = () => {
    const currentNum = parseInt(position, 10) || (currentIndex + 1);
    setPosition(Math.max(1, currentNum - 1).toString());
  };

  const handleSave = () => {
    const targetPos = parseInt(position, 10);
    if (!isNaN(targetPos) && targetPos > 0) {
      onSave(targetPos);
    } else {
      onSave(currentIndex + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/92 backdrop-blur-md select-none"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-xs bg-[#141418] border-2 border-gold/50 rounded-2xl p-3.5 shadow-2xl flex flex-col space-y-2.5 max-h-[88vh] overflow-y-auto no-scrollbar ${isRtl ? 'font-cairo text-right' : 'text-left'}`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-white/10 shrink-0">
          <h3 className="text-xs font-black text-white uppercase tracking-wider truncate max-w-[200px]">
            {type === 'category' ? (isRtl ? 'ترتيب المجموعات' : 'Category Order') : (isRtl ? 'ترتيب القنوات' : 'Channel Order')}: {name}
          </h3>
          <button 
            onClick={onClose} 
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 focus:ring-2 focus:ring-gold outline-none"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current Position Tag */}
        <div className="text-center py-1 bg-black/40 rounded-xl border border-white/5">
          <span className="text-[10px] font-bold text-gold uppercase tracking-widest block">
            {isRtl ? 'الترتيب الحالي' : 'Current Position'}
          </span>
          <div className="text-xl font-black text-white mt-0.5 font-mono">#{currentIndex + 1}</div>
        </div>

        {/* Position Input with Up/Down Controls */}
        <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-xl border border-white/10">
          <button 
            onClick={handleDecrement}
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className="p-2.5 bg-white/10 hover:bg-gold hover:text-black rounded-lg text-gold transition-all focus:ring-2 focus:ring-gold outline-none cursor-pointer"
            title={isRtl ? 'للأسفل' : 'Move Down'}
          >
            <ChevronDown size={20} />
          </button>

          <input
            type="number"
            min="1"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className="flex-1 min-w-0 bg-zinc-900 border border-gold/40 rounded-lg py-1.5 px-2 text-center text-lg text-white font-black font-mono outline-none focus:border-gold focus:ring-2 focus:ring-gold"
            placeholder={(currentIndex + 1).toString()}
          />

          <button 
            onClick={handleIncrement}
            data-tv-modal="reorder"
            data-tv-move-up="true"
            data-tv-focusable="true"
            tabIndex={0}
            className="p-2.5 bg-white/10 hover:bg-gold hover:text-black rounded-lg text-gold transition-all focus:ring-2 focus:ring-gold outline-none cursor-pointer"
            title={isRtl ? 'للأعلى' : 'Move Up'}
          >
            <ChevronUp size={20} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setPosition('')}
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className="py-2 px-3 bg-red-950/40 hover:bg-red-600 text-red-300 hover:text-white rounded-xl flex items-center justify-center gap-1.5 font-black text-xs transition-all border border-red-500/30 focus:ring-2 focus:ring-gold outline-none cursor-pointer"
          >
            <Trash2 size={14} />
            <span>{isRtl ? 'مسح' : 'Clear'}</span>
          </button>
          <button
            onClick={handleSave}
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className="py-2 px-3 bg-gold hover:bg-gold/80 text-black rounded-xl flex items-center justify-center gap-1.5 font-black text-xs transition-all focus:ring-2 focus:ring-white outline-none cursor-pointer shadow-md"
          >
            <Check size={14} />
            <span>{isRtl ? 'تطبيق الترتيب' : 'Save'}</span>
          </button>
        </div>

        {/* Favorite Toggle for Channels */}
        {type === 'channel' && onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase transition-all outline-none focus:ring-2 focus:ring-gold cursor-pointer ${
              isFavorite
                ? 'bg-gold/20 text-gold border border-gold'
                : 'bg-white/5 text-zinc-300 hover:text-white border border-white/10'
            }`}
          >
            <Star size={15} className={isFavorite ? 'fill-gold text-gold' : ''} />
            <span>{isFavorite ? (isRtl ? 'إلغاء المفضلة' : 'Remove Favorite') : (isRtl ? 'إضافة للمفضلة' : 'Add Favorite')}</span>
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
