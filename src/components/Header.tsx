import React from 'react';
import { 
  Bug, 
  Sparkles, 
  Play, 
  Upload, 
  FileCode, 
  ShieldCheck, 
  Globe, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { PRESET_SAMPLES } from '../utils/presets';
import { PresetSample } from '../types/analyzer';

interface HeaderProps {
  onSelectPreset: (preset: PresetSample) => void;
  onOpenUpload: () => void;
  onRunAnalyze: () => void;
  isAnalyzing: boolean;
  hasGemini: boolean;
  score: number;
  bugCount: number;
  isArabic: boolean;
  onToggleLanguage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectPreset,
  onOpenUpload,
  onRunAnalyze,
  isAnalyzing,
  hasGemini,
  score,
  bugCount,
  isArabic,
  onToggleLanguage
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Bug className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                {isArabic ? 'مصلح الأخطاء ومعاين الكود' : 'Code Bug Fixer & Live Preview'}
              </h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {isArabic 
                ? 'فحص شامل للأخطاء البرمجية وإصلاح فوري مع معاينة حية تفاعلية' 
                : 'Comprehensive AST & AI code diagnostics with interactive sandbox preview'}
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isArabic ? 'المحلل الفوري: نشط' : 'AST Analyzer: Active'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {hasGemini 
                ? (isArabic ? 'Gemini AI: متصل' : 'Gemini AI: Connected') 
                : (isArabic ? 'التحليل المحلي فائق السرعة' : 'Fast Local Engine')}
            </span>
          </div>

          {/* Code Health Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${
            score >= 80 
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
              : score >= 50 
              ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' 
              : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
          }`}>
            {score >= 80 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{isArabic ? `صحة الكود: ${score}%` : `Health: ${score}%`}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <div className="relative group">
            <button 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title={isArabic ? 'اختر نموذجاً لتجربة فحص الأخطاء' : 'Select a buggy code demo'}
            >
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>{isArabic ? 'نماذج جاهزة' : 'Buggy Demos'}</span>
            </button>
            
            <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-1 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 hidden group-hover:block hover:block z-50">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 mb-1 border-b border-slate-800">
                {isArabic ? 'أمثلة واقعية لأخطاء برمجية شائعة' : 'Real-World Common Bugs'}
              </div>
              <div className="space-y-1">
                {PRESET_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => onSelectPreset(sample)}
                    className="w-full text-right rtl:text-right ltr:text-left px-2.5 py-2 rounded-lg hover:bg-slate-800/90 text-xs text-slate-300 hover:text-white transition group/item"
                  >
                    <div className="font-semibold text-indigo-300 group-hover/item:text-indigo-200">
                      {isArabic ? sample.titleAr : sample.titleEn}
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {isArabic ? sample.descAr : sample.descEn}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            title={isArabic ? 'ارفع ملف الكود الخاص بك' : 'Upload your code file'}
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>{isArabic ? 'رفع ملف' : 'Upload File'}</span>
          </button>

          {/* Run Analysis Button */}
          <button
            onClick={onRunAnalyze}
            disabled={isAnalyzing}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-md transition ${
              isAnalyzing 
                ? 'bg-slate-700 cursor-not-allowed opacity-80' 
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/30'
            }`}
          >
            {isAnalyzing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{isArabic ? 'جاري الفحص...' : 'Analyzing...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isArabic ? 'فحص وتصحيح' : 'Diagnose & Fix'}</span>
              </>
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
            title={isArabic ? 'تغيير اللغة إلى English' : 'Switch to Arabic'}
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
