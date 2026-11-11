import React, { useState, useRef } from 'react';
import { Upload, X, FileCode, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { CodeFile } from '../types/analyzer';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileLoaded: (file: CodeFile) => void;
  isArabic: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onFileLoaded,
  isArabic
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Read file text
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (typeof content === 'string') {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let language = 'javascript';
        if (['html', 'htm'].includes(ext)) language = 'html';
        else if (['css'].includes(ext)) language = 'css';
        else if (['json'].includes(ext)) language = 'json';
        else if (['py'].includes(ext)) language = 'python';
        else if (['jsx', 'tsx'].includes(ext)) language = 'jsx';

        onFileLoaded({
          name: file.name,
          content,
          language,
          size: file.size
        });
        onClose();
      }
    };
    reader.onerror = () => {
      setErrorMessage(isArabic ? 'فشلت قراءة الملف. يرجى تجربة ملف آخر.' : 'Failed to read file. Please try another.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">
              {isArabic ? 'رفع ملف كود لفحصه' : 'Upload Code File to Inspect'}
            </h3>
            <p className="text-xs text-slate-400">
              {isArabic ? 'يدعم ملفات React و JavaScript و HTML و CSS و Python و JSON' : 'Supports React, JSX/TSX, HTML, CSS, JS, Python & JSON files'}
            </p>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-700 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-950/80'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            accept=".js,.jsx,.ts,.tsx,.html,.css,.json,.py,.txt"
          />

          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-300">
            <FileCode className="w-6 h-6 text-indigo-400" />
          </div>

          <h4 className="font-semibold text-slate-200 text-sm mb-1">
            {isArabic ? 'اسحب الملف وأفلته هنا، أو اضغط للاختيار من جهازك' : 'Drag and drop file here, or click to browse'}
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {isArabic ? 'يمكنك رفع أي ملف برمجي يحتوي على أخطاء لتحليله وإصلاحه فوراً.' : 'Upload any source code file with bugs to diagnose and fix.'}
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {isArabic ? 'فحص تلقائي فوري بمجرد الاختيار' : 'Instant diagnosis on upload'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
