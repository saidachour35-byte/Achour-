import axios from 'axios';
import { Playlist } from '../types';
import { getPlatformUrl } from './platform';

export interface SubscriptionInfo {
  formattedDate: string;
  isExpired: boolean;
  daysRemaining: number | null;
  statusText: string;
  hasDate: boolean;
  rawDate: string | number | null;
}

/**
 * Parses and formats any expiration date (Unix timestamp, ISO string, dd/mm/yyyy, or unlimited)
 */
export function parseExpiryDate(raw: any, isRtl: boolean = true): SubscriptionInfo {
  if (raw === undefined || raw === null || raw === '' || raw === 'null' || raw === 'None') {
    return {
      formattedDate: isRtl ? 'حسب الرابط / غير محدد' : 'Per Link / Not specified',
      isExpired: false,
      daysRemaining: null,
      statusText: isRtl ? 'حسب الرابط' : 'Per link info',
      hasDate: false,
      rawDate: null
    };
  }

  // Check for 0 or unlimited / lifetime
  if (raw === 0 || raw === '0' || String(raw).toLowerCase() === 'unlimited' || String(raw).toLowerCase() === 'lifetime') {
    return {
      formattedDate: isRtl ? 'دائم / غير محدود' : 'Lifetime / Unlimited',
      isExpired: false,
      daysRemaining: 9999,
      statusText: isRtl ? '🟢 اشتراك مفتوح دائم' : '🟢 Lifetime Access',
      hasDate: true,
      rawDate: raw
    };
  }

  let date: Date | null = null;

  // Check if it's a numeric unix timestamp (in seconds or ms)
  const num = Number(raw);
  if (!isNaN(num) && num > 0) {
    if (num < 10000000000) {
      // 10 digits = seconds
      date = new Date(num * 1000);
    } else {
      // 13 digits = ms
      date = new Date(num);
    }
  } else {
    // String date e.g. "2027-01-15" or "15-01-2027" or "15/01/2027"
    const str = String(raw).trim();
    const parts = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (parts) {
      date = new Date(`${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
    } else {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    }
  }

  if (!date || isNaN(date.getTime())) {
    return {
      formattedDate: String(raw),
      isExpired: false,
      daysRemaining: null,
      statusText: isRtl ? 'حسب بيانات الرابط' : 'From Link Data',
      hasDate: true,
      rawDate: raw
    };
  }

  const now = Date.now();
  const diffTime = date.getTime() - now;
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = diffTime <= 0;

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  // Exact user format: e.g. 15/1/2027
  const formattedDate = `${day}/${month}/${year}`;

  let statusText = '';
  if (isExpired) {
    statusText = isRtl ? `🔴 منتهي منذ ${Math.abs(daysRemaining)} يوم (${formattedDate})` : `🔴 Expired ${Math.abs(daysRemaining)}d ago (${formattedDate})`;
  } else if (daysRemaining <= 7) {
    statusText = isRtl ? `⚠️ يوشك على الانتهاء (${daysRemaining} يوم متبقي - ${formattedDate})` : `⚠️ Expiring soon (${daysRemaining}d left - ${formattedDate})`;
  } else {
    statusText = isRtl ? `🟢 نشط (${daysRemaining} يوم متبقي - ${formattedDate})` : `🟢 Active (${daysRemaining}d left - ${formattedDate})`;
  }

  return {
    formattedDate,
    isExpired,
    daysRemaining,
    statusText,
    hasDate: true,
    rawDate: raw
  };
}

/**
 * Attempts to retrieve subscription expiration date from Xtream Codes API or M3U parameters
 */
export async function fetchLiveSubscriptionExpiry(playlist: Playlist): Promise<string | number | null> {
  if (!playlist) return null;

  // 1. Xtream connection
  if (playlist.type === 'xtream' && playlist.url && playlist.username && playlist.password) {
    try {
      const fetchUrl = getPlatformUrl('xtream', playlist.url, {
        username: playlist.username,
        password: playlist.password,
        action: 'auth'
      });
      const res = await axios.get(fetchUrl, { timeout: 8000 });
      const exp = res.data?.user_info?.exp_date;
      if (exp !== undefined && exp !== null && exp !== '') {
        return exp;
      }
    } catch (e) {
      console.warn('Failed to fetch xtream exp_date:', e);
    }
  }

  // 2. M3U with embedded Xtream credentials
  if (playlist.url && playlist.url.includes('username=') && playlist.url.includes('password=')) {
    try {
      const u = new URL(playlist.url.startsWith('http') ? playlist.url : 'http://' + playlist.url);
      const user = u.searchParams.get('username');
      const pass = u.searchParams.get('password');
      const host = `${u.protocol}//${u.host}`;
      if (user && pass && host) {
        const fetchUrl = getPlatformUrl('xtream', host, {
          username: user,
          password: pass,
          action: 'auth'
        });
        const res = await axios.get(fetchUrl, { timeout: 8000 });
        const exp = res.data?.user_info?.exp_date;
        if (exp !== undefined && exp !== null && exp !== '') {
          return exp;
        }
      }
    } catch (e) {}
  }


  // 3. Fallback to existing playlist expDate
  if (playlist.expDate) {
    return playlist.expDate;
  }

  return null;
}
