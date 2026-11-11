export interface RoyalTheme {
  id: string;
  nameAr: string;
  nameEn: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  gradient: string;
}

export interface Icon3DStyle {
  id: string;
  nameAr: string;
  nameEn: string;
  cardClass: string;
  iconClass: string;
  previewBg: string;
  descriptionAr: string;
  recommendedThemeId?: string;
  recommendedBackgroundId?: string;
  iconImage?: string; // For realistic photo icons
  iconProps?: {
    strokeWidth?: number;
    fill?: string;
    size?: number;
  };
}

export interface AppBackground {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'static' | 'animated';
  descriptionAr: string;
  previewColor: string;
  renderClass: string;
}

// 26 Royal Theme Colors (ألوان ملكية فاخرة ومميزة)
export const ROYAL_THEMES: RoyalTheme[] = [
  {
    id: 'pure-metallic-gold',
    nameAr: '✨ الذهب الخالص المسبوك عيار 24 (مميز)',
    nameEn: '24K Pure Cast Metallic Gold',
    primary: '#E5C158',
    secondary: '#B38B21',
    accent: '#FFF6D1',
    glow: 'rgba(229, 193, 88, 0.6)',
    gradient: 'from-[#F3D068] via-[#C5A059] to-[#8C6D27]'
  },
  {
    id: 'royal-bronze',
    nameAr: 'البرونز الملكي المعتق',
    nameEn: 'Antiqued Royal Bronze',
    primary: '#CD7F32',
    secondary: '#8B4513',
    accent: '#F4A460',
    glow: 'rgba(205, 127, 50, 0.45)',
    gradient: 'from-[#CD7F32] via-[#A0522D] to-[#5C2E0B]'
  },
  {
    id: 'imperial-jade',
    nameAr: 'اليشم السلطاني الأخضر العميق',
    nameEn: 'Imperial Deep Jade',
    primary: '#00A86B',
    secondary: '#006644',
    accent: '#80E6B8',
    glow: 'rgba(0, 168, 107, 0.45)',
    gradient: 'from-[#00A86B] via-[#008055] to-[#004D33]'
  },
  {
    id: 'cosmic-nebula',
    nameAr: 'السديم الكوني الملكي',
    nameEn: 'Royal Cosmic Nebula',
    primary: '#D8B4FE',
    secondary: '#9333EA',
    accent: '#F3E8FF',
    glow: 'rgba(216, 180, 254, 0.5)',
    gradient: 'from-[#E9D5FF] via-[#C084FC] to-[#7E22CE]'
  },
  {
    id: 'volcanic-amber',
    nameAr: 'العنبر البركاني الذهبي',
    nameEn: 'Volcanic Golden Amber',
    primary: '#FFB703',
    secondary: '#FB8500',
    accent: '#FFE6A7',
    glow: 'rgba(255, 183, 3, 0.5)',
    gradient: 'from-[#FFB703] via-[#FB8500] to-[#023047]'
  },
  {
    id: 'sapphire-midnight',
    nameAr: 'الياقوت الأزرق الليلكي',
    nameEn: 'Midnight Royal Sapphire',
    primary: '#38BDF8',
    secondary: '#1E3A8A',
    accent: '#E0F2FE',
    glow: 'rgba(56, 189, 248, 0.5)',
    gradient: 'from-[#38BDF8] via-[#1D4ED8] to-[#0F172A]'
  },
  {
    id: 'royal-gold',
    nameAr: 'الذهب الملكي الإمبراطوري',
    nameEn: 'Imperial Royal Gold',
    primary: '#D4AF37',
    secondary: '#996515',
    accent: '#FFF2A3',
    glow: 'rgba(212, 175, 55, 0.45)',
    gradient: 'from-[#D4AF37] via-[#AA771C] to-[#85580C]'
  },
  {
    id: 'emerald-palace',
    nameAr: 'الزمرد السلطاني الأخضر',
    nameEn: 'Sultanic Emerald',
    primary: '#10B981',
    secondary: '#047857',
    accent: '#6EE7B7',
    glow: 'rgba(16, 185, 129, 0.45)',
    gradient: 'from-[#10B981] via-[#059669] to-[#047857]'
  },
  {
    id: 'sapphire-crown',
    nameAr: 'الياقوت الأزرق الملكي',
    nameEn: 'Royal Sapphire Crown',
    primary: '#3B82F6',
    secondary: '#1D4ED8',
    accent: '#93C5FD',
    glow: 'rgba(59, 130, 246, 0.45)',
    gradient: 'from-[#3B82F6] via-[#2563EB] to-[#1E40AF]'
  },
  {
    id: 'ruby-crimson',
    nameAr: 'الياقوت القرمزي الفاخر',
    nameEn: 'Imperial Crimson Ruby',
    primary: '#E11D48',
    secondary: '#9F1239',
    accent: '#FDA4AF',
    glow: 'rgba(225, 29, 72, 0.45)',
    gradient: 'from-[#E11D48] via-[#BE123C] to-[#881337]'
  },
  {
    id: 'amethyst-majesty',
    nameAr: 'الجمشت البنفسجي الملوكي',
    nameEn: 'Majestic Amethyst',
    primary: '#8B5CF6',
    secondary: '#6D28D9',
    accent: '#C4B5FD',
    glow: 'rgba(139, 92, 246, 0.45)',
    gradient: 'from-[#8B5CF6] via-[#7C3AED] to-[#5B21B6]'
  },
  {
    id: 'rose-gold',
    nameAr: 'الذهب الوردي الأنيق',
    nameEn: 'Noble Rose Gold',
    primary: '#FB7185',
    secondary: '#BE185D',
    accent: '#FECDD3',
    glow: 'rgba(251, 113, 133, 0.45)',
    gradient: 'from-[#FB7185] via-[#E11D48] to-[#9F1239]'
  },
  {
    id: 'diamond-platinum',
    nameAr: 'البلاتين الماسي المتلألئ',
    nameEn: 'Luminous Diamond Platinum',
    primary: '#E2E8F0',
    secondary: '#94A3B8',
    accent: '#FFFFFF',
    glow: 'rgba(226, 232, 240, 0.45)',
    gradient: 'from-[#FFFFFF] via-[#CBD5E1] to-[#64748B]'
  },
  {
    id: 'midnight-cyan',
    nameAr: 'الفيروزي الليلي المشع',
    nameEn: 'Midnight Cyan Luster',
    primary: '#06B6D4',
    secondary: '#0E7490',
    accent: '#67E8F9',
    glow: 'rgba(6, 182, 212, 0.45)',
    gradient: 'from-[#06B6D4] via-[#0891B2] to-[#155E75]'
  },
  {
    id: 'obsidian-amber',
    nameAr: '15. الذهب الساطع الفاخر (Vibrant Gold)',
    nameEn: 'Vibrant Pure Gold',
    primary: '#FFD700',
    secondary: '#DAA520',
    accent: '#FFF8DC',
    glow: 'rgba(255, 215, 0, 0.5)',
    gradient: 'from-[#FFD700] via-[#DAA520] to-[#B8860B]'
  },
  {
    id: 'velvet-burgundy',
    nameAr: '16. الوردي النيوني الباهر (Neon Magenta)',
    nameEn: 'Neon Magenta Glow',
    primary: '#FF1493',
    secondary: '#C71585',
    accent: '#FFC0CB',
    glow: 'rgba(255, 20, 147, 0.5)',
    gradient: 'from-[#FF1493] via-[#C71585] to-[#8B008B]'
  },
  {
    id: 'topaz-flame',
    nameAr: '17. الأخضر الزمردي النيوني (Spring Neon)',
    nameEn: 'Spring Neon Green',
    primary: '#00FF7F',
    secondary: '#2E8B57',
    accent: '#98FB98',
    glow: 'rgba(0, 255, 127, 0.5)',
    gradient: 'from-[#00FF7F] via-[#2E8B57] to-[#006400]'
  },
  {
    id: 'neon-turquoise',
    nameAr: '18. السيان والسماوي المشع (Cyan Laser)',
    nameEn: 'Laser Cyan Glow',
    primary: '#00FFFF',
    secondary: '#008B8B',
    accent: '#E0FFFF',
    glow: 'rgba(0, 255, 255, 0.5)',
    gradient: 'from-[#00FFFF] via-[#008B8B] to-[#004040]'
  },
  {
    id: 'royal-indigo',
    nameAr: '19. البنفسجي الملكي الداكن (Dark Violet)',
    nameEn: 'Deep Royal Violet',
    primary: '#9400D3',
    secondary: '#4B0082',
    accent: '#D8BFD8',
    glow: 'rgba(148, 0, 211, 0.5)',
    gradient: 'from-[#9400D3] via-[#4B0082] to-[#2E0854]'
  },
  {
    id: 'copper-sun',
    nameAr: '20. شعلة الغروب البرتقالية (Sunset Blaze)',
    nameEn: 'Sunset Orange Red',
    primary: '#FF4500',
    secondary: '#B22222',
    accent: '#FFA07A',
    glow: 'rgba(255, 69, 0, 0.5)',
    gradient: 'from-[#FF4500] via-[#B22222] to-[#8B0000]'
  },
  {
    id: 'jade-dynasty',
    nameAr: 'اليشم الإمبراطوري العتيق',
    nameEn: 'Ancient Jade Dynasty',
    primary: '#059669',
    secondary: '#064E3B',
    accent: '#34D399',
    glow: 'rgba(5, 150, 105, 0.45)',
    gradient: 'from-[#059669] via-[#047857] to-[#064E3B]'
  },
  {
    id: 'pearl-lumina',
    nameAr: 'اللؤلؤ الأبيض الملكي',
    nameEn: 'Imperial Lumina Pearl',
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    accent: '#FFFFFF',
    glow: 'rgba(248, 250, 252, 0.45)',
    gradient: 'from-[#FFFFFF] via-[#E2E8F0] to-[#94A3B8]'
  },
  {
    id: 'electric-violet',
    nameAr: 'البنفسج الكهربائي المتوهج',
    nameEn: 'Electric Ultra Violet',
    primary: '#A855F7',
    secondary: '#7E22CE',
    accent: '#E9D5FF',
    glow: 'rgba(168, 85, 247, 0.45)',
    gradient: 'from-[#A855F7] via-[#9333EA] to-[#6B21A8]'
  },
  {
    id: 'champagne-glow',
    nameAr: 'بريق الشامبانيا المذهب',
    nameEn: 'Gilded Champagne Glow',
    primary: '#FDE047',
    secondary: '#CA8A04',
    accent: '#FEF08A',
    glow: 'rgba(253, 224, 71, 0.45)',
    gradient: 'from-[#FDE047] via-[#EAB308] to-[#A16207]'
  },
  {
    id: 'crimson-coral',
    nameAr: 'المرجان القرمزي النادر',
    nameEn: 'Rare Crimson Coral',
    primary: '#F43F5E',
    secondary: '#BE123C',
    accent: '#FECDD3',
    glow: 'rgba(244, 63, 94, 0.45)',
    gradient: 'from-[#F43F5E] via-[#E11D48] to-[#9F1239]'
  },
  {
    id: 'titanium-azure',
    nameAr: 'التيتانيوم السماوي الفاخر',
    nameEn: 'Titanium Celestial Azure',
    primary: '#38BDF8',
    secondary: '#0284C7',
    accent: '#BAE6FD',
    glow: 'rgba(56, 189, 248, 0.45)',
    gradient: 'from-[#38BDF8] via-[#0EA5E9] to-[#0369A1]'
  },
  {
    id: 'ruby-wine',
    nameAr: 'نبيذ الياقوت الملكي العميق',
    nameEn: 'Deep Royal Ruby Wine',
    primary: '#9F1239',
    secondary: '#4C0519',
    accent: '#FDA4AF',
    glow: 'rgba(159, 18, 57, 0.5)',
    gradient: 'from-[#BE123C] via-[#881337] to-[#4C0519]'
  },
  {
    id: 'platinum-sky',
    nameAr: 'السماء البلاتينية الصافية',
    nameEn: 'Clear Platinum Sky',
    primary: '#BAE6FD',
    secondary: '#0EA5E9',
    accent: '#F0F9FF',
    glow: 'rgba(186, 230, 253, 0.5)',
    gradient: 'from-[#E0F2FE] via-[#7DD3FC] to-[#0369A1]'
  },
  {
    id: 'sahara-gold',
    nameAr: 'ذهب الصحراء الدافئ',
    nameEn: 'Warm Sahara Sand Gold',
    primary: '#FCD34D',
    secondary: '#B45309',
    accent: '#FEF3C7',
    glow: 'rgba(252, 211, 77, 0.4)',
    gradient: 'from-[#FDE68A] via-[#F59E0B] to-[#78350F]'
  },
  {
    id: 'arctic-mint',
    nameAr: 'النعناع القطبي المنعش',
    nameEn: 'Refreshing Arctic Mint',
    primary: '#CCFBF1',
    secondary: '#0D9488',
    accent: '#F0FDFA',
    glow: 'rgba(204, 251, 241, 0.4)',
    gradient: 'from-[#F0FDFA] via-[#99F6E4] to-[#115E59]'
  },
  {
    id: 'forest-velvet',
    nameAr: 'المخمل الأخضر الغابوي',
    nameEn: 'Deep Forest Green Velvet',
    primary: '#065F46',
    secondary: '#022C22',
    accent: '#A7F3D0',
    glow: 'rgba(6, 95, 70, 0.5)',
    gradient: 'from-[#065F46] via-[#047857] to-[#022C22]'
  },
  {
    id: 'sunset-quartz',
    nameAr: 'كوارتز غروب الشمس الزهري',
    nameEn: 'Pink Sunset Quartz Glow',
    primary: '#F472B6',
    secondary: '#9D174D',
    accent: '#FCE7F3',
    glow: 'rgba(244, 114, 182, 0.45)',
    gradient: 'from-[#FBCFE8] via-[#F472B6] to-[#831843]'
  },
  {
    id: 'deep-pearl',
    nameAr: 'عرق اللؤلؤ الصدفي',
    nameEn: 'Iridescent Deep Pearl',
    primary: '#E2E8F0',
    secondary: '#64748B',
    accent: '#F8FAFC',
    glow: 'rgba(226, 232, 240, 0.4)',
    gradient: 'from-[#F8FAFC] via-[#CBD5E1] to-[#475569]'
  },
  {
    id: 'onyx-gold',
    nameAr: 'أونيكس أسود بلمسة ذهبية',
    nameEn: 'Onyx Black & Gold Spark',
    primary: '#D4AF37',
    secondary: '#000000',
    accent: '#FFFFFF',
    glow: 'rgba(212, 175, 55, 0.3)',
    gradient: 'from-[#1A1A1A] via-[#000000] to-[#85580C]'
  },
  {
    id: 'electric-blue',
    nameAr: 'الأزرق الكهربائي المتوهج',
    nameEn: 'Vibrant Electric Blue',
    primary: '#2563EB',
    secondary: '#1E3A8A',
    accent: '#DBEAFE',
    glow: 'rgba(37, 99, 235, 0.6)',
    gradient: 'from-[#3B82F6] via-[#2563EB] to-[#1E3A8A]'
  },
  {
    id: 'vintage-rose',
    nameAr: 'الورد الكلاسيكي المعتق',
    nameEn: 'Aged Vintage Rose',
    primary: '#FDA4AF',
    secondary: '#881337',
    accent: '#FFF1F2',
    glow: 'rgba(253, 164, 175, 0.4)',
    gradient: 'from-[#FFE4E6] via-[#FB7185] to-[#4C0519]'
  },
  {
    id: 'deep-space-purple',
    nameAr: 'الفضاء البنفسجي العميق',
    nameEn: 'Deep Space Purple',
    primary: '#4C1D95',
    secondary: '#2E1065',
    accent: '#DDD6FE',
    glow: 'rgba(76, 29, 149, 0.5)',
    gradient: 'from-[#4C1D95] via-[#5B21B6] to-[#1E1B4B]'
  },
  {
    id: 'ocean-mist',
    nameAr: 'ضباب المحيط الأزرق',
    nameEn: 'Ocean Mist Blue',
    primary: '#0891B2',
    secondary: '#0E7490',
    accent: '#A5F3FC',
    glow: 'rgba(8, 145, 178, 0.5)',
    gradient: 'from-[#0891B2] via-[#06B6D4] to-[#164E63]'
  },
  {
    id: 'sunset-glow',
    nameAr: 'توهج الغروب الدافئ',
    nameEn: 'Warm Sunset Glow',
    primary: '#EA580C',
    secondary: '#9A3412',
    accent: '#FED7AA',
    glow: 'rgba(234, 88, 12, 0.5)',
    gradient: 'from-[#EA580C] via-[#C2410C] to-[#7C2D12]'
  },
  {
    id: 'forest-shadow',
    nameAr: 'ظلال الغابة الخضراء',
    nameEn: 'Forest Shadow Green',
    primary: '#166534',
    secondary: '#064E3B',
    accent: '#BBF7D0',
    glow: 'rgba(22, 101, 52, 0.5)',
    gradient: 'from-[#166534] via-[#15803D] to-[#064E3B]'
  },
  {
    id: 'royal-plum',
    nameAr: 'البرقوق الملكي الفاخر',
    nameEn: 'Royal Plum Luxury',
    primary: '#701A75',
    secondary: '#4A044E',
    accent: '#F5D0FE',
    glow: 'rgba(112, 26, 117, 0.5)',
    gradient: 'from-[#701A75] via-[#86198F] to-[#4A044E]'
  },
  {
    id: 'copper-mist',
    nameAr: 'ضباب النحاس الأنيق',
    nameEn: 'Elegant Copper Mist',
    primary: '#B45309',
    secondary: '#78350F',
    accent: '#FDE68A',
    glow: 'rgba(180, 83, 9, 0.5)',
    gradient: 'from-[#B45309] via-[#D97706] to-[#78350F]'
  }
];

// 15 Distinct App Icon Styles
export const ICON_3D_STYLES: Icon3DStyle[] = [
  {
    id: 'style-gold-3d',
    nameAr: 'مجسم ملكي (Royal 3D)',
    nameEn: 'Royal 3D Luxury',
    cardClass: 'bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-secondary)] to-black shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] border border-[var(--theme-primary)]/50 rounded-2xl',
    iconClass: 'drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] text-white',
    previewBg: 'from-gold to-zinc-900',
    descriptionAr: 'تصميم ملكي مجسم ببريق عالي وانعكاسات غنية تتبع اللون المختار',
    recommendedThemeId: 'pure-metallic-gold',
    recommendedBackgroundId: 'anim-golden-dust',
    iconProps: { strokeWidth: 2.5, fill: 'rgba(255,255,255,0.2)' }
  },
  {
    id: 'style-silver-3d',
    nameAr: 'كروم مصقول (Chrome 3D)',
    nameEn: 'Silver 3D Chrome',
    cardClass: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-700 shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.8)] border border-slate-200/50 rounded-2xl',
    iconClass: 'drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] text-slate-900',
    previewBg: 'from-slate-200 to-slate-600',
    descriptionAr: 'كروم فضي مصقول بلمعان مرآتي وتأثير معدني بارز',
    recommendedThemeId: 'diamond-platinum',
    recommendedBackgroundId: 'anim-diamond-shimmer',
    iconProps: { strokeWidth: 2, fill: 'rgba(0,0,0,0.1)' }
  },
  {
    id: 'style-flat-minimalist',
    nameAr: 'بسيط مسطح (Flat Minimal)',
    nameEn: 'Flat Minimalist',
    cardClass: 'bg-zinc-900 border border-zinc-800 rounded-xl',
    iconClass: 'text-[var(--theme-primary)] transition-colors',
    previewBg: 'from-zinc-800 to-zinc-900',
    descriptionAr: 'تصميم عصري بسيط يبرز اللون المختار في الأيقونة',
    recommendedThemeId: 'pearl-lumina',
    recommendedBackgroundId: 'static-studio-minimal',
    iconProps: { strokeWidth: 1.5 }
  },
  {
    id: 'style-neon-glow',
    nameAr: 'توهج نيون (Neon Glow)',
    nameEn: 'Neon Glow',
    cardClass: 'bg-black border-2 border-[var(--theme-primary)] shadow-[0_0_20px_var(--theme-glow)] rounded-full',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[0_0_8px_var(--theme-glow)]',
    previewBg: 'from-zinc-900 to-black',
    descriptionAr: 'توهج ضوئي نيون مكثف يتبع اللون الذي تختاره',
    recommendedThemeId: 'midnight-cyan',
    recommendedBackgroundId: 'anim-bokeh-orbs',
    iconProps: { strokeWidth: 2 }
  },
  {
    id: 'style-glassmorphism',
    nameAr: 'زجاجي شفاف (Glassmorphism)',
    nameEn: 'Glassmorphism',
    cardClass: 'bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-3xl',
    iconClass: 'text-[var(--theme-primary)]',
    previewBg: 'from-indigo-500/20 to-purple-500/20',
    descriptionAr: 'تأثير الزجاج الشفاف مع خلفية ضبابية ولمسات من اللون المختار',
    recommendedThemeId: 'royal-indigo',
    recommendedBackgroundId: 'anim-aurora-waves',
    iconProps: { strokeWidth: 1.2, fill: 'rgba(255,255,255,0.1)' }
  },
  {
    id: 'style-cartoon-3d',
    nameAr: 'كرتون ثلاثي الأبعاد (Cartoon 3D)',
    nameEn: 'Cartoon 3D Clay',
    cardClass: 'bg-[var(--theme-primary)] shadow-[0_8px_0_var(--theme-secondary)] border-4 border-white rounded-[2rem]',
    iconClass: 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]',
    previewBg: 'from-orange-400 to-orange-600',
    descriptionAr: 'نمط كرتوني مرح بألوان زاهية تتبع اختيارك',
    recommendedThemeId: 'topaz-flame',
    recommendedBackgroundId: 'anim-liquid-gradient',
    iconProps: { strokeWidth: 3, size: 32 }
  },
  {
    id: 'style-metallic',
    nameAr: 'معدن مصقول (Metallic)',
    nameEn: 'Brushed Metallic',
    cardClass: 'bg-zinc-800 border-2 border-zinc-600 shadow-inner rounded-lg',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[1px_1px_1px_rgba(255,255,255,0.5)]',
    previewBg: 'from-zinc-700 to-zinc-900',
    descriptionAr: 'نسيج معدني خشن بلمسة من اللون المختار',
    recommendedThemeId: 'royal-bronze',
    recommendedBackgroundId: 'static-carbon-mesh',
    iconProps: { strokeWidth: 2.5 }
  },
  {
    id: 'style-gradient-colorful',
    nameAr: 'تدرج لوني (Colorful Gradient)',
    nameEn: 'Colorful Gradient',
    cardClass: 'bg-gradient-to-tr from-[var(--theme-primary)] via-[var(--theme-secondary)] to-black shadow-lg rounded-2xl rotate-3 hover:rotate-0 transition-transform',
    iconClass: 'text-white',
    previewBg: 'from-fuchsia-500 to-indigo-500',
    descriptionAr: 'انفجار من الألوان المتدرجة والحيوية بتصميم ديناميكي',
    recommendedThemeId: 'electric-violet',
    recommendedBackgroundId: 'anim-liquid-gradient',
    iconProps: { strokeWidth: 2, fill: 'rgba(255,255,255,0.3)' }
  },
  {
    id: 'style-outline-icons',
    nameAr: 'خطوط خارجية (Outline Only)',
    nameEn: 'Outline Minimal',
    cardClass: 'bg-transparent border-2 border-dashed border-[var(--theme-primary)]/40 rounded-xl',
    iconClass: 'text-[var(--theme-primary)]',
    previewBg: 'from-transparent to-transparent',
    descriptionAr: 'تركيز كامل على الخطوط الخارجية بأسلوب فني يتبع اللون المختار',
    recommendedThemeId: 'titanium-azure',
    recommendedBackgroundId: 'static-studio-minimal',
    iconProps: { strokeWidth: 1 }
  },
  {
    id: 'style-rounded-modern',
    nameAr: 'عصري دائري (Rounded Modern)',
    nameEn: 'Rounded Modern',
    cardClass: 'bg-white shadow-[0_10px_25px_rgba(0,0,0,0.1)] rounded-[3rem]',
    iconClass: 'text-[var(--theme-primary)]',
    previewBg: 'from-slate-100 to-slate-200',
    descriptionAr: 'حواف دائرية للغاية مع تصميم نظيف وأيقونة ملونة',
    recommendedThemeId: 'pearl-lumina',
    recommendedBackgroundId: 'static-studio-minimal',
    iconProps: { strokeWidth: 2, size: 28 }
  },
  {
    id: 'style-realistic-icons',
    nameAr: 'واقعي مجسم (Realistic)',
    nameEn: 'Realistic Skeuomorphic',
    cardClass: 'bg-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-[var(--theme-primary)]/30 rounded-2xl',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[0_5px_10px_rgba(0,0,0,0.8)]',
    previewBg: 'from-zinc-800 to-black',
    descriptionAr: 'محاكاة للواقع بظلال عميقة وإضاءة تتبع اللون المختار',
    recommendedThemeId: 'obsidian-amber',
    recommendedBackgroundId: 'static-dark-abstract',
    iconProps: { strokeWidth: 1.8, fill: 'currentColor' }
  },
  {
    id: 'style-cyberpunk',
    nameAr: 'سايبربانك (Cyberpunk)',
    nameEn: 'Cyberpunk Glitch',
    cardClass: 'bg-black border-l-4 border-[var(--theme-primary)] shadow-[5px_5px_0_var(--theme-secondary),-5px_-5px_0_var(--theme-glow)] rounded-none skew-x-[-10deg]',
    iconClass: 'text-white drop-shadow-[2px_2px_0_var(--theme-primary)]',
    previewBg: 'from-zinc-900 to-black',
    descriptionAr: 'روح السايبربانك المتمردة مع ألوان تتبع اختيارك',
    recommendedThemeId: 'cosmic-nebula',
    recommendedBackgroundId: 'anim-cyber-grid',
    iconProps: { strokeWidth: 2 }
  },
  {
    id: 'style-crystal',
    nameAr: 'كريستال (Crystal Style)',
    nameEn: 'Jewel Crystal',
    cardClass: 'bg-[var(--theme-primary)]/20 backdrop-blur-xl border-2 border-[var(--theme-primary)]/50 shadow-[0_0_30px_var(--theme-glow)] [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]',
    iconClass: 'text-[var(--theme-primary)]',
    previewBg: 'from-emerald-900 to-black',
    descriptionAr: 'أشكال هندسية كريستالية ببريق اللون المختار',
    recommendedThemeId: 'emerald-palace',
    recommendedBackgroundId: 'anim-diamond-shimmer',
    iconProps: { strokeWidth: 1.5, fill: 'rgba(255,255,255,0.1)' }
  },
  {
    id: 'style-luxury-black-gold',
    nameAr: 'فخامة ملكية (Luxury)',
    nameEn: 'Luxury Matte Theme',
    cardClass: 'bg-zinc-950 border border-[var(--theme-primary)]/40 shadow-2xl rounded-tr-[3rem] rounded-bl-[3rem]',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[0_2px_4px_var(--theme-glow)]',
    previewBg: 'from-zinc-900 to-black',
    descriptionAr: 'مزيج النخبة بين الأسود المطفي واللون المختار بتصميم أرستقراطي',
    recommendedThemeId: 'royal-gold',
    recommendedBackgroundId: 'static-golden-marble',
    iconProps: { strokeWidth: 2, fill: 'currentColor' }
  },
  {
    id: 'style-futuristic',
    nameAr: 'مستقبلي تقني (Futuristic)',
    nameEn: 'Futuristic Tech',
    cardClass: 'bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/40 shadow-[inset_0_0_15px_var(--theme-glow)] rounded-lg relative overflow-hidden',
    iconClass: 'text-[var(--theme-primary)]',
    previewBg: 'from-sky-950 to-black',
    descriptionAr: 'واجهة تقنية مستقبلية تتبع اختيارك اللوني بدقة',
    recommendedThemeId: 'neon-turquoise',
    recommendedBackgroundId: 'anim-cyber-tunnel',
    iconProps: { strokeWidth: 1.5 }
  },
  {
    id: 'style-real-photo',
    nameAr: 'صور واقعية (Realistic Photo)',
    nameEn: 'Ultra-Real Photo Icons',
    cardClass: 'bg-white shadow-2xl rounded-2xl border-4 border-[var(--theme-primary)]/20 overflow-hidden',
    iconClass: 'object-cover w-full h-full',
    previewBg: 'from-slate-200 to-white',
    descriptionAr: 'استخدام صور فوتوغرافية حقيقية عالية الجودة للأيقونات',
    recommendedThemeId: 'pure-metallic-gold',
    recommendedBackgroundId: 'static-royal-lounge',
    iconImage: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&q=80'
  },
  {
    id: 'style-leather-stitched',
    nameAr: 'جلد طبيعي مطرز (Leather)',
    nameEn: 'Stitched Luxury Leather',
    cardClass: 'bg-[#3d2b1f] shadow-inner border-2 border-[#2a1d15] rounded-xl',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[0_1px_1px_rgba(255,255,255,0.1)]',
    previewBg: 'from-[#3d2b1f] to-[#1a120c]',
    descriptionAr: 'لمسة الجلد الطبيعي الفاخر مع اللون المختار',
    recommendedThemeId: 'royal-bronze',
    recommendedBackgroundId: 'static-royal-lounge',
    iconProps: { strokeWidth: 2, fill: 'rgba(255,255,255,0.1)' }
  },
  {
    id: 'style-polished-wood',
    nameAr: 'خشب مصقول (Polished Wood)',
    nameEn: 'Noble Polished Wood',
    cardClass: 'bg-gradient-to-br from-[#5d4037] to-[#2b1d19] shadow-xl border border-[#795548]/30 rounded-lg',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]',
    previewBg: 'from-[#5d4037] to-[#2b1d19]',
    descriptionAr: 'دفء الخشب الكلاسيكي المصقول بلمسة لونية مختارة',
    recommendedThemeId: 'sahara-gold',
    recommendedBackgroundId: 'static-golden-marble',
    iconProps: { strokeWidth: 1.5, fill: 'rgba(255,255,255,0.1)' }
  },
  {
    id: 'style-origami-paper',
    nameAr: 'فن الأوريغامي (Origami)',
    nameEn: 'Origami Paper Fold',
    cardClass: 'bg-white shadow-md [clip-path:polygon(0%_15%,15%_0%,100%_0%,100%_85%,85%_100%,0%_100%)] rounded-none',
    iconClass: 'text-[var(--theme-primary)]',
    previewBg: 'from-slate-100 to-slate-300',
    descriptionAr: 'طي الورق الياباني بأسلوب هندسي مبتكر',
    recommendedThemeId: 'diamond-platinum',
    recommendedBackgroundId: 'static-studio-minimal',
    iconProps: { strokeWidth: 1.2 }
  },
  {
    id: 'style-holographic-shine',
    nameAr: 'هولوجرام مشع (Holographic)',
    nameEn: 'Iridescent Hologram',
    cardClass: 'bg-gradient-to-br from-[var(--theme-primary)] via-fuchsia-400 to-[var(--theme-secondary)] opacity-90 shadow-xl rounded-full animate-pulse',
    iconClass: 'text-white mix-blend-overlay',
    previewBg: 'from-cyan-200 to-fuchsia-200',
    descriptionAr: 'ألوان قوس قزح المتغيرة تتبع اللون المختار',
    recommendedThemeId: 'cosmic-nebula',
    recommendedBackgroundId: 'anim-aurora-waves',
    iconProps: { strokeWidth: 2, fill: 'rgba(255,255,255,0.4)' }
  },
  {
    id: 'style-liquid-chrome',
    nameAr: 'كروم سائل (Liquid Chrome)',
    nameEn: 'Molten Liquid Chrome',
    cardClass: 'bg-slate-200 shadow-[inset_0_0_20px_rgba(255,255,255,0.8),0_10px_20px_rgba(0,0,0,0.3)] rounded-[2.5rem]',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[0_0_5px_rgba(255,255,255,1)]',
    previewBg: 'from-slate-100 to-slate-400',
    descriptionAr: 'تأثير المعدن المنصهر بلمعان لوني مختار',
    recommendedThemeId: 'diamond-platinum',
    recommendedBackgroundId: 'anim-liquid-gradient',
    iconProps: { strokeWidth: 2, fill: 'currentColor' }
  },
  {
    id: 'style-pixel-retro',
    nameAr: 'بكسل آرت (8-Bit Retro)',
    nameEn: '8-Bit Pixel Retro',
    cardClass: 'bg-[var(--theme-primary)]/80 border-4 border-[#ffffff] shadow-[8px_8px_0_#000000] rounded-none',
    iconClass: 'text-white [image-rendering:pixelated]',
    previewBg: 'from-blue-900 to-black',
    descriptionAr: 'حنين الألعاب الكلاسيكية باللون المختار',
    recommendedThemeId: 'electric-blue',
    recommendedBackgroundId: 'anim-cyber-grid',
    iconProps: { strokeWidth: 3 }
  },
  {
    id: 'style-charcoal-sketch',
    nameAr: 'رسم بالفحم (Sketch)',
    nameEn: 'Charcoal Hand Sketch',
    cardClass: 'bg-[#f4f1ea] border-2 border-slate-400 shadow-sm rounded-sm',
    iconClass: 'text-[var(--theme-primary)] opacity-70',
    previewBg: 'from-slate-100 to-slate-200',
    descriptionAr: 'فن الرسم اليدوي بلمسة لونية مختارة',
    recommendedThemeId: 'deep-pearl',
    recommendedBackgroundId: 'static-studio-minimal',
    iconProps: { strokeWidth: 1 }
  },
  {
    id: 'style-blueprint-tech',
    nameAr: 'مخطط هندسي (Blueprint)',
    nameEn: 'Technical Blueprint',
    cardClass: 'bg-[var(--theme-primary)]/80 border border-[#ffffff]/30 shadow-md rounded-none',
    iconClass: 'text-white/80',
    previewBg: 'from-blue-800 to-blue-950',
    descriptionAr: 'رسومات هندسية دقيقة تتبع اللون المختار',
    recommendedThemeId: 'platinum-sky',
    recommendedBackgroundId: 'anim-cyber-grid',
    iconProps: { strokeWidth: 1.5 }
  },
  {
    id: 'style-soft-clay',
    nameAr: 'صلصال ناعم (Soft Clay)',
    nameEn: 'Neumorphic Soft Clay',
    cardClass: 'bg-slate-100 shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] rounded-[2rem]',
    iconClass: 'text-[var(--theme-primary)]',
    previewBg: 'from-slate-50 to-slate-200',
    descriptionAr: 'تصميم "نيومورفيزم" ناعم بأيقونة ملونة',
    recommendedThemeId: 'pearl-lumina',
    recommendedBackgroundId: 'static-studio-minimal',
    iconProps: { strokeWidth: 2, fill: 'rgba(0,0,0,0.05)' }
  },
  {
    id: 'style-retro-tv-box',
    nameAr: 'تلفاز كلاسيكي (80s TV)',
    nameEn: '80s Retro TV Box',
    cardClass: 'bg-[#2c1a12] border-8 border-[#3d261b] shadow-2xl rounded-3xl relative after:content-[""] after:absolute after:inset-1 after:border-2 after:border-black/20 after:rounded-2xl',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[0_0_10px_var(--theme-glow)]',
    previewBg: 'from-[#2c1a12] to-black',
    descriptionAr: 'صندوق التلفاز الخشبي القديم بلمسات اللون المختار',
    recommendedThemeId: 'sahara-gold',
    recommendedBackgroundId: 'static-royal-lounge',
    iconProps: { strokeWidth: 2 }
  },
  {
    id: 'style-sci-fi-hud',
    nameAr: 'واجهة خيال علمي (Sci-Fi HUD)',
    nameEn: 'Futuristic HUD Interface',
    cardClass: 'bg-black/80 border-t-2 border-b-2 border-[var(--theme-primary)] shadow-[0_0_20px_var(--theme-glow)] rounded-none',
    iconClass: 'text-[var(--theme-primary)] animate-pulse',
    previewBg: 'from-black to-sky-950',
    descriptionAr: 'شاشات العرض المستقبلية بلونك المختار',
    recommendedThemeId: 'titanium-azure',
    recommendedBackgroundId: 'anim-cyber-tunnel',
    iconProps: { strokeWidth: 1, size: 24 }
  },
  {
    id: 'style-deep-sea-bubble',
    nameAr: 'أعماق البحار (Deep Sea)',
    nameEn: 'Deep Sea Underwater',
    cardClass: 'bg-gradient-to-b from-[var(--theme-primary)] to-black shadow-xl rounded-[3rem] border-4 border-[var(--theme-primary)]/30 overflow-hidden',
    iconClass: 'text-white/80',
    previewBg: 'from-blue-700 to-blue-950',
    descriptionAr: 'عالم ما تحت الماء يتبع لون اختيارك',
    recommendedThemeId: 'sapphire-midnight',
    recommendedBackgroundId: 'anim-aurora-waves',
    iconProps: { strokeWidth: 1.5, fill: 'rgba(255,255,255,0.1)' }
  },
  {
    id: 'style-marble-gold-inlay',
    nameAr: 'رخام ملكي (Marble Style)',
    nameEn: 'White Marble Inlay',
    cardClass: 'bg-white shadow-xl border border-[var(--theme-primary)]/20 rounded-xl relative overflow-hidden',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]',
    previewBg: 'from-white to-slate-100',
    descriptionAr: 'فخامة الرخام الأبيض مطعّم بلونك المختار',
    recommendedThemeId: 'pure-metallic-gold',
    recommendedBackgroundId: 'static-golden-marble',
    iconProps: { strokeWidth: 2, fill: 'rgba(0,0,0,0.05)' }
  },
  {
    id: 'style-high-tech-carbon',
    nameAr: 'ألياف الكربون (Carbon Fiber)',
    nameEn: 'High-Tech Carbon Fiber',
    cardClass: 'bg-zinc-900 border-2 border-[var(--theme-primary)]/30 shadow-2xl rounded-lg [background-image:linear-gradient(45deg,#1a1a1a_25%,transparent_25%),linear-gradient(-45deg,#1a1a1a_25%,transparent_25%)] [background-size:4px_4px]',
    iconClass: 'text-[var(--theme-primary)] drop-shadow-[0_0_10px_var(--theme-glow)]',
    previewBg: 'from-zinc-800 to-black',
    descriptionAr: 'نسيج ألياف الكربون التقني مطعّم باللون المختار',
    recommendedThemeId: 'onyx-gold',
    recommendedBackgroundId: 'static-carbon-mesh',
    iconProps: { strokeWidth: 2 }
  }
];

// 20 App Backgrounds (10 صور عادية فاخرة + 10 خلفيات متحركة حسب الألوان)
export const APP_BACKGROUNDS: AppBackground[] = [
  // 10 Static Luxury Backgrounds (صور عادية فاخرة)
  {
    id: 'static-royal-lounge',
    nameAr: 'صالة السينما الملكية الفاخرة',
    nameEn: 'Royal Cinema Lounge',
    type: 'static',
    descriptionAr: 'أجواء صالة سينما VIP ملكية خاصة مظلمة ومريحة',
    previewColor: '#1a140d',
    renderClass: 'bg-[radial-gradient(circle_at_top,#2a1f0f_0%,#0f0b06_50%,#050402_100%)]'
  },
  {
    id: 'static-golden-marble',
    nameAr: 'رخام أسود بعروق ذهبية ملكية',
    nameEn: 'Golden Vein Black Marble',
    type: 'static',
    descriptionAr: 'ألواح رخام سوداء إيطالية مرصعة بعروق الذهب الصافي',
    previewColor: '#1f1a10',
    renderClass: 'bg-[radial-gradient(ellipse_at_top_right,#3d2c14_0%,#18120a_45%,#050505_100%)]'
  },
  {
    id: 'static-dark-abstract',
    nameAr: 'تجريد هندسي ثلاثي الأبعاد فخم',
    nameEn: 'Dark Geometric 3D Polygon',
    type: 'static',
    descriptionAr: 'مضلعات هندسية داكنة مع ظلال ثلاثية الأبعاد سينمائية',
    previewColor: '#121217',
    renderClass: 'bg-[radial-gradient(circle_at_center,#1e1b2e_0%,#0f0d17_50%,#050508_100%)]'
  },
  {
    id: 'static-velvet-curtain',
    nameAr: 'ستائر المسرح المخملية الإمبراطورية',
    nameEn: 'Imperial Velvet Curtains',
    type: 'static',
    descriptionAr: 'طيات مخملية عنابية داكنة مسرحية ملكية',
    previewColor: '#240a12',
    renderClass: 'bg-[radial-gradient(circle_at_top,#3d0e1d_0%,#1a060d_55%,#050203_100%)]'
  },
  {
    id: 'static-nebula-star',
    nameAr: 'سديم الفضاء الكوني العميق',
    nameEn: 'Deep Cosmic Star Nebula',
    type: 'static',
    descriptionAr: 'سحب كونية زرقاء وبنفسجية هادئة في أعماق الفضاء',
    previewColor: '#0b1329',
    renderClass: 'bg-[radial-gradient(ellipse_at_bottom_left,#172554_0%,#0f172a_50%,#020617_100%)]'
  },
  {
    id: 'static-carbon-mesh',
    nameAr: 'شبكة كربونية تقنية متطورة',
    nameEn: 'Hexagon Carbon Armor Mesh',
    type: 'static',
    descriptionAr: 'شبكة سداسية كربونية داكنة فائقة التطور والأناقة',
    previewColor: '#111827',
    renderClass: 'bg-[radial-gradient(circle_at_top_left,#1f2937_0%,#111827_50%,#030712_100%)]'
  },
  {
    id: 'static-emerald-aurora',
    nameAr: 'شفق الزمرد القطبي الساحر',
    nameEn: 'Emerald Polar Aurora',
    type: 'static',
    descriptionAr: 'وهج زمردي قطبي أخضر هادئ وساحر في ليل صافي',
    previewColor: '#05231a',
    renderClass: 'bg-[radial-gradient(circle_at_top,#064e3b_0%,#022c22_50%,#01120e_100%)]'
  },
  {
    id: 'static-amethyst-crystal',
    nameAr: 'كهف الكريستال الأرجواني',
    nameEn: 'Amethyst Crystal Cavern',
    type: 'static',
    descriptionAr: 'بلورات الجمشت الأرجوانية الفخمة بنقاء ملوكي',
    previewColor: '#1e0f33',
    renderClass: 'bg-[radial-gradient(circle_at_center,#3b0764_0%,#1e0a38_50%,#08020e_100%)]'
  },
  {
    id: 'static-cyber-city',
    nameAr: 'أفق المدينة المستقبلية الهادئة',
    nameEn: 'Midnight Cyber Skyline',
    type: 'static',
    descriptionAr: 'أضواء أبراج مستقبلية بعيدة تحت سماء زرقاء ليلية',
    previewColor: '#081726',
    renderClass: 'bg-[radial-gradient(ellipse_at_top,#0c4a6e_0%,#082f49_50%,#020617_100%)]'
  },
  {
    id: 'static-studio-minimal',
    nameAr: 'استوديو أسود ملوكي فاحم',
    nameEn: 'Minimal Studio Obsidian',
    type: 'static',
    descriptionAr: 'خلفية سوداء أوبسيديان ملكية مركزة ونظيفة للغاية',
    previewColor: '#0a0a0a',
    renderClass: 'bg-[radial-gradient(circle_at_center,#18181b_0%,#09090b_60%,#000000_100%)]'
  },
  {
    id: 'static-sapphire-night',
    nameAr: 'حجر الياقوت الأزرق الملكي',
    nameEn: 'Imperial Sapphire Abyss',
    type: 'static',
    descriptionAr: 'خلفية زرقاء ملكية داكنة تحاكي أعماق الياقوت الأزرق النقي',
    previewColor: '#0a192f',
    renderClass: 'bg-[radial-gradient(circle_at_top,#172554_0%,#0f172a_50%,#020617_100%)]'
  },
  {
    id: 'static-crimson-velvet',
    nameAr: 'حرير القرمزي الملكي الإمبراطوري',
    nameEn: 'Royal Crimson Imperial Silk',
    type: 'static',
    descriptionAr: 'تموجات قماش حريري أحمر قرمزي إمبراطوري فاخر',
    previewColor: '#2b070f',
    renderClass: 'bg-[radial-gradient(ellipse_at_center,#4c0519_0%,#1f0208_55%,#050002_100%)]'
  },
  {
    id: 'static-emerald-gold-vein',
    nameAr: 'زمرد ملكي مطعم بالذهب الخالص',
    nameEn: 'Emerald Gold Veined Marble',
    type: 'static',
    descriptionAr: 'رخام زمردي أخضر داكن مطعم بعروق ذهبية ملكية نادرة',
    previewColor: '#06241a',
    renderClass: 'bg-[radial-gradient(circle_at_top_right,#064e3b_0%,#022c22_50%,#01120e_100%)]'
  },
  {
    id: 'static-amethyst-twilight',
    nameAr: 'غسق الجمشت البنفسجي الفاخر',
    nameEn: 'Twilight Amethyst Velvet',
    type: 'static',
    descriptionAr: 'تدرج بنفسجي ملكي راقي مريح للشاشات الكبيرة',
    previewColor: '#1d0c2e',
    renderClass: 'bg-[radial-gradient(circle_at_bottom_left,#3b0764_0%,#1e0a38_50%,#08020e_100%)]'
  },
  {
    id: 'static-copper-sunset',
    nameAr: 'شفق النحاس والبرونز الملكي',
    nameEn: 'Royal Copper Bronze Horizon',
    type: 'static',
    descriptionAr: 'أفق نحاسي برونزي ملكي دافئ يضفي جاذبية مريحة للعين',
    previewColor: '#2b1406',
    renderClass: 'bg-[radial-gradient(circle_at_top,#431407_0%,#1c0803_55%,#060201_100%)]'
  },
  {
    id: 'static-obsidian-carbon',
    nameAr: 'أسود بركاني أوبسيديان فائق النقاء',
    nameEn: 'Pure Volcanic Obsidian',
    type: 'static',
    descriptionAr: 'خلفية سوداء بركانية فائقة التباين والوضوح لشاشات OLED',
    previewColor: '#080808',
    renderClass: 'bg-[radial-gradient(circle_at_center,#141416_0%,#080809_60%,#000000_100%)]'
  },

  // 10 Dynamic Animated Backgrounds (خلفيات متحركة ذكية ومريحة)
  {
    id: 'anim-golden-dust',
    nameAr: '✨ غبار الذهب الملكي المتلألئ (متحرك)',
    nameEn: 'Shimmering Golden Star Dust',
    type: 'animated',
    descriptionAr: 'ذرات الذهب الملكي تسبح وتتلألأ بهدوء في الفضاء',
    previewColor: '#3d2c10',
    renderClass: 'anim-golden-dust'
  },
  {
    id: 'anim-aurora-waves',
    nameAr: '🌊 أمواج الشفق القطبي الانسيابية (متحرك)',
    nameEn: 'Dynamic Flowing Aurora Waves',
    type: 'animated',
    descriptionAr: 'أمواج شفق قطبي تتنفس وتتحرك بنعومة فائقة',
    previewColor: '#0a3526',
    renderClass: 'anim-aurora-waves'
  },
  {
    id: 'anim-cyber-grid',
    nameAr: '🌐 شبكة السايبر ثلاثية الأبعاد (متحرك)',
    nameEn: '3D Moving Cyber Grid Horizon',
    type: 'animated',
    descriptionAr: 'شبكة أفقية ثلاثية الأبعاد تتحرك نحو الأمام بسلاسة',
    previewColor: '#08253a',
    renderClass: 'anim-cyber-grid'
  },
  {
    id: 'anim-bokeh-orbs',
    nameAr: '🔮 كرات الضوء والبوكيه العائمة (متحرك)',
    nameEn: 'Floating Cinematic Bokeh Orbs',
    type: 'animated',
    descriptionAr: 'دوائر ضوء سينمائية عائمة تتغير شفافيتها بأناقة',
    previewColor: '#2b102b',
    renderClass: 'anim-bokeh-orbs'
  },
  {
    id: 'anim-nebula-drift',
    nameAr: '🌌 سديم الفضاء الكوني المنجرف (متحرك)',
    nameEn: 'Drifting Cosmic Nebula Clouds',
    type: 'animated',
    descriptionAr: 'سحب غازية كونية تنجرف وتضيء أعماق الشاشة',
    previewColor: '#171233',
    renderClass: 'anim-nebula-drift'
  },
  {
    id: 'anim-liquid-gradient',
    nameAr: '💧 أمواج سائلة ملونة انسيابية (متحرك)',
    nameEn: 'Smooth Fluid Liquid Color Waves',
    type: 'animated',
    descriptionAr: 'تدرجات لونية سائلة تتدفق ببطء وراحة للعين',
    previewColor: '#241b12',
    renderClass: 'anim-liquid-gradient'
  },
  {
    id: 'anim-luxury-smoke',
    nameAr: '💨 خيوط الدخان الحريري الملون (متحرك)',
    nameEn: 'Silk Smoke Ambient Drift',
    type: 'animated',
    descriptionAr: 'خيوط دخان حريرية ملونة تتصاعد بنعومة ملكية',
    previewColor: '#171d24',
    renderClass: 'anim-luxury-smoke'
  },
  {
    id: 'anim-matrix-rain',
    nameAr: '⚡ مطر البيانات الرقمية الذهبي (متحرك)',
    nameEn: 'Golden Matrix Digital Code Stream',
    type: 'animated',
    descriptionAr: 'خطوط بيانات ضوئية متدفقة بهدوء بتأثير الماتريكس الذهبي',
    previewColor: '#291d08',
    renderClass: 'anim-matrix-rain'
  },
  {
    id: 'anim-pulse-vortex',
    nameAr: '🌀 دوامة الضوء النبضي الساحرة (متحرك)',
    nameEn: 'Pulsing Ambient Light Vortex',
    type: 'animated',
    descriptionAr: 'دوامة ضوئية دائرية تنبض برفق في خلفية المشغل',
    previewColor: '#1b122b',
    renderClass: 'anim-pulse-vortex'
  },
  {
    id: 'anim-fireflies-glow',
    nameAr: '✨ يراعات وذرات نورانية متراقصة (متحرك)',
    nameEn: 'Dancing Ambient Light Fireflies',
    type: 'animated',
    descriptionAr: 'نقاط ضوئية دافئة تطفو وتضيء بحسب لون الثيم المختار',
    previewColor: '#292209',
    renderClass: 'anim-fireflies-glow'
  },
  {
    id: 'anim-golden-rays',
    nameAr: '🌅 أشعة الشمس الذهبية الملكية (متحرك)',
    nameEn: 'Royal Golden Solar Rays',
    type: 'animated',
    descriptionAr: 'أشعة شمسية ذهبية دافئة تنبعث من أعلى الشاشة بهدوء',
    previewColor: '#38280b',
    renderClass: 'anim-golden-rays'
  },
  {
    id: 'anim-cyber-tunnel',
    nameAr: '🚀 نفق السايبر ثلاثي الأبعاد (متحرك)',
    nameEn: '3D Cyber Warp Tunnel Stream',
    type: 'animated',
    descriptionAr: 'نفق ضوئي مستقبلي ثلاثي الأبعاد يتدفق بسلاسة وإبهار',
    previewColor: '#0a1d30',
    renderClass: 'anim-cyber-tunnel'
  },
  {
    id: 'anim-diamond-shimmer',
    nameAr: '💎 كريستالات وماسات متلألئة (متحرك)',
    nameEn: 'Shimmering Diamond Crystals',
    type: 'animated',
    descriptionAr: 'كريستالات جوهرية عائمة تتنعكس بريق النور النقي',
    previewColor: '#251b33',
    renderClass: 'anim-diamond-shimmer'
  },
  {
    id: 'anim-velvet-waves',
    nameAr: '🎭 ستائر المخمل الملوكي الانسيابية (متحرك)',
    nameEn: 'Flowing Royal Velvet Drapes',
    type: 'animated',
    descriptionAr: 'أمواج مخملية عميقة تتنفس وتضفي فخامة للواجهة',
    previewColor: '#2e0a16',
    renderClass: 'anim-velvet-waves'
  },
  {
    id: 'anim-starlight-galaxy',
    nameAr: '🌌 مجرة النجوم الفضائية (متحرك)',
    nameEn: 'Pulsing Galaxy Starlight',
    type: 'animated',
    descriptionAr: 'نجوم ومجرات فضائية تنبض بهدوء في المدى البعيد',
    previewColor: '#0c1220',
    renderClass: 'anim-starlight-galaxy'
  },
  // 5 More Static Luxury Backgrounds
  {
    id: 'static-luxury-yacht',
    nameAr: 'مقصورة اليخت الملكية',
    nameEn: 'Royal Yacht Cabin',
    type: 'static',
    descriptionAr: 'إطلالة من داخل يخت فاخر على مياه البحر الزرقاء الهادئة',
    previewColor: '#0c4a6e',
    renderClass: 'bg-[radial-gradient(circle_at_bottom,#075985_0%,#0c4a6e_50%,#082f49_100%)]'
  },
  {
    id: 'static-desert-dunes',
    nameAr: 'كثبان الصحراء الذهبية ليلاً',
    nameEn: 'Sahara Desert Night Dunes',
    type: 'static',
    descriptionAr: 'جمال رمال الصحراء تحت ضوء القمر والنجوم الساطعة',
    previewColor: '#2b1d0e',
    renderClass: 'bg-[radial-gradient(ellipse_at_top,#451a03_0%,#1a0c04_60%,#000000_100%)]'
  },
  {
    id: 'static-modern-penthouse',
    nameAr: 'بنتهاوس عصري مطل على المدينة',
    nameEn: 'Modern City Penthouse View',
    type: 'static',
    descriptionAr: 'أجواء شقة فاخرة في الطوابق العليا تطل على أضواء المدينة',
    previewColor: '#1e1b4b',
    renderClass: 'bg-[radial-gradient(circle_at_center,#312e81_0%,#1e1b4b_50%,#0f172a_100%)]'
  },
  {
    id: 'static-abstract-silk',
    nameAr: 'تموجات الحرير الأسود التجريدية',
    nameEn: 'Abstract Black Silk Waves',
    type: 'static',
    descriptionAr: 'تداخلات انسيابية من قماش الحرير الأسود تعطي عمقاً وفخامة',
    previewColor: '#0f172a',
    renderClass: 'bg-[radial-gradient(ellipse_at_top_left,#1e293b_0%,#0f172a_55%,#020617_100%)]'
  },
  {
    id: 'static-tech-blueprint-bg',
    nameAr: 'خلفية المخططات التقنية المظلمة',
    nameEn: 'Dark Tech Blueprint Grid',
    type: 'static',
    descriptionAr: 'مخططات تقنية وهندسية دقيقة بخلفية زرقاء داكنة جداً',
    previewColor: '#082f49',
    renderClass: 'bg-[radial-gradient(circle_at_top,#075985_0%,#0c4a6e_40%,#020617_100%)]'
  },
  // 5 More Dynamic Animated Backgrounds
  {
    id: 'anim-snowfall-soft',
    nameAr: '❄️ تساقط الثلوج القطبي الناعم (متحرك)',
    nameEn: 'Gentle Polar Snowfall Drift',
    type: 'animated',
    descriptionAr: 'ندفات ثلجية بيضاء تتساقط بنعومة فائقة في ليل شتوي',
    previewColor: '#0f172a',
    renderClass: 'anim-snowfall-soft'
  },
  {
    id: 'anim-rain-drops-glass',
    nameAr: '🌧️ قطرات المطر على الزجاج (متحرك)',
    nameEn: 'Cinematic Rain Drops on Glass',
    type: 'animated',
    descriptionAr: 'محاكاة لقطرات المطر تنساب ببطء على نافذة المشغل السينمائية',
    previewColor: '#172554',
    renderClass: 'anim-rain-drops-glass'
  },
  {
    id: 'anim-fire-embers-drift',
    nameAr: '🔥 شرارات وجمر النار المتطاير (متحرك)',
    nameEn: 'Floating Warm Fire Embers',
    type: 'animated',
    descriptionAr: 'جزيئات جمر برتقالية دافئة تتصاعد وتتطاير في الهواء بجمال',
    previewColor: '#2d0601',
    renderClass: 'anim-fire-embers-drift'
  },
  {
    id: 'anim-plasma-flow-energy',
    nameAr: '⚡ تدفق طاقة البلازما (متحرك)',
    nameEn: 'Dynamic Plasma Energy Flow',
    type: 'animated',
    descriptionAr: 'تموجات طاقة كهربائية وبلازما تتحرك بانسيابية وغموض',
    previewColor: '#1e1b4b',
    renderClass: 'anim-plasma-flow-energy'
  },
  {
    id: 'anim-stardust-zoom-fast',
    nameAr: '🚀 الانطلاق عبر غبار النجوم (متحرك)',
    nameEn: 'Hyperspace Stardust Zoom',
    type: 'animated',
    descriptionAr: 'شعور بالانطلاق بسرعة فائقة عبر نجوم الفضاء المتناثرة',
    previewColor: '#020617',
    renderClass: 'anim-stardust-zoom-fast'
  },
  // 6 Special Seasonal & Scenic Nature Animated Backgrounds
  {
    id: 'anim-cozy-fireplace',
    nameAr: '🪵 مدفأة دافئة ونيران حطب حية (متحرك)',
    nameEn: 'Cozy Hearth & Crackling Fireplace',
    type: 'animated',
    descriptionAr: 'مدفأة منزلية دافئة مع شرارات ونيران حطب متوهجة مريحة للأعصاب',
    previewColor: '#431407',
    renderClass: 'anim-cozy-fireplace'
  },
  {
    id: 'anim-christmas-holiday',
    nameAr: '🎄 أعياد الكريسماس وشجرة الميلاد المتلألئة (متحرك)',
    nameEn: 'Christmas Magic & Holiday Lights',
    type: 'animated',
    descriptionAr: 'أجواء الكريسماس مع ثلوج ذهبية متساقطة وأضواء زينة احتفالية دافئة',
    previewColor: '#064e3b',
    renderClass: 'anim-christmas-holiday'
  },
  {
    id: 'anim-new-year-fireworks',
    nameAr: '🎆 احتفالات رأس السنة والألعاب النارية (متحرك)',
    nameEn: 'New Year Celebration Fireworks Stream',
    type: 'animated',
    descriptionAr: 'ألعاب نارية ملونة متفجرة متتالية في سماء ليلة رأس السنة',
    previewColor: '#2e1065',
    renderClass: 'anim-new-year-fireworks'
  },
  {
    id: 'anim-nature-waterfall',
    nameAr: '🌊 شلالات طبيعية انسيابية وسحر المياه (متحرك)',
    nameEn: 'Serene Cascade Nature Waterfall',
    type: 'animated',
    descriptionAr: 'انسياب مياه الشلالات الصافية مع رذاذ ضبابي هادئ ومريح للعين',
    previewColor: '#0369a1',
    renderClass: 'anim-nature-waterfall'
  },
  {
    id: 'anim-nature-forest',
    nameAr: '🌲 أوراق الغابة الطبيعية والنسيم العليل (متحرك)',
    nameEn: 'Whispering Forest Leaves & Breeze',
    type: 'animated',
    descriptionAr: 'تساقط أوراق الأشجار الخضراء والذهبية في غابة طبيعية ساحرة',
    previewColor: '#052e16',
    renderClass: 'anim-nature-forest'
  },
  {
    id: 'anim-nature-sunset-beach',
    nameAr: '🌅 غروب الشمس الشاطئي وأمواج البحر (متحرك)',
    nameEn: 'Tropical Ocean Sunset Waves',
    type: 'animated',
    descriptionAr: 'شفق غروب الشمس الدافئ مع حركة أمواج البحر الانسيابية الشاعرية',
    previewColor: '#7c2d12',
    renderClass: 'anim-nature-sunset-beach'
  },
  {
    id: 'anim-neon-cyberpunk',
    nameAr: '⚡ نبض النيون السايبر المستقبلي (متحرك)',
    nameEn: 'Neon Cyberpunk Ambient Pulse',
    type: 'animated',
    descriptionAr: 'نبضات نيون مستقبلية تتفاعل بانسيابية مع حركة الواجهة',
    previewColor: '#0d2238',
    renderClass: 'anim-neon-cyberpunk'
  },
  {
    id: 'anim-sapphire-ocean',
    nameAr: '🌊 أعماق المحيط الياقوتي الأزرق (متحرك)',
    nameEn: 'Deep Sapphire Ocean Abyss',
    type: 'animated',
    descriptionAr: 'أمواج بحرية زرقاء ملكية عميقة هادئة ومهدئة للبصر',
    previewColor: '#0a1d3b',
    renderClass: 'anim-sapphire-ocean'
  },
  {
    id: 'anim-ruby-crimson-flame',
    nameAr: '🔥 توهج الياقوت الأحمر الإمبراطوري (متحرك)',
    nameEn: 'Imperial Ruby Crimson Glow',
    type: 'animated',
    descriptionAr: 'شرارات وجمر ياقوتي أحمر دافئ يرتفع بهدوء ملوكي',
    previewColor: '#300812',
    renderClass: 'anim-ruby-crimson-flame'
  },
  {
    id: 'anim-cosmic-violet-galaxy',
    nameAr: '🌌 مجرة البنفسج الكونية الدوارة (متحرك)',
    nameEn: 'Cosmic Violet Galaxy Swirl',
    type: 'animated',
    descriptionAr: 'مجرة بنفسجية فلكية تسبح بنعومة في خلفية المشغل',
    previewColor: '#1e0c38',
    renderClass: 'anim-cosmic-violet-galaxy'
  },
  {
    id: 'anim-solar-flare-amber',
    nameAr: '☀️ التوهج الشمسي الكهرماني الدافئ (متحرك)',
    nameEn: 'Radiant Amber Solar Glow',
    type: 'animated',
    descriptionAr: 'أمواج كهرمانية دافئة ومشرقة تضفي حيوية فخمة',
    previewColor: '#381f08',
    renderClass: 'anim-solar-flare-amber'
  }
];

export interface DashboardLayoutOption {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  previewBg: string;
}

export const DASHBOARD_LAYOUTS: DashboardLayoutOption[] = [
  {
    id: 'layout-classic-grid',
    nameAr: '1. الأيقونات الأفقية (الشبكة الكلاسيكية)',
    nameEn: 'Classic Grid Cards Row',
    descriptionAr: 'التصميم الكلاسيكي الأصلي بخمسة أزرار رئيسية عائمة بشكل أفقي متناسق',
    previewBg: 'from-amber-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-dual-live-showcase',
    nameAr: '2. تلفاز البث المباشر المزدوج (Dual Live TV Showcase)',
    nameEn: 'Dual Live TV Showcase Hub',
    descriptionAr: 'شاشة مزدوجة تفاعلية مخصصة لعشاق البث المباشر مع نوافذ معاينة متعددة وبطاقات سريعة',
    previewBg: 'from-blue-600/30 via-zinc-900 to-black'
  },
  {
    id: 'layout-sidebar-vertical',
    nameAr: '3. القائمة الجانبية المتقدمة (Vertical Navigation)',
    nameEn: 'Sidebar Vertical Navigation',
    descriptionAr: 'شريط أدوات جانبي فخم مع مساحة عرض سينمائية للمحتوى والمعلومات الحية',
    previewBg: 'from-purple-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-metro-tiles',
    nameAr: '4. بلاطات الميترو المجسمة (3D Metro Glass Tiles)',
    nameEn: '3D Metro Glass Tiles Grid',
    descriptionAr: 'شبكة بطاقات ميترو زجاجية متداخلة بأحجام مختلفة مع إضاءة نيون مجسمة',
    previewBg: 'from-emerald-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-cinema-strip',
    nameAr: '5. شريط السينما المتدفق (Cinematic Flowing Strip)',
    nameEn: 'Cinematic Flowing Strip',
    descriptionAr: 'شريط سينمائي متدفق يحتوي على بطاقات عريضة مع تأثير حركي متجاوب',
    previewBg: 'from-blue-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-apple-spotlight',
    nameAr: '6. واجهة أبل تي في السينمائية الفاخرة (Apple TV Spotlight)',
    nameEn: 'Apple TV Spotlight Showcase',
    descriptionAr: 'واجهة تلفاز أبل الفاخرة مع بانر عرض سينمائي ضخم في المنتصف وبطاقات سريعة أسفله',
    previewBg: 'from-sky-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-dual-column',
    nameAr: '7. العمودين المزدوجين (Dual Split Column)',
    nameEn: 'Dual Split Column View',
    descriptionAr: 'شاشة مقسومة لجزئين رئيسيين لبث مباشر سريع وعرض الوسائط',
    previewBg: 'from-cyan-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-minimal-list',
    nameAr: '8. القائمة البسيطة الفاخرة (Minimal Luxury List)',
    nameEn: 'Minimal Luxury Vertical List',
    descriptionAr: 'قائمة رأسية نظيفة وبسيطة بخطوط ذهبية ومظهر راقي',
    previewBg: 'from-zinc-800 via-zinc-900 to-black'
  },
  {
    id: 'layout-honeycomb',
    nameAr: '9. خلايا النحل الهندسية (Honeycomb Matrix)',
    nameEn: 'Honeycomb Hexagon Grid',
    descriptionAr: 'خلايا هندسية متداخلة بطابع مستقبلى متطور ومثير',
    previewBg: 'from-yellow-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-floating-dock',
    nameAr: '10. شريط الإبحار العائم (Floating Glass Dock)',
    nameEn: 'Floating Mac Glass Dock',
    descriptionAr: 'قائمة عائمة سفلى بتأثير زجاجي شفاف ومكبر تفاعلي',
    previewBg: 'from-indigo-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-staggered-grid',
    nameAr: '11. الشبكة المتداخلة غير المتماثلة (Staggered Bento)',
    nameEn: 'Staggered Bento Box Grid',
    descriptionAr: 'تصميم بنتو الإبداعي بأحجام بطاقات متفاوتة وجذابة',
    previewBg: 'from-pink-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-apple-tv',
    nameAr: '12. واجهة أبل تي في العائمة (Apple TV Showcase)',
    nameEn: 'Apple TV Spotlight Showcase',
    descriptionAr: 'بطاقات بارزة مع تركيز سينمائي على العنصر المحدد',
    previewBg: 'from-sky-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-fire-tv',
    nameAr: '13. واجهة أمازون فاير تي في (Amazon Fire TV Row)',
    nameEn: 'Amazon Fire TV Featured Row',
    descriptionAr: 'شريط عرض عريض مع بانر علوي ضخم وبطاقات سفلى سريعة',
    previewBg: 'from-orange-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-android-tv',
    nameAr: '14. شاشة أندرويد تي في الرئيسية (Android TV Leanback)',
    nameEn: 'Android TV Leanback Home',
    descriptionAr: 'صفوف أفقية متوازية مصممة خصيصاً لأجهزة التحكم عن بعد',
    previewBg: 'from-emerald-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-modern-bento',
    nameAr: '15. شبكة بنتو الحديثة (Modern Bento Grid)',
    nameEn: 'Modern Bento Grid',
    descriptionAr: 'تصميم بنتو عصري متكامل ببطاقات متوازنة',
    previewBg: 'from-blue-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-sidebar-glass',
    nameAr: '16. القائمة الجانبية الزجاجية (Glass Sidebar)',
    nameEn: 'Glass Sidebar Nav',
    descriptionAr: 'قائمة جانبية بلمسة زجاجية شفافة عصرية',
    previewBg: 'from-purple-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-compact-tiles',
    nameAr: '17. بلاطات صغيرة متراصة (Compact Tiles)',
    nameEn: 'Compact Tile Grid',
    descriptionAr: 'شبكة مكثفة للأجهزة ذات الشاشات الصغيرة',
    previewBg: 'from-yellow-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-full-hero',
    nameAr: '18. واجهة البانر الضخم (Full Hero Showcase)',
    nameEn: 'Full Hero Showcase',
    descriptionAr: 'واجهة تعتمد على بانر ضخم يغطي كامل العرض',
    previewBg: 'from-red-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-split-hero',
    nameAr: '19. واجهة مقسومة عصرية (Split Hero Grid)',
    nameEn: 'Split Hero Grid',
    descriptionAr: 'تقسيم شاشة يجمع بين العرض السينمائي والشبكة التقليدية',
    previewBg: 'from-indigo-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-floating-strip',
    nameAr: '20. شريط التنقل العائم (Floating Nav Strip)',
    nameEn: 'Floating Navigation Strip',
    descriptionAr: 'شريط تنقل عائم فوق المحتوى بتصميم خفيف',
    previewBg: 'from-teal-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-cyber-matrix',
    nameAr: '21. شبكة السايبر المستقبلية (Cyber Matrix Hub)',
    nameEn: 'Cyber Matrix Tech Hub',
    descriptionAr: 'تصميم تقني مستقبلي مع حواف نيون متطورة وبطاقات تفاعلية وشاشات رادارية',
    previewBg: 'from-cyan-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-orbit-carousel',
    nameAr: '22. الدولاب الدائري المتحرك (Orbit 3D Wheel)',
    nameEn: 'Orbit 3D Wheel Carousel',
    descriptionAr: 'منظومة دائرية ثلاثية الأبعاد بتركيز محوري على العنصر النشط مع دوران مرن',
    previewBg: 'from-purple-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-magazine-editorial',
    nameAr: '23. المجلة الترفيهية الفاخرة (Royal Editorial Magazine)',
    nameEn: 'Royal Editorial Magazine Spread',
    descriptionAr: 'تصميم مجلة إعلامية فاخرة بأعمدة متناسقة، مساحات بصرية واسعة وتنسيق طباعي ملكي',
    previewBg: 'from-amber-500/25 via-zinc-900 to-black'
  },
  {
    id: 'layout-neon-podium',
    nameAr: '24. منصات النيون المتدرجة (Neon Glow Podiums)',
    nameEn: 'Neon Glow Tiered Podiums',
    descriptionAr: 'منصات زجاجية ثلاثية الأبعاد بتدرجات إضاءة نيون وانعكاسات سفلية مبهرة',
    previewBg: 'from-fuchsia-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-diamond-quad',
    nameAr: '25. الماسة الرباعية المجسمة (Diamond Prism Quad)',
    nameEn: 'Diamond Prism Quad View',
    descriptionAr: 'توزيع ماسي هندسي فاخر يوزع البث والأفلام والمسلسلات والمفضلة بأركان متوازنة',
    previewBg: 'from-emerald-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-game-console',
    nameAr: '26. واجهة منصة الألعاب التفاعلية (Next-Gen Console UI)',
    nameEn: 'Next-Gen Game Console Ribbon',
    descriptionAr: 'شريط عرض متدفق على طراز منصات الألعاب الحديثة مع أزرار التحكم وشاشات المعاينة الحية',
    previewBg: 'from-blue-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-panoramic-cards',
    nameAr: '27. البطاقات البانورامية العريضة (Ultra-Wide Panoramic Deck)',
    nameEn: 'Ultra-Wide Panoramic Deck',
    descriptionAr: 'بطاقات بانورامية بنسبة 21:9 ممتدة عرضياً مع إحساس سينمائي غامر',
    previewBg: 'from-indigo-600/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-glass-mosaic',
    nameAr: '28. الفسيفساء الزجاجية الملكية (Royal Glass Mosaic)',
    nameEn: 'Royal Glass Mosaic Grid',
    descriptionAr: 'فسيفساء فنية زجاجية بمقاسات متفاوتة وإضاءات محيطية متغيرة تتفاعل مع ألوان الثيم',
    previewBg: 'from-yellow-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-vertical-reel',
    nameAr: '29. شريط السينما العمودي (Vertical Cinema Reel)',
    nameEn: 'Vertical Cinema Reel Stream',
    descriptionAr: 'عرض رأسي سينمائي ببوسترات طولية فخمة مع تنقل سريع ومباشر',
    previewBg: 'from-rose-500/20 via-zinc-900 to-black'
  },
  {
    id: 'layout-minimalist-zen',
    nameAr: '30. الواجهة الهادئة الأنيقة (Minimalist Zen Studio)',
    nameEn: 'Minimalist Zen Luxury Studio',
    descriptionAr: 'تصميم مينيمال فائق الأناقة والهدوء بخطوط ذهبية ناعمة وأيقونات مصقولة ومساحة مريحة',
    previewBg: 'from-zinc-700/20 via-zinc-900 to-black'
  }
];

// Apply CSS variables to document for dynamic coloring
export function applyRoyalTheme(themeId: string) {
  const theme = ROYAL_THEMES.find(t => t.id === themeId) || ROYAL_THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--color-gold', theme.primary);
  root.style.setProperty('--color-gold-dark', theme.secondary);
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-glow', theme.glow);

  // High-priority dynamic style injection to guarantee immediate color update across all components
  let styleEl = document.getElementById('royal-theme-runtime') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'royal-theme-runtime';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    :root, html, body, #root {
      --color-gold: ${theme.primary} !important;
      --color-gold-dark: ${theme.secondary} !important;
      --theme-primary: ${theme.primary} !important;
      --theme-secondary: ${theme.secondary} !important;
      --theme-accent: ${theme.accent} !important;
      --theme-glow: ${theme.glow} !important;
    }
    .text-gold, .text-amber-400, .text-amber-300, .text-yellow-400, .text-yellow-300 {
      color: ${theme.primary} !important;
    }
    .bg-gold, .bg-amber-500, .bg-amber-600, .bg-yellow-500 {
      background-color: ${theme.primary} !important;
    }
    .border-gold, .border-amber-500, .border-yellow-500 {
      border-color: ${theme.primary} !important;
    }
    .border-gold\\/60, .border-amber-500\\/60, .border-yellow-500\\/60 {
      border-color: ${theme.primary}99 !important;
    }
    .border-gold\\/50, .border-amber-500\\/50, .border-yellow-500\\/50 {
      border-color: ${theme.primary}80 !important;
    }
    .border-gold\\/40, .border-amber-500\\/40, .border-yellow-500\\/40 {
      border-color: ${theme.primary}66 !important;
    }
    .border-gold\\/30, .border-amber-500\\/30, .border-yellow-500\\/30 {
      border-color: ${theme.primary}4D !important;
    }
    .border-gold\\/20, .border-amber-500\\/20, .border-yellow-500\\/20 {
      border-color: ${theme.primary}33 !important;
    }
    .bg-gold\\/5, .bg-amber-500\\/5 {
      background-color: ${theme.primary}0D !important;
    }
    .bg-gold\\/10, .bg-amber-500\\/10 {
      background-color: ${theme.primary}1A !important;
    }
    .bg-gold\\/15, .bg-amber-500\\/15 {
      background-color: ${theme.primary}26 !important;
    }
    .bg-gold\\/20, .bg-amber-500\\/20 {
      background-color: ${theme.primary}33 !important;
    }
    .bg-gold\\/25, .bg-amber-500\\/25 {
      background-color: ${theme.primary}40 !important;
    }
    .fill-gold, .fill-amber-500, .fill-yellow-500 {
      fill: ${theme.primary} !important;
    }
    .from-gold {
      --tw-gradient-from: ${theme.primary} !important;
      --tw-gradient-to: ${theme.primary}00 !important;
      --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
    }
    .via-gold {
      --tw-gradient-to: ${theme.primary}00 !important;
      --tw-gradient-stops: var(--tw-gradient-from), ${theme.primary} !important, var(--tw-gradient-to) !important;
    }
    .to-gold {
      --tw-gradient-to: ${theme.primary} !important;
    }
    .from-gold-dark {
      --tw-gradient-from: ${theme.secondary} !important;
      --tw-gradient-to: ${theme.secondary}00 !important;
      --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
    }
    .via-gold-dark {
      --tw-gradient-to: ${theme.secondary}00 !important;
      --tw-gradient-stops: var(--tw-gradient-from), ${theme.secondary} !important, var(--tw-gradient-to) !important;
    }
    .to-gold-dark {
      --tw-gradient-to: ${theme.secondary} !important;
    }
    .shadow-gold\\/10, .shadow-amber-500\\/10 {
      box-shadow: 0 0 15px ${theme.primary}1A !important;
    }
    .shadow-gold\\/20, .shadow-amber-500\\/20 {
      box-shadow: 0 0 20px ${theme.primary}33 !important;
    }
    .shadow-gold\\/40, .shadow-amber-500\\/40 {
      box-shadow: 0 0 30px ${theme.primary}66 !important;
    }
    .ring-gold, .ring-amber-500, .focus\\:ring-gold:focus, .focus\\:ring-amber-500:focus {
      --tw-ring-color: ${theme.primary} !important;
    }
    .ring-gold\\/70, .ring-amber-500\\/70, .focus\\:ring-gold\\/70:focus {
      --tw-ring-color: ${theme.primary}B3 !important;
    }
    .ring-gold\\/50, .focus\\:ring-gold\\/50:focus {
      --tw-ring-color: ${theme.primary}80 !important;
    }
    .focus\\:border-gold:focus, .focus\\:border-amber-500:focus {
      border-color: ${theme.primary} !important;
    }
    .focus\\:bg-gold\\/10:focus, .focus\\:bg-amber-500\\/10:focus {
      background-color: ${theme.primary}1A !important;
    }
    .hover\\:bg-gold:hover, .hover\\:bg-amber-500:hover {
      background-color: ${theme.primary} !important;
    }
    .hover\\:text-gold:hover, .hover\\:text-amber-400:hover {
      color: ${theme.primary} !important;
    }
    .hover\\:border-gold:hover, .hover\\:border-amber-500:hover {
      border-color: ${theme.primary} !important;
    }
    .hover\\:border-gold\\/50:hover, .hover\\:border-amber-500\\/50:hover {
      border-color: ${theme.primary}80 !important;
    }
    .hover\\:border-gold\\/40:hover, .hover\\:border-amber-500\\/40:hover {
      border-color: ${theme.primary}66 !important;
    }
    
    /* Native focus ring global override */
    :focus {
      outline-color: ${theme.primary} !important;
    }
    
    :focus-visible {
      box-shadow: 0 0 0 4px ${theme.primary}, 0 0 25px ${theme.glow} !important;
      border-color: ${theme.primary} !important;
    }
    
    button:focus-visible, [role="button"]:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
      box-shadow: 0 0 0 4px ${theme.primary}, 0 0 25px ${theme.glow} !important;
      border-color: ${theme.primary} !important;
    }
  `;
}




