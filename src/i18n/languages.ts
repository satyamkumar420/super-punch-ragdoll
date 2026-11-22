import type { LanguageCode, LanguageMeta } from './types.ts';

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function getUrlLanguageParam(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch =
      searchParams.get('lang') ||
      searchParams.get('locale') ||
      searchParams.get('hl') ||
      searchParams.get('language');
    if (fromSearch && fromSearch.trim().length > 0) {
      return fromSearch.trim();
    }

    if (window.location.hash && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?'));
      const hashParams = new URLSearchParams(hashQuery);
      const fromHash =
        hashParams.get('lang') ||
        hashParams.get('locale') ||
        hashParams.get('hl') ||
        hashParams.get('language');
      if (fromHash && fromHash.trim().length > 0) {
        return fromHash.trim();
      }
    }
  } catch (err) {
    console.warn('Failed to parse language from URL parameters:', err);
  }
  return null;
}

export function matchBcp47ToLanguageCode(rawLocale?: string | null): LanguageCode {
  if (!rawLocale || typeof rawLocale !== 'string') return DEFAULT_LANGUAGE;

  const normalized = rawLocale.trim().toLowerCase().replace('_', '-');

  // Exact Chinese variants
  if (
    normalized === 'zh-hant' ||
    normalized === 'zh-tw' ||
    normalized === 'zh-hk' ||
    normalized === 'zh-mo'
  ) {
    return 'zh-Hant';
  }
  if (
    normalized === 'zh-hans' ||
    normalized === 'zh-cn' ||
    normalized === 'zh-sg' ||
    normalized.startsWith('zh')
  ) {
    return 'zh-Hans';
  }

  // 2-letter prefix match or exact match
  const primary = normalized.split('-')[0];
  const matched = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === normalized || lang.code.toLowerCase() === primary
  );

  return matched ? matched.code : DEFAULT_LANGUAGE;
}
