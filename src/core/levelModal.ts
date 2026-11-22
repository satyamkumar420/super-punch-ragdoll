import { playButtonClick, playBoingSound } from '../audio.ts';
import { updateModalResponsiveScale } from './modalResponsive.ts';
import { t, i18n } from '../i18n/i18n.ts';

export interface LevelModalOptions {
  getLevels: () => { id: number; name?: string }[];
  getCurrentLevelId: () => number;
  getHighestUnlockedLevel: () => number;
  onSelectLevel: (levelId: number, levelIdx: number) => void;
}

export class LevelModalController {
  private modalEl: HTMLElement | null = null;
  private gridEl: HTMLElement | null = null;
  private containerEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private progressEl: HTMLElement | null = null;
  private isOpen = false;
  private options: LevelModalOptions;

  constructor(options: LevelModalOptions) {
    this.options = options;
    this.init();
  }

  private init(): void {
    this.modalEl = document.getElementById('level-modal');
    if (!this.modalEl) return;

    this.gridEl = document.getElementById('level-grid');
    this.containerEl = document.getElementById('level-grid-container');
    this.titleEl = document.getElementById('level-modal-title');
    this.progressEl = document.getElementById('level-progress-text');

    const closeBtn = document.getElementById('level-modal-close');
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
        this.close();
      }
    });

    i18n.onLanguageChange(() => {
      this.updateTexts();
    });
  }

  public updateTexts(): void {
    if (this.titleEl) {
      this.titleEl.textContent = t('select_level', {}, 'SELECT LEVEL');
    }
    const levels = this.options.getLevels();
    const highest = Math.min(this.options.getHighestUnlockedLevel(), levels.length);
    if (this.progressEl) {
      this.progressEl.textContent = t(
        'level_progress',
        { unlocked: highest, total: levels.length },
        `UNLOCKED: ${highest}/${levels.length}`
      );
    }
  }

  public renderLevels(): void {
    if (!this.gridEl) return;
    this.gridEl.innerHTML = '';

    const levels = this.options.getLevels();
    const currentId = this.options.getCurrentLevelId();
    const highestUnlocked = this.options.getHighestUnlockedLevel();

    this.updateTexts();

    levels.forEach((lvl, idx) => {
      const isCurrent = lvl.id === currentId;
      const isUnlocked = lvl.id <= highestUnlocked;
      const isCompleted = isUnlocked && lvl.id < highestUnlocked && !isCurrent;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.levelId = String(lvl.id);
      btn.dataset.levelIdx = String(idx);

      let stateClass = 'locked';
      if (isCurrent) {
        stateClass = 'current';
      } else if (isCompleted) {
        stateClass = 'completed';
      } else if (isUnlocked) {
        stateClass = 'unlocked';
      }

      btn.className = `level-card-btn ${stateClass}`;
      btn.setAttribute('aria-label', `Level ${lvl.id} - ${stateClass}`);

      if (isUnlocked) {
        let bottomContent = '';
        if (isCurrent) {
          bottomContent = `
            <div class="level-card-active-indicator">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4"/>
              </svg>
              <span>NOW</span>
            </div>
          `;
        } else if (isCompleted) {
          bottomContent = `
            <div class="level-card-stars" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="9" height="9" fill="#ca8a04"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="#ca8a04"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <svg viewBox="0 0 24 24" width="9" height="9" fill="#ca8a04"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
          `;
        } else {
          bottomContent = `
            <div class="level-card-play-icon">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4"/>
              </svg>
            </div>
          `;
        }

        btn.innerHTML = `
          <span class="level-card-num">${lvl.id}</span>
          ${bottomContent}
        `;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          playButtonClick();
          this.options.onSelectLevel(lvl.id, idx);
          setTimeout(() => {
            this.close();
          }, 120);
        });
      } else {
        // Locked
        btn.innerHTML = `
          <svg class="level-card-lock-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span class="level-card-locked-num">${lvl.id}</span>
        `;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          playBoingSound();
          btn.classList.remove('shake');
          // Trigger reflow for re-animation
          void btn.offsetWidth;
          btn.classList.add('shake');
          setTimeout(() => btn.classList.remove('shake'), 400);
        });
      }

      this.gridEl?.appendChild(btn);
    });
  }

  public open(): void {
    if (!this.modalEl) return;
    this.isOpen = true;
    this.renderLevels();
    this.modalEl.classList.remove('hidden');
    updateModalResponsiveScale();

    // Auto-scroll to active level so player immediately sees where they are
    setTimeout(() => {
      const currentCard = this.gridEl?.querySelector('.level-card-btn.current') as HTMLElement | null;
      if (currentCard && this.containerEl) {
        const containerTop = this.containerEl.getBoundingClientRect().top;
        const cardTop = currentCard.getBoundingClientRect().top;
        const relativeOffset =
          cardTop - containerTop - this.containerEl.clientHeight / 2 + currentCard.clientHeight / 2;
        this.containerEl.scrollTo({
          top: this.containerEl.scrollTop + relativeOffset,
          behavior: 'smooth',
        });
      }
    }, 60);
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
