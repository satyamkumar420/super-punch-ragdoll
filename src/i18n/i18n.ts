import type { LanguageCode, LanguageMeta, TranslationKeys } from './types.ts';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getUrlLanguageParam,
  matchBcp47ToLanguageCode,
} from './languages.ts';
import { translations, en } from './translations/index.ts';
import { safeStorage } from '../services/storage.ts';

const STORAGE_LANG_KEY = 'preferred_language';

class I18nManager {
  private currentLanguage: LanguageCode = DEFAULT_LANGUAGE;
  private listeners: Set<(code: LanguageCode) => void> = new Set();

  constructor() {
    const urlLang = getUrlLanguageParam();
    const stored = safeStorage.getItem(STORAGE_LANG_KEY);
    const initial = urlLang || stored;
    if (initial) {
      this.currentLanguage = matchBcp47ToLanguageCode(initial);
    }
    if (typeof document !== 'undefined') {
      const meta = this.getCurrentLanguageMeta();
      document.documentElement.lang = this.currentLanguage;
      document.documentElement.dir = meta.dir === 'rtl' ? 'rtl' : 'ltr';
      this.updateDomTranslations();
    }
  }

  public init(savedCloudLang?: string | null, platformLang?: string | null): void {
    // 1. YouTube Playables Cloud Save preference (Top Priority)
    if (savedCloudLang) {
      this.setLanguage(matchBcp47ToLanguageCode(savedCloudLang));
      return;
    }

    // 2. Cached local preference for fast frame-0 persistence
    const localStored = safeStorage.getItem(STORAGE_LANG_KEY);
    if (localStored) {
      this.setLanguage(matchBcp47ToLanguageCode(localStored));
      return;
    }

    // 3. YouTube Platform Language (ytgame.system.getLanguage())
    if (platformLang) {
      this.setLanguage(matchBcp47ToLanguageCode(platformLang));
      return;
    }

    // 4. URL Parameter
    const urlLang = getUrlLanguageParam();
    if (urlLang) {
      this.setLanguage(matchBcp47ToLanguageCode(urlLang));
      return;
    }

    // 5. Browser fallback
    if (typeof navigator !== 'undefined' && navigator.language) {
      this.setLanguage(matchBcp47ToLanguageCode(navigator.language));
      return;
    }

    this.setLanguage(DEFAULT_LANGUAGE);
  }

  public getLanguage(): LanguageCode {
    return this.currentLanguage;
  }

  public getCurrentLanguageMeta(): LanguageMeta {
    return (
      SUPPORTED_LANGUAGES.find((l) => l.code === this.currentLanguage) ||
      SUPPORTED_LANGUAGES[0]
    );
  }

  public setLanguage(code: LanguageCode): void {
    const validCode = matchBcp47ToLanguageCode(code);
    this.currentLanguage = validCode;

    try {
      safeStorage.setItem(STORAGE_LANG_KEY, validCode);
    } catch {
      // safe fallback
    }

    const meta = this.getCurrentLanguageMeta();
    if (typeof document !== 'undefined') {
      document.documentElement.lang = validCode;
      document.documentElement.dir = meta.dir === 'rtl' ? 'rtl' : 'ltr';
    }

    this.updateDomTranslations();

    this.listeners.forEach((cb) => {
      try {
        cb(validCode);
      } catch (err) {
        console.error('Error in language change listener:', err);
      }
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('languageChanged', { detail: { lang: validCode } })
      );
    }
  }

  public onLanguageChange(callback: (code: LanguageCode) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public t(
    key: keyof TranslationKeys | string,
    variables?: Record<string, string | number>,
    fallback?: string
  ): string {
    const dict = (translations[this.currentLanguage] as unknown) as Record<string, string> | undefined;
    const fallbackDict = (en as unknown) as Record<string, string>;

    let text: string | undefined = dict?.[key];
    if (typeof text !== 'string') {
      text = fallbackDict[key];
    }
    if (typeof text !== 'string') {
      text = fallback ?? key;
    }

    if (variables) {
      let replaced = text;
      for (const [varKey, varVal] of Object.entries(variables)) {
        replaced = replaced.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(varVal));
      }
      return replaced;
    }

    return text;
  }

  public updateDomTranslations(): void {
    if (typeof document === 'undefined') return;

    const elements = document.querySelectorAll<HTMLElement>('[data-i18n]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;

      const translation = this.t(key);
      if (translation) {
        el.textContent = translation;
      }
    });

    const attrElements = document.querySelectorAll<HTMLElement>('[data-i18n-title]');
    attrElements.forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        const trans = this.t(key);
        el.setAttribute('title', trans);
        el.setAttribute('aria-label', trans);
      }
    });
  }
}

export const i18n = new I18nManager();
export const t = (
  key: keyof TranslationKeys | string,
  variables?: Record<string, string | number>,
  fallback?: string
) => i18n.t(key, variables, fallback);
