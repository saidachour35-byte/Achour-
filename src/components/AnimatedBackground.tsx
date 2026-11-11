import React, { useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { APP_BACKGROUNDS, ROYAL_THEMES } from '../utils/themeManager';

interface AnimatedBackgroundProps {
  settings: AppSettings;
}

const STATIC_BG_STYLES: Record<string, string> = {
  'static-royal-lounge': 'radial-gradient(circle at 50% 20%, #4a3418 0%, #1c140a 50%, #060503 100%)',
  'static-golden-marble': 'radial-gradient(ellipse at 80% 20%, #5a411a 0%, #291e0d 45%, #080808 100%)',
  'static-dark-abstract': 'radial-gradient(circle at 50% 50%, #31254a 0%, #151024 50%, #050508 100%)',
  'static-velvet-curtain': 'radial-gradient(circle at 50% 20%, #5c142c 0%, #290814 55%, #050203 100%)',
  'static-nebula-star': 'radial-gradient(ellipse at 30% 70%, #1e3a8a 0%, #0f172a 50%, #020617 100%)',
  'static-carbon-mesh': 'radial-gradient(circle at 20% 30%, #374151 0%, #1f2937 50%, #030712 100%)',
  'static-emerald-aurora': 'radial-gradient(circle at 50% 20%, #047857 0%, #064e3b 50%, #01120e 100%)',
  'static-amethyst-crystal': 'radial-gradient(circle at 50% 50%, #581c87 0%, #2e1065 50%, #08020e 100%)',
  'static-cyber-city': 'radial-gradient(ellipse at 50% 30%, #0369a1 0%, #075985 50%, #020617 100%)',
  'static-studio-minimal': 'radial-gradient(circle at 50% 50%, #27272a 0%, #18181b 60%, #000000 100%)',
  'static-luxury-yacht': 'radial-gradient(circle at 50% 80%, #075985 0%, #0c4a6e 50%, #082f49 100%)',
  'static-desert-dunes': 'radial-gradient(ellipse at 50% 0%, #451a03 0%, #1a0c04 60%, #000000 100%)',
  'static-modern-penthouse': 'radial-gradient(circle at 50% 50%, #312e81 0%, #1e1b4b 50%, #0f172a 100%)',
  'static-abstract-silk': 'radial-gradient(ellipse at 20% 20%, #1e293b 0%, #0f172a 55%, #020617 100%)',
  'static-tech-blueprint-bg': 'radial-gradient(circle at 50% 0%, #075985 0%, #0c4a6e 40%, #020617 100%)',
  'static-sapphire-night': 'radial-gradient(circle at 50% 20%, #172554 0%, #0f172a 50%, #020617 100%)',
  'static-crimson-velvet': 'radial-gradient(ellipse at 50% 50%, #4c0519 0%, #1f0208 55%, #050002 100%)',
  'static-emerald-gold-vein': 'radial-gradient(circle at 80% 20%, #064e3b 0%, #022c22 50%, #01120e 100%)',
  'static-amethyst-twilight': 'radial-gradient(circle at 30% 70%, #3b0764 0%, #1e0a38 50%, #08020e 100%)',
  'static-copper-sunset': 'radial-gradient(circle at 50% 20%, #431407 0%, #1c0803 55%, #060201 100%)',
  'static-obsidian-carbon': 'radial-gradient(circle at 50% 50%, #141416 0%, #080809 60%, #000000 100%)',
};

export default function AnimatedBackground({ settings }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentBgId = settings.backgroundStyle || 'anim-golden-dust';
  const customBg = settings.customBackground;
  const currentTheme = ROYAL_THEMES.find(t => t.id === (settings.royalThemeColor || 'royal-gold')) || ROYAL_THEMES[0];
  const bgConfig = APP_BACKGROUNDS.find(b => b.id === currentBgId) || APP_BACKGROUNDS[10];

  // Canvas animation for particles / golden dust / fireflies / matrix / snow / embers
  useEffect(() => {
    if (customBg || bgConfig.type === 'static') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const isDust = currentBgId === 'anim-golden-dust' || currentBgId === 'anim-fireflies-glow' || currentBgId === 'anim-solar-flare-amber';
    const isMatrix = currentBgId === 'anim-matrix-rain';
    const isOrbs = currentBgId === 'anim-bokeh-orbs' || currentBgId === 'anim-pulse-vortex' || currentBgId === 'anim-sapphire-ocean' || currentBgId === 'anim-cosmic-violet-galaxy' || currentBgId === 'anim-neon-cyberpunk';
    const isSnow = currentBgId === 'anim-snowfall-soft' || currentBgId === 'anim-christmas-holiday';
    const isEmbers = currentBgId === 'anim-fire-embers-drift' || currentBgId === 'anim-cozy-fireplace' || currentBgId === 'anim-ruby-crimson-flame';
    const isStarfield = currentBgId === 'anim-stardust-zoom-fast';
    const isFireworks = currentBgId === 'anim-new-year-fireworks';
    const isWaterfall = currentBgId === 'anim-nature-waterfall';
    const isForest = currentBgId === 'anim-nature-forest';
    const isSunsetBeach = currentBgId === 'anim-nature-sunset-beach';

    const particleCount = isDust ? 25 : isOrbs ? 8 : isSnow ? 35 : isEmbers ? 20 : isStarfield ? 40 : isFireworks ? 30 : isWaterfall ? 25 : isForest ? 20 : 15;
    const particles: any[] = [];

    const fireworkColors = ['#f59e0b', '#ec4899', '#06b6d4', '#10b981', '#f43f5e', '#8b5cf6', '#fde047'];

    for (let i = 0; i < particleCount; i++) {
      const colorIndex = Math.floor(Math.random() * fireworkColors.length);
      particles.push({
        x: isFireworks ? width / 2 + (Math.random() - 0.5) * (width * 0.7) : Math.random() * width,
        y: isFireworks ? height / 2 + (Math.random() - 0.5) * (height * 0.6) : Math.random() * height,
        radius: isOrbs ? Math.random() * 90 + 35 : (isSnow ? Math.random() * 3.5 + 1 : (isStarfield ? Math.random() * 2 : (isForest ? Math.random() * 4 + 2 : Math.random() * 3.5 + 1.2))),
        vx: isStarfield ? (Math.random() - 0.5) * 2 : (isFireworks ? (Math.random() - 0.5) * 4 : (isForest ? (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * (isDust ? 0.5 : 0.25))),
        vy: isDust ? -Math.random() * 0.7 - 0.2 : (isSnow ? Math.random() * 1.5 + 0.5 : (isEmbers ? -Math.random() * 2.2 - 0.6 : (isWaterfall ? Math.random() * 4.5 + 2 : (isFireworks ? (Math.random() - 0.5) * 4 : (isForest ? Math.random() * 1.2 + 0.4 : (Math.random() - 0.5) * 0.35))))),
        alpha: Math.random() * 0.8 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.006,
        pulseVal: Math.random() * Math.PI,
        z: isStarfield ? Math.random() * width : 0,
        color: fireworkColors[colorIndex],
        rotation: Math.random() * Math.PI * 2,
      });
    }

    // Matrix columns setup
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const matrixDrops: number[] = [];
    if (isMatrix) {
      for (let i = 0; i < columns; i++) {
        matrixDrops[i] = Math.random() * -100;
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (isMatrix) {
        ctx.fillStyle = 'rgba(5, 5, 5, 0.15)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = currentTheme.primary;
        ctx.font = `bold ${fontSize}px monospace`;

        const characters = 'ACHOUR IPTV 4K 0123456789 VIP 8K'.split(' ');
        for (let i = 0; i < matrixDrops.length; i++) {
          const text = characters[Math.floor(Math.random() * characters.length)];
          ctx.fillText(text, i * fontSize, matrixDrops[i] * fontSize);

          if (matrixDrops[i] * fontSize > height && Math.random() > 0.97) {
            matrixDrops[i] = 0;
          }
          matrixDrops[i] += 0.85;
        }
      } else if (isStarfield) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        particles.forEach(p => {
          p.z -= 5;
          if (p.z <= 0) {
            p.z = width;
            p.x = Math.random() * width;
            p.y = Math.random() * height;
          }
          const k = 128 / p.z;
          const px = (p.x - width / 2) * k + width / 2;
          const py = (p.y - height / 2) * k + height / 2;
          const size = (1 - p.z / width) * 4;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${1 - p.z / width})`;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.pulseVal += p.pulseSpeed;

          if (isForest) {
            p.vx = Math.sin(p.pulseVal) * 0.8;
          }

          if (p.x < -120) p.x = width + 120;
          if (p.x > width + 120) p.x = -120;
          if (p.y < -120) p.y = height + 120;
          if (p.y > height + 120) p.y = -120;

          const currentAlpha = p.alpha * (0.65 + 0.35 * Math.sin(p.pulseVal));

          if (isOrbs) {
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            grad.addColorStop(0, currentTheme.glow.replace('0.45', String(currentAlpha * 0.75)));
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (isSnow) {
            ctx.fillStyle = currentBgId === 'anim-christmas-holiday' ? '#fef08a' : '#fff';
            ctx.globalAlpha = currentAlpha * 0.85;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (isEmbers) {
            const emberColor = currentBgId === 'anim-cozy-fireplace' 
              ? (p.radius > 2.5 ? '#f97316' : '#fde047') 
              : '#fb923c';
            ctx.fillStyle = emberColor;
            ctx.shadowColor = emberColor;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (isFireworks) {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (isWaterfall) {
            ctx.fillStyle = `rgba(186, 230, 253, ${currentAlpha * 0.75})`;
            ctx.beginPath();
            ctx.rect(p.x, p.y, p.radius * 0.8, p.radius * 3);
            ctx.fill();
          } else if (isForest) {
            ctx.fillStyle = p.radius > 3 ? '#22c55e' : '#eab308';
            ctx.globalAlpha = currentAlpha * 0.8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (isSunsetBeach) {
            ctx.fillStyle = '#fed7aa';
            ctx.globalAlpha = currentAlpha * 0.6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = currentTheme.primary;
            ctx.globalAlpha = currentAlpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            if (p.radius > 2) {
              ctx.shadowColor = currentTheme.primary;
              ctx.shadowBlur = 10;
            } else {
              ctx.shadowBlur = 0;
            }
          }
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentBgId, customBg, currentTheme]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Custom MP4 Video Background */}
      {typeof customBg === 'object' && customBg?.type === 'video' && customBg.url && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video
            key={customBg.url}
            src={customBg.url}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Contrast & Readability Protection Overlay */}
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        </div>
      )}

      {/* 2. Custom Uploaded Image Background */}
      {typeof customBg === 'object' && customBg?.type === 'image' && customBg.url && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-500"
            style={{ backgroundImage: `url(${customBg.url})` }}
          />
          {/* Contrast & Readability Protection Overlay */}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[0.5px] pointer-events-none" />
        </div>
      )}

      {/* 3. Built-in Static Background */}
      {!customBg && bgConfig.type === 'static' && (
        <div 
          className="absolute inset-0 w-full h-full transition-all duration-700" 
          style={{ 
            background: STATIC_BG_STYLES[currentBgId] || STATIC_BG_STYLES['static-royal-lounge'] 
          }}
        />
      )}

      {/* 4. Built-in Animated Background Layers */}
      {!customBg && bgConfig.type === 'animated' && (
        <>
          {/* Base Ambient Dark Tone */}
          <div className="absolute inset-0 bg-[#070707]" />

          {/* Cozy Fireplace Hearth Glow */}
          {currentBgId === 'anim-cozy-fireplace' && (
            <div 
              className="absolute inset-0 opacity-60 animate-pulse"
              style={{
                background: 'radial-gradient(circle at 50% 90%, #ea580c 0%, #7c2d12 40%, #1c0a00 80%, #050200 100%)',
                animationDuration: '3s'
              }}
            />
          )}

          {/* Christmas Magic & Holiday Lights */}
          {currentBgId === 'anim-christmas-holiday' && (
            <div 
              className="absolute inset-0 opacity-55 animate-bokeh"
              style={{
                background: 'radial-gradient(circle at 50% 30%, #15803d 0%, #064e3b 40%, #881337 75%, #020617 100%)'
              }}
            />
          )}

          {/* New Year Celebration Fireworks */}
          {currentBgId === 'anim-new-year-fireworks' && (
            <div 
              className="absolute inset-0 opacity-55 animate-pulse"
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, #3b0764 0%, #1e1b4b 50%, #020617 100%)',
                animationDuration: '4s'
              }}
            />
          )}

          {/* Serene Cascade Nature Waterfall */}
          {currentBgId === 'anim-nature-waterfall' && (
            <div 
              className="absolute inset-0 opacity-45 animate-pulse"
              style={{
                background: 'radial-gradient(circle at 50% 20%, #0284c7 0%, #0f766e 45%, #022c22 80%, #020617 100%)',
                animationDuration: '8s'
              }}
            />
          )}

          {/* Whispering Forest Leaves & Breeze */}
          {currentBgId === 'anim-nature-forest' && (
            <div 
              className="absolute inset-0 opacity-50 animate-bokeh"
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, #15803d 0%, #0f5132 45%, #052e16 80%, #020617 100%)'
              }}
            />
          )}

          {/* Tropical Ocean Sunset Waves */}
          {currentBgId === 'anim-nature-sunset-beach' && (
            <div 
              className="absolute inset-0 opacity-50 animate-pulse"
              style={{
                background: 'radial-gradient(circle at 50% 30%, #ea580c 0%, #9a3412 35%, #4c1d95 75%, #020617 100%)',
                animationDuration: '6s'
              }}
            />
          )}

          {/* Animated Aurora Waves Layer */}
          {currentBgId === 'anim-aurora-waves' && (
            <div 
              className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] opacity-40 blur-3xl animate-pulse"
              style={{
                background: `radial-gradient(circle at 40% 40%, ${currentTheme.primary} 0%, ${currentTheme.secondary} 45%, transparent 75%)`,
                animationDuration: '6s'
              }}
            />
          )}

          {/* 3D Cyber Grid Plane Layer */}
          {currentBgId === 'anim-cyber-grid' && (
            <div 
              className="absolute inset-0 opacity-30 [perspective:1000px] overflow-hidden"
              style={{
                background: `linear-gradient(transparent 95%, ${currentTheme.primary} 95%) 0 0 / 40px 40px, linear-gradient(90deg, transparent 95%, ${currentTheme.primary} 95%) 0 0 / 40px 40px`,
                transform: 'rotateX(55deg) translateY(20%)',
                transformOrigin: 'bottom center',
              }}
            />
          )}

          {/* Liquid Flow Gradient */}
          {currentBgId === 'anim-liquid-gradient' && (
            <div 
              className="absolute inset-0 opacity-45 blur-2xl animate-bokeh"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.primary}33 0%, ${currentTheme.secondary}44 50%, #050505 100%)`
              }}
            />
          )}

          {/* Luxury Silk Smoke */}
          {currentBgId === 'anim-luxury-smoke' && (
            <div 
              className="absolute inset-0 opacity-35 filter blur-xl animate-pulse"
              style={{
                background: `radial-gradient(ellipse at 70% 30%, ${currentTheme.primary}44 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, ${currentTheme.secondary}44 0%, transparent 60%)`,
                animationDuration: '8s'
              }}
            />
          )}

          {/* Royal Golden Solar Rays */}
          {currentBgId === 'anim-golden-rays' && (
            <div 
              className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[180%] h-[180%] opacity-45 blur-2xl animate-pulse"
              style={{
                background: `conic-gradient(from 0deg at 50% 0%, ${currentTheme.primary}66 0deg, transparent 40deg, ${currentTheme.primary}44 90deg, transparent 150deg, ${currentTheme.primary}66 210deg, transparent 270deg, ${currentTheme.primary}55 360deg)`,
                animationDuration: '10s'
              }}
            />
          )}

          {/* 3D Cyber Warp Tunnel Stream */}
          {currentBgId === 'anim-cyber-tunnel' && (
            <div 
              className="absolute inset-0 opacity-35 [perspective:800px] overflow-hidden"
              style={{
                background: `radial-gradient(circle at center, transparent 30%, ${currentTheme.primary}22 70%, #000000 100%), repeating-radial-gradient(circle at center, ${currentTheme.primary}44 0px, transparent 25px, ${currentTheme.secondary}33 50px)`,
                transform: 'scale(1.2)',
              }}
            />
          )}

          {/* Shimmering Diamond Crystals */}
          {currentBgId === 'anim-diamond-shimmer' && (
            <div 
              className="absolute inset-0 opacity-40 blur-lg animate-bokeh"
              style={{
                background: `radial-gradient(circle at 20% 20%, ${currentTheme.primary}55 0%, transparent 40%), radial-gradient(circle at 80% 80%, ${currentTheme.accent}44 0%, transparent 40%), radial-gradient(circle at 50% 50%, ${currentTheme.secondary}33 0%, transparent 50%)`
              }}
            />
          )}

          {/* Flowing Royal Velvet Drapes */}
          {currentBgId === 'anim-velvet-waves' && (
            <div 
              className="absolute inset-0 opacity-40 blur-3xl animate-pulse"
              style={{
                background: `linear-gradient(110deg, #050505 0%, ${currentTheme.secondary}66 35%, #050505 60%, ${currentTheme.primary}44 85%, #050505 100%)`,
                animationDuration: '7s'
              }}
            />
          )}

          {/* Pulsing Galaxy Starlight */}
          {currentBgId === 'anim-starlight-galaxy' && (
            <div 
              className="absolute inset-0 opacity-50 blur-xl animate-pulse"
              style={{
                background: `radial-gradient(ellipse at 50% 40%, ${currentTheme.primary}55 0%, ${currentTheme.secondary}33 45%, #020617 80%)`,
                animationDuration: '9s'
              }}
            />
          )}

          {/* Cinematic Rain Drops on Glass */}
          {currentBgId === 'anim-rain-drops-glass' && (
            <div className="absolute inset-0 opacity-30 pointer-events-none">
              <div 
                className="absolute inset-0"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 100px, rgba(255,255,255,0.05) 101px)',
                  backgroundSize: '100% 200%',
                  animation: 'rain-move 10s linear infinite'
                }}
              />
            </div>
          )}

          {/* Dynamic Plasma Energy Flow */}
          {currentBgId === 'anim-plasma-flow-energy' && (
            <div 
              className="absolute inset-0 opacity-40 mix-blend-screen blur-3xl animate-pulse"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${currentTheme.primary} 0%, transparent 50%), radial-gradient(circle at 70% 70%, ${currentTheme.secondary} 0%, transparent 50%)`,
                animationDuration: '4s'
              }}
            />
          )}

          {/* Canvas for Particles / Dust / Orbs / Matrix */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-90" />
        </>
      )}

      {/* Subtle Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />
    </div>
  );
}
