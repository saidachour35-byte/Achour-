import React, { useState } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Lightbulb, 
  Check, 
  ArrowRight, 
  Wand2, 
  ExternalLink,
  Sparkles,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { BugItem, BugSeverity } from '../types/analyzer';

interface BugReportListProps {
  bugs: BugItem[];
  score: number;
  summary: string;
  recommendations: string[];
  isAiPowered?: boolean;
  onApplyAllFixes: () => void;
  onSelectLine: (line: number) => void;
  isArabic: boolean;
}

export const BugReportList: React.FC<BugReportListProps> = ({
  bugs,
  score,
  summary,
  recommendations,
  isAiPowered,
  onApplyAllFixes,
  onSelectLine,
  isArabic
}) => {
  const [filter, setFilter] = useState<BugSeverity | 'all'>('all');
  const [expandedBugId, setExpandedBugId] = useState<string | null>(bugs[0]?.id || null);

  const criticalCount = bugs.filter(b => b.severity === 'critical').length;
  const warningCount = bugs.filter(b => b.severity === 'warning').length;
  const suggestionCount = bugs.filter(b => b.severity === 'suggestion').length;

  const filteredBugs = bugs.filter(b => {
    if (filter === 'all') return true;
    return b.severity === filter;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Overview Card */}
      <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg ring-1 ${
              score >= 80 
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' 
                : score >= 50 
                ? 'bg-amber-500/10 text-amber-400 ring-amber-500/30' 
                : 'bg-rose-500/10 text-rose-400 ring-rose-500/30'
            }`}>
              <span>{score}%</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">
                  {isArabic ? 'تقرير فحص الأخطاء' : 'Code Diagnostic Report'}
                </h3>
                {isAiPowered && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Sparkles className="w-3 h-3" />
                    AI Gemini
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                {summary}
              </p>
            </div>
          </div>

          {/* Quick Apply All Fixes Button */}
          {bugs.length > 0 && (
            <button
              onClick={onApplyAllFixes}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition shrink-0"
            >
              <Wand2 className="w-4 h-4" />
              <span>{isArabic ? 'إصلاح شامل تلقائي' : 'Apply All Fixes'}</span>
            </button>
          )}
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isArabic ? `الكل (${bugs.length})` : `All (${bugs.length})`}
          </button>

          <button
            onClick={() => setFilter('critical')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              filter === 'critical'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                : 'bg-slate-800/50 text-rose-400 hover:text-rose-300'
            }`}
          >
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>{isArabic ? `حرجة (${criticalCount})` : `Critical (${criticalCount})`}</span>
          </button>

          <button
            onClick={() => setFilter('warning')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              filter === 'warning'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                : 'bg-slate-800/50 text-amber-400 hover:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>{isArabic ? `تحذيرات (${warningCount})` : `Warnings (${warningCount})`}</span>
          </button>

          {suggestionCount > 0 && (
            <button
              onClick={() => setFilter('suggestion')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                filter === 'suggestion'
                  ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                  : 'bg-slate-800/50 text-sky-400 hover:text-sky-300'
              }`}
            >
              <Lightbulb className="w-3 h-3 text-sky-400" />
              <span>{isArabic ? `تحسينات (${suggestionCount})` : `Suggestions (${suggestionCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bugs Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredBugs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-200 text-sm mb-1">
              {isArabic ? 'لم يتم العثور على أخطاء في هذا التصنيف' : 'No bugs found in this category'}
            </h4>
            <p className="text-xs text-slate-400 max-w-xs">
              {isArabic 
                ? 'الكود متوافق أو يمكنك تجربة نموذج آخر أو فحص كود جديد.' 
                : 'Your code meets standards or you can test another snippet.'}
            </p>
          </div>
        ) : (
          filteredBugs.map((bug) => {
            const isExpanded = expandedBugId === bug.id;

            return (
              <div
                key={bug.id}
                className={`border rounded-xl transition duration-200 overflow-hidden ${
                  bug.severity === 'critical'
                    ? 'border-rose-900/40 bg-rose-950/10 hover:border-rose-800/70'
                    : bug.severity === 'warning'
                    ? 'border-amber-900/40 bg-amber-950/10 hover:border-amber-800/70'
                    : 'border-sky-900/40 bg-sky-950/10 hover:border-sky-800/70'
                }`}
              >
                {/* Header of Bug Item */}
                <div
                  onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                  className="p-3 cursor-pointer flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {bug.severity === 'critical' && <XCircle className="w-4 h-4 text-rose-400" />}
                      {bug.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      {bug.severity === 'suggestion' && <Lightbulb className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200 text-xs">
                          {bug.title}
                        </span>
                        {bug.line && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLine(bug.line!);
                            }}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                            title={isArabic ? 'انتقل إلى هذا السطر في المحرر' : 'Jump to line in editor'}
                          >
                            {isArabic ? `سطر ${bug.line}` : `Line ${bug.line}`}
                          </button>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                        {bug.description}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                      isExpanded ? 'rotate-90' : 'rtl:rotate-180'
                    }`}
                  />
                </div>

                {/* Expanded Snippet Preview */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-800/60 bg-slate-950/60 space-y-2">
                    {bug.originalSnippet && (
                      <div>
                        <div className="text-[10px] font-semibold text-rose-400 mb-1 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>{isArabic ? 'الكود الخاطئ المكتشف:' : 'Problematic Snippet:'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/30 font-mono text-[11px] text-rose-200 overflow-x-auto whitespace-pre-wrap dir-ltr text-left">
                          {bug.originalSnippet}
                        </div>
                      </div>
                    )}

                    {bug.fixedSnippet && (
                      <div>
                        <div className="text-[10px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>{isArabic ? 'الحل والإصلاح المقترح:' : 'Recommended Fix:'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-900/30 font-mono text-[11px] text-emerald-200 overflow-x-auto whitespace-pre-wrap dir-ltr text-left">
                          {bug.fixedSnippet}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Recommendations block */}
        {recommendations.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <h5 className="text-xs font-semibold text-indigo-300 mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>{isArabic ? 'توصيات هندسية لتحسين الكود:' : 'Architectural Best Practices:'}</span>
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-400">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
