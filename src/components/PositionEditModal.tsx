import React, { useState } from 'react';
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
  const [position, setPosition] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Handle remote control numeric input to replace existing value
  const handleDigit = (digit: string) => {
    if (!isTyping) {
      setPosition(digit);
      setIsTyping(true);
    } else {
      setPosition(prev => (prev.length < 5 ? prev + digit : prev));
    }
  };

  const clearInput = () => {
    setPosition('');
    setIsTyping(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm select-none"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-sm bg-[#141418] border-2 border-gold/40 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 ${isRtl ? 'font-cairo text-right' : 'text-left'}`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="text-sm font-black text-white uppercase tracking-wider truncate">
            {name}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="text-center py-2">
          <span className="text-xs font-bold text-gold uppercase tracking-widest">
            {isRtl ? 'الترتيب الحالي' : 'Current Position'}
          </span>
          <div className="text-3xl font-black text-white mt-1">#{currentIndex + 1}</div>
        </div>

        <div className="flex items-center gap-4 bg-black/60 p-4 rounded-2xl border border-white/10">
          <button 
            onClick={() => setPosition(p => Math.max(1, (parseInt(p) || currentIndex + 1) - 1).toString())}
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className="p-3 bg-white/5 hover:bg-gold hover:text-black rounded-xl text-gold transition-all"
          >
            <ChevronUp size={24} />
          </button>
          
          <input
            type="text"
            readOnly
            value={position || ''}
            placeholder={(currentIndex + 1).toString()}
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className="flex-1 bg-white/5 border border-white/20 rounded-xl p-3 text-center text-xl text-white font-black outline-none"
          />

          <button 
            onClick={() => setPosition(p => ((parseInt(p) || currentIndex + 1) + 1).toString())}
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className="p-3 bg-white/5 hover:bg-gold hover:text-black rounded-xl text-gold transition-all"
          >
            <ChevronDown size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <button
                onClick={clearInput}
                data-tv-modal="reorder"
                data-tv-focusable="true"
                tabIndex={0}
                className="py-3 px-4 bg-red-950/30 hover:bg-red-600 text-red-300 hover:text-white rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-all"
            >
                <Trash2 size={16} />
                {isRtl ? 'مسح' : 'Clear'}
            </button>
            <button
                onClick={() => onSave(parseInt(position) || currentIndex + 1)}
                data-tv-modal="reorder"
                data-tv-focusable="true"
                tabIndex={0}
                className="py-3 px-4 bg-gold hover:bg-gold/80 text-black rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-all"
            >
                <Check size={16} />
                {isRtl ? 'حفظ' : 'Save'}
            </button>
        </div>

        {type === 'channel' && onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            data-tv-modal="reorder"
            data-tv-focusable="true"
            tabIndex={0}
            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-black text-xs uppercase transition-all ${
              isFavorite
                ? 'bg-gold/20 text-gold border border-gold'
                : 'bg-white/5 text-zinc-300 hover:text-white border border-white/10'
            }`}
          >
            <Star size={18} className={isFavorite ? 'fill-gold text-gold' : ''} />
            <span>{isFavorite ? (isRtl ? 'إلغاء المفضلة' : 'Remove Favorite') : (isRtl ? 'إضافة للمفضلة' : 'Add Favorite')}</span>
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
