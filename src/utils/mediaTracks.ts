
/**
 * Utility for formatting and handling media track labels (audio, subtitles).
 */

const LANG_MAP: Record<string, string> = {
  ar: 'العربية (Arabic)',
  en: 'English',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
  es: 'Español (Spanish)',
  it: 'Italiano (Italian)',
  tr: 'Türkçe (Turkish)',
  ru: 'Русский (Russian)',
  pt: 'Português (Portuguese)',
  hi: 'हिन्दी (Hindi)',
  zh: '中文 (Chinese)',
  ja: '日本語 (Japanese)',
  ko: '한국어 (Korean)',
};

/**
 * Formats a language code or label into a human-readable string.
 */
export const formatLanguageLabel = (lang: string | undefined, index: number, type: 'audio' | 'subtitle' = 'audio'): string => {
  if (!lang || lang.toLowerCase() === 'und' || lang.toLowerCase() === 'undefined') {
    return type === 'audio' ? `Audio ${index + 1}` : `Subtitle ${index + 1}`;
  }
  
  const cleanLang = lang.toLowerCase().trim().split('-')[0].split('_')[0];
  if (LANG_MAP[cleanLang]) {
    return LANG_MAP[cleanLang];
  }
  
  // Return the original label with first letter capitalized if not in map
  return lang.charAt(0).toUpperCase() + lang.slice(1);
};
