import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ChevronRight } from 'lucide-react';

import { ROYAL_THEMES } from '../utils/themeManager';
import logoImg from '../assets/logo.jpg';

interface SplashScreenProps {
  onComplete: () => void;
  royalThemeId?: string;
  soundTrack?: string;
  splashStyle?: string;
}

export default function SplashScreen({ 
  onComplete, 
  royalThemeId = 'royal-gold',
  soundTrack = 'epic_royal_fanfare',
  splashStyle = 'royal_gold_particles'
}: SplashScreenProps) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [progress, setProgress] = useState(0);
  const [soundPlayed, setSoundPlayed] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const theme = ROYAL_THEMES.find(t => t.id === royalThemeId) || ROYAL_THEMES[0];

  const lastTickSecondRef = useRef<number | null>(null);

  const playClockTick = (isTock: boolean) => {
    if (soundTrack === 'mute') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      const startFreq = isTock ? 1200 : 1800;
      const endFreq = isTock ? 350 : 550;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.02);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isTock ? 900 : 1500, now);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  };

  const playIntroAudio = () => {
    if (soundTrack === 'mute') return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioCtxRef.current || new AudioContextClass();
      audioCtxRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Master Gain Node for soft ambient feel
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.15, now);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // Soft ambient background note
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.5);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 10.5);

      setSoundPlayed(true);
    } catch (e) {
      console.warn('Audio play notice:', e);
    }
  };

  // Preload and background extraction during the 10-second splash
  useEffect(() => {
    playIntroAudio();
    const preloadPlaylistData = async () => {
      try {
        console.log('[Splash] Starting background preload during 10s splash...');
        const savedSettings = localStorage.getItem('achour_settings_v2');
        if (!savedSettings) return;
        const settings = JSON.parse(savedSettings);
        if (!settings.activePlaylistId) return;

        // 1. Get active playlist details
        const localSaved = localStorage.getItem('achour_local_playlists');
        const localList: any[] = localSaved ? JSON.parse(localSaved) : [];
        let activeP = localList.find(p => p.id === settings.activePlaylistId);

        if (!activeP) {
          const { db } = await import('../lib/firebase');
          const { getDoc, doc } = await import('firebase/firestore');
          const snap = await getDoc(doc(db, 'playlists', settings.activePlaylistId));
          if (snap.exists()) {
            activeP = { id: snap.id, ...snap.data() };
          }
        }

        if (activeP) {
          const { getPlaylistExtractionStatus } = await import('../lib/db');
          const { ExtractionService } = await import('../utils/extractionService');
          const status = await getPlaylistExtractionStatus(activeP.id);
          if (!status || status.stage !== 'completed') {
            ExtractionService.extract(activeP, (progress) => {
              try {
                (window as any).__ACHOUR_EXTRACTION_PROGRESS__ = progress;
                window.dispatchEvent(new CustomEvent('achour_extraction_progress', { detail: progress }));
              } catch (e) {}
            });
          }
        }
      } catch (e) {
        console.warn('[Splash] Preload notice:', e);
      }
    };
    
    // Start preloading immediately (400ms after splash launch)
    const warmTimer = setTimeout(preloadPlaylistData, 400);

    const duration = 10000; // 10 seconds
    const intervalTime = 100;
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      const remainingMs = Math.max(0, duration - elapsed);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      
      setProgress(newProgress);
      if (remainingSeconds >= 0 && remainingSeconds !== lastTickSecondRef.current) {
        lastTickSecondRef.current = remainingSeconds;
        setTimeLeft(remainingSeconds);
        playClockTick(remainingSeconds % 2 === 0);
      }

      if (masterGainRef.current && audioCtxRef.current) {
        const volumeFactor = Math.max(0, remainingMs / duration) * 0.15;
        try {
          masterGainRef.current.gain.setValueAtTime(
            volumeFactor, 
            audioCtxRef.current.currentTime
          );
        } catch (e) {}
      }

      if (elapsed >= duration) {
        clearInterval(timer);
        onComplete();
      }
    }, intervalTime);

    return () => {
      clearInterval(timer);
      clearTimeout(warmTimer);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);


  // Determine active visual intro mode
  const activeStyleMode = 
    splashStyle === 'holographic_crown' || splashStyle === 'minimal_neon' ? 'holographic_crown' :
    splashStyle === 'diamond_beam_pulse' || splashStyle === 'cinema_pulse' ? 'diamond_beam_pulse' :
    splashStyle === 'cyber_pulsar' ? 'cyber_pulsar' :
    splashStyle === 'cinematic_epic_zoom' || splashStyle === 'minimal_zoom' ? 'cinematic_epic_zoom' :
    'royal_gold_particles'; // Royal Gold is Default

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(12px)', scale: 1.05 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] select-none overflow-hidden font-sans"
    >
      {/* Background FX (Scaled down to remain 100% inside screen bounds) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {/* Ambient Radial Theme Glow */}
        <motion.div 
          animate={{
            scale: [0.9, 1.1, 0.9],
            opacity: [0.35, 0.6, 0.35]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] rounded-full"
          style={{ 
            background: `radial-gradient(circle at center, ${theme.primary} 0%, transparent 70%)` 
          }}
        />

        {/* Mode 1: Royal Gold Particles Aura (Scaled Down to fit viewport) */}
        {activeStyleMode === 'royal_gold_particles' && (
          <div className="relative flex items-center justify-center w-[260px] h-[260px] sm:w-[360px] sm:h-[360px]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-gold/30 opacity-60 shadow-[0_0_40px_rgba(212,175,55,0.25)]"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-4 rounded-full border border-dashed border-amber-400/40 opacity-70"
            />
          </div>
        )}

        {/* Mode 2: Holographic Crown & Neon Orbit (Scaled Down) */}
        {activeStyleMode === 'holographic_crown' && (
          <div className="relative flex items-center justify-center w-[260px] h-[260px] sm:w-[350px] sm:h-[350px]">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]" />
            <motion.div
              animate={{ rotate: 360, scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full border-2 border-cyan-400/40 shadow-[0_0_40px_rgba(56,189,248,0.3)]"
            />
            <motion.div
              animate={{ rotate: -360, scale: [1.05, 0.95, 1.05] }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-4 rounded-full border-2 border-dashed border-amber-400/40"
            />
          </div>
        )}

        {/* Mode 3: Diamond Beam Pulse (Scaled Down) */}
        {activeStyleMode === 'diamond_beam_pulse' && (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] opacity-25"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${theme.primary} 15deg, transparent 30deg, ${theme.accent} 45deg, transparent 60deg, ${theme.primary} 75deg, transparent 90deg, ${theme.accent} 105deg, transparent 120deg, ${theme.primary} 135deg, transparent 150deg, ${theme.accent} 165deg, transparent 180deg, ${theme.primary} 195deg, transparent 210deg, ${theme.accent} 225deg, transparent 240deg, ${theme.primary} 255deg, transparent 270deg, ${theme.accent} 285deg, transparent 300deg, ${theme.primary} 315deg, transparent 330deg, ${theme.accent} 345deg, transparent 360deg)`
            }}
          />
        )}

        {/* Mode 4: Cyber Pulsar Hex Laser (Scaled Down) */}
        {activeStyleMode === 'cyber_pulsar' && (
          <div className="relative flex items-center justify-center w-[250px] h-[250px] sm:w-[340px] sm:h-[340px]">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-2 border-2 border-emerald-400/50 rotate-45 rounded-3xl shadow-[0_0_30px_rgba(52,211,153,0.4)]"
            />
            <motion.div
              animate={{ rotate: 180 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border border-emerald-500/30 rounded-full border-t-emerald-400"
            />
          </div>
        )}

        {/* Mode 5: Cinematic Epic Space Warp */}
        {activeStyleMode === 'cinematic_epic_zoom' && (
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-purple-900/10 to-transparent"
          />
        )}
      </div>

      {/* Main Content Container (Fits inside max-w-full and max-h-screen) */}
      <div className="relative flex flex-col items-center justify-center z-10 max-w-[92vw] px-2">
        
        {/* Logo Section with Dynamic Ring Effects */}
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6 sm:mb-8 shrink-0"
        >
          {/* Royal Gold Ring */}
          {activeStyleMode === 'royal_gold_particles' && (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-3 rounded-3xl border-2 border-gold/50 shadow-[0_0_25px_rgba(212,175,55,0.4)]"
            />
          )}

          {/* Holographic Crown Ring */}
          {activeStyleMode === 'holographic_crown' && (
            <>
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-4 rounded-full border-2 border-cyan-400/50 shadow-[0_0_25px_rgba(56,189,248,0.5)]"
              />
            </>
          )}

          {/* Diamond Beam Flare */}
          {activeStyleMode === 'diamond_beam_pulse' && (
            <motion.div
              animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-4 rounded-3xl bg-gold/25 blur-lg"
            />
          )}

          {/* Cyber Pulsar Shield */}
          {activeStyleMode === 'cyber_pulsar' && (
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -inset-2.5 rounded-2xl border-2 border-emerald-400/60 shadow-[0_0_30px_rgba(52,211,153,0.5)]"
            />
          )}

          {/* Official Pristine Logo Container */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-3xl p-1 bg-gradient-to-br from-gold via-white/30 to-gold shadow-[0_15px_45px_rgba(0,0,0,0.9)] overflow-hidden relative">
            <div className="w-full h-full rounded-[22px] overflow-hidden bg-black flex items-center justify-center relative">
              <img 
                src={logoImg}
                onError={(e) => { e.currentTarget.src = '/logo.jpg'; }} 
                alt="Achour Player" 
                className="w-full h-full object-cover"
              />
              <motion.div 
                animate={{ x: ['-250%', '250%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-12"
              />
            </div>
          </div>
        </motion.div>

        {/* Brand Name Header */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-[0.25em] text-white text-shadow-gold">
            ACHOUR <span className="text-gold">PLAYER</span>
          </h1>
        </motion.div>

        {/* Dotted Countdown Circle with Dynamic Theme Color */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <defs>
              <mask id="splash-dots-mask">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="white"
                  strokeWidth="7"
                  strokeDasharray="4 7"
                  strokeLinecap="round"
                />
              </mask>
            </defs>

            {/* Background Dotted Ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="6"
              strokeDasharray="4 7"
              strokeLinecap="round"
            />

            {/* Dynamic Progress Dotted Ring */}
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={theme.primary}
              strokeWidth="8"
              strokeDasharray="276"
              animate={{ strokeDashoffset: 276 - (276 * progress) / 100 }}
              transition={{ duration: 0.1, ease: 'linear' }}
              strokeLinecap="round"
              mask="url(#splash-dots-mask)"
              style={{ filter: `drop-shadow(0 0 10px ${theme.glow || theme.primary})` }}
            />
          </svg>
          
          <AnimatePresence mode="wait">
            <motion.span
              key={timeLeft}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              className="text-2xl sm:text-3xl md:text-4xl font-black font-mono"
              style={{ 
                color: theme.primary, 
                textShadow: `0 0 12px ${theme.glow || theme.primary}` 
              }}
            >
              {timeLeft}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Controls: Audio Button Only (Skip word & button removed) */}
      <div className="absolute bottom-6 sm:bottom-10 flex items-center justify-center z-20">
        {!soundPlayed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={playIntroAudio}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/80 border text-xs font-black transition-all shadow-xl active:scale-95"
            style={{ 
              borderColor: `${theme.primary}80`, 
              color: theme.primary,
              boxShadow: `0 0 15px ${theme.glow || 'rgba(212,175,55,0.3)'}`
            }}
          >
            <Volume2 size={16} />
            <span>انقر لتشغيل الصوت والموسيقى</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

