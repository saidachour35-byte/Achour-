import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Achour Player:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    try {
      // Clear settings or cache that might cause corrupted state
      localStorage.removeItem('achour_settings_v2');
      localStorage.removeItem('achour_last_stream_id');
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#080808] text-white flex flex-col items-center justify-center p-6 select-none font-cairo">
          <div className="max-w-md w-full bg-zinc-950/90 border border-[#D4AF37]/40 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(212,175,55,0.15)] backdrop-blur-xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center mx-auto shadow-lg">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase text-white tracking-wider">
                حدث خطأ في النظام
              </h2>
              <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                عذراً، حدث خطأ غير متوقع أثناء تشغيل الواجهة. يمكنك إعادة تحميل الصفحة أو إعادة ضبط الإعدادات.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/80 rounded-xl border border-white/10 text-left font-mono text-[10px] text-red-400 max-h-32 overflow-y-auto break-all select-all">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#D4AF37]/20 text-xs"
              >
                <RefreshCw size={16} />
                <span>إعادة تحميل المشغل</span>
              </button>

              <button
                onClick={this.handleResetState}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-xs border border-white/10"
              >
                <RotateCcw size={14} />
                <span>إعادة ضبط البيانات المؤقتة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
