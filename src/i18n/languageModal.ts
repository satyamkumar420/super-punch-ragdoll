import { SUPPORTED_LANGUAGES } from './languages.ts';
import type { LanguageCode } from './types.ts';
import { i18n, t } from './i18n.ts';
import { playButtonClick } from '../audio.ts';
import { youtubePlayables } from '../services/youtubePlayables.ts';
import { updateModalResponsiveScale } from '../core/modalResponsive.ts';

export class LanguageModalController {
  private modalEl: HTMLElement | null = null;
  private gridEl: HTMLElement | null = null;
  private isOpen = false;
  private onSelectCallback?: (code: LanguageCode) => void;

  constructor() {
    this.init();
  }

  private init(): void {
    this.modalEl = document.getElementById('language-modal');
    if (!this.modalEl) return;

    this.gridEl = document.getElementById('language-grid');
    const closeBtn = document.getElementById('lang-modal-close');

    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      playButtonClick();
      this.close();
    });

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        playButtonClick();
        this.close();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        // Do NOT call e.preventDefault() as per YouTube Playables standard
        this.close();
      }
    });

    i18n.onLanguageChange(() => {
      this.updateActiveSelection();
    });

    this.renderLanguages();
  }

  public setOnSelect(cb: (code: LanguageCode) => void): void {
    this.onSelectCallback = cb;
  }

  public renderLanguages(): void {
    if (!this.gridEl) return;

    const current = i18n.getLanguage();
    this.gridEl.innerHTML = '';

    SUPPORTED_LANGUAGES.forEach((lang) => {
      const isSelected = lang.code === current;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `lang-card-btn ${isSelected ? 'selected' : ''}`;
      btn.dataset.langCode = lang.code;
      btn.setAttribute('aria-label', `${lang.nativeName} (${lang.name})`);

      btn.innerHTML = `
        <div class="lang-text-group">
          <span class="lang-native-name">${lang.nativeName}</span>
          ${lang.name !== lang.nativeName ? `<span class="lang-eng-name">${lang.name}</span>` : ''}
        </div>
        <div class="lang-check-icon ${isSelected ? '' : 'hidden'}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleSelect(lang.code);
      });

      this.gridEl?.appendChild(btn);
    });
  }

  private async handleSelect(code: LanguageCode): Promise<void> {
    playButtonClick();
    i18n.setLanguage(code);
    this.updateActiveSelection();
    this.onSelectCallback?.(code);

    try {
      await youtubePlayables.saveData({ preferredLanguage: code });
    } catch (err) {
      console.error('Failed to save preferredLanguage to YouTube Playables:', err);
    }

    // Smooth feedback before closing
    setTimeout(() => {
      this.close();
    }, 180);
  }

  public updateActiveSelection(): void {
    if (!this.gridEl) return;
    const current = i18n.getLanguage();

    const buttons = this.gridEl.querySelectorAll<HTMLButtonElement>('.lang-card-btn');
    buttons.forEach((btn) => {
      const code = btn.dataset.langCode;
      const isSelected = code === current;
      btn.classList.toggle('selected', isSelected);
      const checkIcon = btn.querySelector('.lang-check-icon');
      checkIcon?.classList.toggle('hidden', !isSelected);
    });

    const titleEl = document.getElementById('lang-modal-title');
    if (titleEl) {
      titleEl.textContent = t('select_language');
    }
  }

  public open(): void {
    if (!this.modalEl) return;
    this.isOpen = true;
    this.updateActiveSelection();
    this.modalEl.classList.remove('hidden');
    updateModalResponsiveScale();
  }

  public close(): void {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }
}
