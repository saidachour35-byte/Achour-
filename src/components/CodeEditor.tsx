import React, { useRef, useEffect } from 'react';
import { Copy, Trash2, Check, AlertCircle, FileCode, Wand2, Download } from 'lucide-react';
import { BugItem } from '../types/analyzer';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  filename: string;
  onChangeFilename?: (name: string) => void;
  bugs: BugItem[];
  highlightLine?: number | null;
  onSelectLine?: (line: number) => void;
  isArabic: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  filename,
  onChangeFilename,
  bugs,
  highlightLine,
  onSelectLine,
  isArabic
}) => {
  const [copied, setCopied] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');
  const lineCount = lines.length;

  // Map bugs by line number
  const bugLineMap = React.useMemo(() => {
    const map = new Map<number, BugItem[]>();
    bugs.forEach(b => {
      if (b.line) {
        const list = map.get(b.line) || [];
        list.push(b);
        map.set(b.line, list);
      }
    });
    return map;
  }, [bugs]);

  // Synchronize scroll between gutter and textarea
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'code.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Scroll to line if requested
  useEffect(() => {
    if (highlightLine && textareaRef.current) {
      const lineHeight = 20; // estimate in px
      textareaRef.current.scrollTop = Math.max(0, (highlightLine - 5) * lineHeight);
    }
  }, [highlightLine]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-950/70 text-xs">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <input
            type="text"
            value={filename}
            onChange={(e) => onChangeFilename?.(e.target.value)}
            className="bg-transparent border-none text-slate-200 font-mono text-xs focus:ring-1 focus:ring-inset focus:ring-indigo-500 rounded px-1.5 py-0.5 outline-none w-44"
            placeholder="اسم الملف (مثال: App.jsx)"
          />
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            ({lineCount} {isArabic ? 'سطراً' : 'lines'}, {code.length} {isArabic ? 'حرفاً' : 'chars'})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition text-[11px]"
            title={isArabic ? 'نسخ الكود' : 'Copy Code'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ' : 'Copy')}</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition text-[11px]"
            title={isArabic ? 'تحميل الملف' : 'Download File'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onChange('')}
            className="p-1 rounded bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition text-[11px]"
            title={isArabic ? 'مسح الكود' : 'Clear Editor'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body: Gutter + Textarea */}
      <div className="relative flex-1 flex overflow-hidden font-mono text-sm leading-[20px] bg-slate-950">
        {/* Line Gutter with error markers */}
        <div
          ref={gutterRef}
          className="select-none bg-slate-900/60 text-slate-600 border-r border-slate-800/80 py-3 px-2 flex flex-col text-right w-12 shrink-0 overflow-hidden"
          style={{ height: '100%' }}
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const lineBugs = bugLineMap.get(lineNum);
            const isTarget = highlightLine === lineNum;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between text-xs h-[20px] cursor-pointer transition ${
                  isTarget ? 'text-amber-400 font-bold bg-amber-500/10' : ''
                }`}
                onClick={() => onSelectLine?.(lineNum)}
                title={lineBugs ? `${lineBugs.length} ${isArabic ? 'خطأ في هذا السطر' : 'error on this line'}` : undefined}
              >
                <span>
                  {lineBugs && (
                    <span className="w-2 h-2 rounded-full inline-block mr-1 bg-rose-500 animate-pulse"></span>
                  )}
                </span>
                <span className={lineBugs ? 'text-rose-400 font-semibold' : 'text-slate-600'}>
                  {lineNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          dir="ltr"
          placeholder={isArabic ? "// الصق هنا الكود الذي به مشاكل (React, JavaScript, HTML, CSS) أو اضغط 'رفع ملف'..." : "// Paste your code with bugs here, or click 'Upload File'..."}
          className="w-full h-full p-3 bg-transparent text-slate-100 resize-none outline-none overflow-auto whitespace-pre font-mono text-[13px] leading-[20px] focus:ring-0 selection:bg-indigo-500/30 border-none"
        />
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {bugs.length > 0 ? (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {isArabic 
                ? `يوجد ${bugs.length} خطأ وملاحظة تم تحديدها على أسطر الكود` 
                : `${bugs.length} bugs and notes marked on lines`}
            </span>
          ) : (
            <span className="text-emerald-400">
              {isArabic ? 'لا توجد أخطاء مسجلة حالياً' : 'No bugs reported'}
            </span>
          )}
        </div>
        <span className="text-slate-500 text-[10px]">UTF-8 • JSX / TSX / HTML</span>
      </div>
    </div>
  );
};
