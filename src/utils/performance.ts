
/**
 * Utility for performance optimization and non-blocking background processing.
 */

/**
 * Processes an array of items in smaller chunks asynchronously to avoid blocking the main UI thread.
 * Especially useful for heavy data processing of large IPTV playlists (up to millions of items).
 */
export async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processFn: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  if (!items || items.length === 0) return [];
  
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await processFn(chunk);
    if (Array.isArray(chunkResults)) {
      results.push(...chunkResults);
    }
    
    // Yield to the main thread to keep UI responsive
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return results;
}

/**
 * Throttles function calls based on a minimum interval.
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn(...args);
    }
  }) as T;
}

/**
 * Debounces function calls.
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null;
  return ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;
}
