
/**
 * Platform utility for Achour Player
 * Handles environment detection and URL adaptation (Proxy vs Direct)
 */

export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (cap) {
    if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
    if (cap.platform === 'android' || cap.platform === 'ios') return true;
    if (typeof cap.getPlatform === 'function' && (cap.getPlatform() === 'android' || cap.getPlatform() === 'ios')) return true;
  }
  const isCapacitorHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'capacitor.default';
  const isCapacitorScheme = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:' || isCapacitorHost;
  const hasNativeBridge = !!((window as any).AchourNative || (window as any).Android || (window as any).JSBridge);
  const isAndroidWebView = /wv|Android.*Version\/[0-9]/i.test(navigator.userAgent);
  
  return isCapacitorScheme || hasNativeBridge || isAndroidWebView;
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return isNativeApp() || /android/i.test(navigator.userAgent);
};

export const isAndroidDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return !!((window as any).AchourNative || /android/i.test(ua) || ua.includes('wv') || (ua.includes('android') && ua.includes('version/')));
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isMobileMarker = /iphone|ipod|android.*mobile|windows.*phone|blackberry.*mobile/i.test(ua);
  const isTVMarker = /aft|firetv|smarttv|googletv|android tv|leanback|large-screen|box/i.test(ua);
  
  if (isMobileMarker && !isTVMarker) return true;
  if (window.innerWidth < 600 && window.innerHeight < 1000 && !isTVMarker) return true;

  return false;
};

export const isTVDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isTVMarker = /aft|firetv|smarttv|googletv|android tv|leanback|large-screen|box|mibox|tvbox/i.test(ua);
  return isTVMarker || !!((window as any).AchourNative);
};

/**
 * Transforms a URL based on the environment.
 * In Native APK (Capacitor / Android), we execute directly to provider host bypassing web-proxy.
 * In Web / Preview, we route through Express /api/proxy to avoid CORS/mixed-content.
 */
export const getPlatformUrl = (type: 'stream' | 'm3u' | 'xtream' | 'stalker' | 'epg' | 'get', rawUrl: string, params: Record<string, string> = {}): string => {
  if (!rawUrl) return '';

  // In native Android APK, direct stream URLs work natively with ExoPlayer / Hls.js / Native Video
  if (type === 'stream') {
    if (isNativeApp()) {
      return rawUrl;
    }
    const query = new URLSearchParams({ url: rawUrl, ...params });
    return `/api/proxy/stream?${query.toString()}`;
  }

  // In Native Android APK, API requests connect directly to the provider host
  if (isNativeApp()) {
    if (type === 'xtream') {
      const cleanHost = rawUrl.trim().replace(/\/+$/, '').replace(/\/(player_api|get|index)\.php.*$/i, '').replace(/\/c\/?$/i, '').replace(/\?.*$/, '');
      const search = new URLSearchParams(params);
      return `${cleanHost}/player_api.php?${search.toString()}`;
    }
    if (type === 'm3u' || type === 'get' || type === 'epg' || type === 'stalker') {
      return rawUrl;
    }
  }

  // Web Browser / AI Studio Preview: Route through server-side proxy
  const query = new URLSearchParams({ url: rawUrl, ...params });
  return `/api/proxy/${type}?${query.toString()}`;
};

