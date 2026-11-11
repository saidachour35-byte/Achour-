import React, { useState } from 'react';
import { Copy, Check, Wand2, Download, ArrowLeftRight, Columns, AlignJustify } from 'lucide-react';

interface DiffViewerProps {
  originalCode: string;
  fixedCode: string;
  filename: string;
  onApplyFixed: () => void;
  isArabic: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalCode,
  fixedCode,
  filename,
  onApplyFixed,
  isArabic
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  const origLines = originalCode.split('\n');
  const fixedLines = fixedCode.split('\n');

  const handleCopyFixed = async () => {
    try {
      await navigator.clipboard.writeText(fixedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const handleDownloadFixed = () => {
    const blob = new Blob([fixedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename ? `fixed_${filename}` : 'fixed_code.jsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Diff Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-950/70 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">
            {isArabic ? 'مقارنة الفروقات (Diff Viewer)' : 'Code Diff Comparison'}
          </span>
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isArabic ? 'منقسم' : 'Split'}
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                viewMode === 'unified' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isArabic ? 'موحد' : 'Unified'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyFixed}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition text-[11px]"
            title={isArabic ? 'نسخ الكود المصحح' : 'Copy Fixed Code'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ المصحح' : 'Copy Fixed')}</span>
          </button>

          <button
            onClick={handleDownloadFixed}
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition text-[11px]"
            title={isArabic ? 'تحميل الملف المصحح' : 'Download Fixed File'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onApplyFixed}
            className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition text-[11px] shadow-sm"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{isArabic ? 'اعتماد الكود المصحح' : 'Apply to Editor'}</span>
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto bg-slate-950 font-mono text-xs leading-[20px] select-text">
        {viewMode === 'split' ? (
          <div className="grid grid-cols-2 h-full divide-x divide-slate-800 dir-ltr text-left">
            {/* Left: Original Code */}
            <div className="overflow-auto p-3">
              <div className="text-[11px] font-bold text-rose-400 pb-2 mb-2 border-b border-rose-950/80 flex items-center justify-between sticky top-0 bg-slate-950">
                <span>{isArabic ? 'الكود الأصلي (به أخطاء)' : 'Original (With Bugs)'}</span>
                <span className="text-[10px] text-slate-500">{origLines.length} lines</span>
              </div>
              <div className="space-y-0.5">
                {origLines.map((line, idx) => {
                  const isModified = fixedLines[idx] !== line;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 px-1 rounded ${
                        isModified ? 'bg-rose-950/30 text-rose-200' : 'text-slate-400'
                      }`}
                    >
                      <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                      <span className="select-none text-rose-500 w-3">{isModified ? '-' : ' '}</span>
                      <pre className="whitespace-pre-wrap font-mono m-0 flex-1">{line || ' '}</pre>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Fixed Code */}
            <div className="overflow-auto p-3">
              <div className="text-[11px] font-bold text-emerald-400 pb-2 mb-2 border-b border-emerald-950/80 flex items-center justify-between sticky top-0 bg-slate-950">
                <span>{isArabic ? 'الكود المصحح (نظيف وسليم)' : 'Fixed Version (Clean)'}</span>
                <span className="text-[10px] text-slate-500">{fixedLines.length} lines</span>
              </div>
              <div className="space-y-0.5">
                {fixedLines.map((line, idx) => {
                  const isModified = origLines[idx] !== line;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 px-1 rounded ${
                        isModified ? 'bg-emerald-950/30 text-emerald-200 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                      <span className="select-none text-emerald-400 w-3">{isModified ? '+' : ' '}</span>
                      <pre className="whitespace-pre-wrap font-mono m-0 flex-1">{line || ' '}</pre>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Unified View */
          <div className="p-3 dir-ltr text-left">
            <div className="space-y-0.5">
              {fixedLines.map((line, idx) => {
                const orig = origLines[idx];
                const isDifferent = orig !== line;

                return (
                  <div key={idx} className="space-y-0.5">
                    {isDifferent && orig !== undefined && (
                      <div className="flex items-start gap-2 px-1 bg-rose-950/40 text-rose-200 rounded">
                        <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                        <span className="select-none text-rose-400 font-bold w-3">-</span>
                        <pre className="whitespace-pre-wrap font-mono m-0 flex-1">{orig}</pre>
                      </div>
                    )}
                    <div
                      className={`flex items-start gap-2 px-1 rounded ${
                        isDifferent ? 'bg-emerald-950/40 text-emerald-200 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                      <span className={`select-none w-3 ${isDifferent ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
                        {isDifferent ? '+' : ' '}
                      </span>
                      <pre className="whitespace-pre-wrap font-mono m-0 flex-1">{line || ' '}</pre>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
