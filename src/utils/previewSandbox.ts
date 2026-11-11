/**
 * Generates an isolated, safe HTML string for previewing code (HTML/CSS/JS or React JSX)
 * with built-in runtime console interception and error forwarding.
 */
export function buildPreviewHtml(code: string, language: string = 'jsx'): string {
  const isHtmlDoc = code.trim().toLowerCase().startsWith('<!doctype html') || code.trim().toLowerCase().startsWith('<html');

  if (isHtmlDoc) {
    // Inject error interception script inside the HTML document
    const errorInterceptor = `
      <script>
        (function() {
          function sendLog(type, args) {
            try {
              var message = Array.prototype.slice.call(args).map(function(arg) {
                if (arg instanceof Error) return arg.message + '\\n' + (arg.stack || '');
                if (typeof arg === 'object') {
                  try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
                }
                return String(arg);
              }).join(' ');
              window.parent.postMessage({ type: 'CONSOLE_LOG', level: type, message: message }, '*');
            } catch (err) {}
          }

          var origLog = console.log;
          var origWarn = console.warn;
          var origError = console.error;
          var origInfo = console.info;

          console.log = function() { sendLog('log', arguments); origLog.apply(console, arguments); };
          console.warn = function() { sendLog('warn', arguments); origWarn.apply(console, arguments); };
          console.error = function() { sendLog('error', arguments); origError.apply(console, arguments); };
          console.info = function() { sendLog('info', arguments); origInfo.apply(console, arguments); };

          window.onerror = function(msg, url, lineNo, columnNo, error) {
            sendLog('error', ['خطأ تشغيل (Runtime Error): ' + msg + (lineNo ? ' (السطر ' + lineNo + ')' : '')]);
            return false;
          };

          window.addEventListener('unhandledrejection', function(event) {
            sendLog('error', ['وعد غير معالج (Unhandled Promise Rejection): ' + (event.reason ? (event.reason.message || event.reason) : 'Unknown error')]);
          });
        })();
      </script>
    `;

    if (code.includes('<head>')) {
      return code.replace('<head>', `<head>${errorInterceptor}`);
    }
    return errorInterceptor + code;
  }

  // Otherwise, it's a React component, JavaScript, or JSX snippet
  // We sanitize or wrap it with Babel and React 18 inside the iframe
  const sanitizedCode = code
    .replace(/import\s+React.*?from\s+['"]react['"];?/g, '')
    .replace(/import\s+\{.*?\}\s+from\s+['"]react['"];?/g, '')
    .replace(/import\s+.*?;/g, '')
    .replace(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/g, 'function App')
    .replace(/export\s+default\s+([A-Za-z0-9_$]+);?/g, 'const MainRoot = $1;');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Preview Sandbox</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- React & ReactDOM -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <!-- Babel Standalone for live JSX compilation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      font-family: 'Tajawal', system-ui, sans-serif;
      margin: 0;
      padding: 16px;
      background-color: #ffffff;
      color: #1f2937;
      min-height: 100vh;
    }
    #error-display {
      display: none;
      background: #fef2f2;
      border: 1px solid #f87171;
      color: #b91c1c;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
      direction: ltr;
      text-align: left;
    }
  </style>
</head>
<body>
  <div id="error-display"></div>
  <div id="root">
    <div style="padding: 20px; color: #6b7280; text-align: center;">
      جاري تحميل وتصيير المكون...
    </div>
  </div>

  <script>
    // Console and error forwarder
    (function() {
      function sendLog(type, args) {
        try {
          var message = Array.prototype.slice.call(args).map(function(arg) {
            if (arg instanceof Error) return arg.message + '\\n' + (arg.stack || '');
            if (typeof arg === 'object') {
              try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
            }
            return String(arg);
          }).join(' ');
          window.parent.postMessage({ type: 'CONSOLE_LOG', level: type, message: message }, '*');
        } catch (err) {}
      }

      var origLog = console.log;
      var origWarn = console.warn;
      var origError = console.error;

      console.log = function() { sendLog('log', arguments); origLog.apply(console, arguments); };
      console.warn = function() { sendLog('warn', arguments); origWarn.apply(console, arguments); };
      console.error = function() { 
        sendLog('error', arguments); 
        origError.apply(console, arguments);
        showErrorBox(arguments[0]);
      };

      function showErrorBox(err) {
        var el = document.getElementById('error-display');
        if (el) {
          el.style.display = 'block';
          el.innerText = 'Runtime Error:\\n' + (err && err.message ? err.message : String(err));
        }
      }

      window.onerror = function(msg, url, lineNo, columnNo, error) {
        var errMsg = msg + (lineNo ? ' (line ' + lineNo + ')' : '');
        showErrorBox(errMsg);
        sendLog('error', ['خطأ تشغيل (Runtime Error): ' + errMsg]);
        return false;
      };

      window.addEventListener('unhandledrejection', function(event) {
        var reason = event.reason ? (event.reason.message || event.reason) : 'Promise Rejected';
        showErrorBox('Unhandled Rejection: ' + reason);
        sendLog('error', ['استثناء غير معالج: ' + reason]);
      });
    })();
  </script>

  <script type="text/babel">
    try {
      const { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext } = React;
      
      ${sanitizedCode}

      const targetComponent = typeof App !== 'undefined' 
        ? App 
        : (typeof MainRoot !== 'undefined' ? MainRoot : null);

      if (targetComponent) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(targetComponent));
      } else {
        document.getElementById('root').innerHTML = '<div style="padding: 24px; text-align: center; color: #4b5563;">تم تحميل الكود النصي. لا يوجد مكون تصيير افتراضي App.</div>';
      }
    } catch (err) {
      console.error(err);
      const el = document.getElementById('error-display');
      if (el) {
        el.style.display = 'block';
        el.innerText = 'Syntax / Transpilation Error:\\n' + (err.message || String(err));
      }
      document.getElementById('root').innerHTML = '<div style="padding: 20px; color: #ef4444; font-weight: bold; text-align: center;">تعذر تصيير المكون بسبب خطأ برمجي. تفقد تبويب وحدة التحكم (Console) لمزيد من التفاصيل.</div>';
    }
  </script>
</body>
</html>`;
}
