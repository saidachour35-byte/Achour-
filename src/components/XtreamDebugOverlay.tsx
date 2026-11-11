
import React, { useState, useEffect } from 'react';
import { getDiagnosticHistory, XtreamDiagnosticResult } from '../utils/xtreamDiagnostics';

const XtreamDebugOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [history, setHistory] = useState<XtreamDiagnosticResult[]>([]);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    setHistory(getDiagnosticHistory());

    const handleUpdate = () => {
      setHistory([...getDiagnosticHistory()]);
    };

    window.addEventListener('xtream-diagnostic-update', handleUpdate);
    return () => window.removeEventListener('xtream-diagnostic-update', handleUpdate);
  }, []);

  // Hidden activation: Triple click on a specific area (or just a small button for now)
  const handleSecretClick = () => {
    setClickCount(prev => {
      if (prev + 1 >= 5) {
        setIsVisible(true);
        return 0;
      }
      return prev + 1;
    });
    
    // Reset click count after 2 seconds
    setTimeout(() => setClickCount(0), 2000);
  };

  if (!isVisible) {
    return (
      <div 
        onClick={handleSecretClick}
        className="fixed bottom-0 right-0 w-12 h-12 z-[9999] cursor-default opacity-0 hover:opacity-10"
        title="Debug Overlay (Click 5 times)"
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-[10000] p-4 overflow-auto font-mono text-xs text-green-400">
      <div className="flex justify-between items-center mb-4 border-b border-green-800 pb-2">
        <h2 className="text-xl font-bold">Xtream Codes Diagnostics</h2>
        <button 
          onClick={() => setIsVisible(false)}
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
        >
          Close
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-gray-500 italic">No diagnostic data yet. Try loading a playlist.</div>
      ) : (
        <div className="space-y-6">
          {history.map((item, index) => (
            <div key={index} className="border border-green-900 rounded p-3 bg-black/50">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">{item.timestamp}</span>
                <span className={`font-bold ${item.isSuccess ? 'text-green-500' : 'text-red-500'}`}>
                  Status: {item.status} {item.isSuccess ? '(OK)' : '(FAIL)'}
                </span>
              </div>
              
              {item.error && (
                <div className="mb-2 p-2 bg-red-900/30 border border-red-800 text-red-300">
                  <strong>Error:</strong> {item.error}
                </div>
              )}

              <div className="mt-2">
                <div className="text-gray-400 mb-1">Raw JSON Structure:</div>
                <pre className="bg-black p-2 rounded overflow-x-auto border border-green-950 max-h-96">
                  {JSON.stringify(item.rawData, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default XtreamDebugOverlay;
