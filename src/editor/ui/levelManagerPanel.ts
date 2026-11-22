import type { EditorStateManager } from '../editorState';
import type { JsonLevelConfig } from '../../config/levelTypes';
import { DEFAULT_JSON_LEVELS } from '../../config/levels';
import { getSvgIcon } from './icons';

export interface LevelManagerCallbacks {
  onSelectLevel: (level: JsonLevelConfig) => void;
  onPlayLevel: (level: JsonLevelConfig) => void;
}

export class LevelManagerPanel {
  private element: HTMLElement;
  private state: EditorStateManager;
  private callbacks: LevelManagerCallbacks;
  private isVisible = true;
  private lastScrolledLevelId: number | null = null;

  constructor(state: EditorStateManager, callbacks: LevelManagerCallbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.element = document.createElement('aside');
    this.element.className = 'editor-panel left-panel';
    this.render(true);
    this.setupListeners();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    this.element.classList.toggle('hidden', !this.isVisible);
    if (this.isVisible) {
      this.scrollToActive(true);
    }
    return this.isVisible;
  }

  public scrollToActive(smooth = true): void {
    setTimeout(() => {
      const activeCard = this.element.querySelector('.level-card.active') as HTMLElement | null;
      if (activeCard) {
        activeCard.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'center',
          inline: 'nearest',
        });
      }
    }, 50);
  }

  private render(autoScroll = true): void {
    const currentLevel = this.state.getLevel();
    const allLevels = this.state.getAllLevels();

    let levelsListHtml = '';
    allLevels.forEach((lvl) => {
      const isSelected = lvl.id === currentLevel.id;
      const isDefault = DEFAULT_JSON_LEVELS.some((def) => def.id === lvl.id);
      const badgeClass = isDefault ? 'badge-default' : 'badge-custom';
      const badgeText = isDefault ? `Level ${lvl.id}` : 'Custom';

      levelsListHtml += `
        <div class="level-card ${isSelected ? 'active' : ''}" data-id="${lvl.id}">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="card-title">${lvl.name}</span>
              <span class="badge-tag ${badgeClass}">${badgeText}</span>
            </div>
            <div class="card-meta" style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-flex; align-items:center; gap:3px;">${getSvgIcon('target', 11)} ${lvl.targets?.length || 0} Targets</span>
              <span>•</span>
              <span style="display:inline-flex; align-items:center; gap:3px;">${getSvgIcon('box', 11)} ${lvl.props?.length || 0} Props</span>
            </div>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="editor-btn btn-play-card" data-id="${lvl.id}" title="Playtest Level" style="padding:4px 8px; font-size:11px;">
              ${getSvgIcon('play', 11)}
            </button>
            ${!isDefault ? `<button class="editor-btn editor-btn-danger btn-del-card" data-id="${lvl.id}" title="Delete Level" style="padding:4px 8px; font-size:11px;">${getSvgIcon('x', 11)}</button>` : ''}
          </div>
        </div>
      `;
    });

    this.element.innerHTML = `
      <div class="panel-header">
        <span style="display:inline-flex; align-items:center; gap:6px;">${getSvgIcon('layers', 14)} LEVELS (${allLevels.length})</span>
        <div style="display:flex; gap:4px;">
          <button id="lm-sync-game-btn" class="editor-btn" style="padding:4px 8px; font-size:11px;" title="Sync All Levels with Game Files">${getSvgIcon('rotate', 11)} <span>Sync</span></button>
          <button id="lm-new-level-btn" class="editor-btn editor-btn-primary" style="padding:4px 8px; font-size:11px;">+ New</button>
        </div>
      </div>

      <div class="panel-content">
        <!-- Pinned Active Card -->
        <div style="background:rgba(59, 130, 246, 0.15); border:1px solid #3b82f6; border-radius:8px; padding:10px 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:800; color:#60a5fa; letter-spacing:0.5px;">ACTIVE LEVEL</span>
            <span class="badge-tag badge-default">EDITING</span>
          </div>
          <div style="font-size:14px; font-weight:800; color:#fff; margin-top:4px;">${currentLevel.name}</div>
          ${currentLevel.subtitle ? `<div style="font-size:12px; color:#cbd5e1; margin-top:2px;">${currentLevel.subtitle}</div>` : ''}
          <div style="display:flex; gap:8px; margin-top:10px;">
            <button id="lm-save-active-btn" class="editor-btn editor-btn-primary" style="flex:1;">
              ${getSvgIcon('save', 12)} <span>Save</span>
            </button>
            <button id="lm-duplicate-active-btn" class="editor-btn" style="flex:1;">
              ${getSvgIcon('copy', 12)} <span>Clone</span>
            </button>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
          <span style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">
            All Available Levels
          </span>
          <button id="lm-scroll-active-btn" class="editor-btn" style="padding:2px 6px; font-size:10px;" title="Jump to Active Level">
            ${getSvgIcon('target', 10)} <span>Jump to Active</span>
          </button>
        </div>
        <div class="level-list">
          ${levelsListHtml}
        </div>
      </div>
    `;

    if (autoScroll || this.lastScrolledLevelId !== currentLevel.id) {
      this.lastScrolledLevelId = currentLevel.id;
      this.scrollToActive(false);
    }
  }

  private setupListeners(): void {
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      if (target.closest('#lm-sync-game-btn')) {
        this.state.resetDefaultLevelsToSource();
        const all = this.state.getAllLevels();
        const current = this.state.getLevel();
        const matched = all.find((l) => l.id === current.id) || all[0];
        this.callbacks.onSelectLevel(matched);
        this.render();
        const syncBtn = this.element.querySelector('#lm-sync-game-btn') as HTMLElement | null;
        if (syncBtn) {
          syncBtn.innerHTML = `${getSvgIcon('check', 11)} <span>Synced!</span>`;
          setTimeout(() => {
            if (syncBtn) syncBtn.innerHTML = `${getSvgIcon('rotate', 11)} <span>Sync</span>`;
          }, 1500);
        }
        return;
      }

      if (target.closest('#lm-new-level-btn')) {
        const newLvl = this.state.createNewLevelTemplate();
        this.state.setSelection(null);
        this.callbacks.onSelectLevel(newLvl);
        this.render();
        return;
      }

      if (target.closest('#lm-save-active-btn')) {
        this.state.saveCurrentLevelToStorage();
        const btn = this.element.querySelector('#lm-save-active-btn') as HTMLElement;
        if (btn) btn.innerHTML = `${getSvgIcon('check', 12)} <span>Saved!</span>`;
        setTimeout(() => { if (btn) btn.innerHTML = `${getSvgIcon('save', 12)} <span>Save</span>`; }, 1400);
        this.render();
        return;
      }

      if (target.closest('#lm-duplicate-active-btn')) {
        const cur = this.state.getLevel();
        const clone: JsonLevelConfig = {
          ...JSON.parse(JSON.stringify(cur)),
          id: Date.now(),
          name: `${cur.name} (Copy)`,
        };
        this.callbacks.onSelectLevel(clone);
        this.render();
        return;
      }

      const playBtn = target.closest('.btn-play-card') as HTMLElement;
      if (playBtn) {
        e.stopPropagation();
        const id = Number(playBtn.dataset.id);
        const lvl = this.state.getAllLevels().find((l) => l.id === id);
        if (lvl) this.callbacks.onPlayLevel(lvl);
        return;
      }

      const delBtn = target.closest('.btn-del-card') as HTMLElement;
      if (delBtn) {
        e.stopPropagation();
        const id = Number(delBtn.dataset.id);
        if (confirm('Are you sure you want to delete this custom level?')) {
          this.state.deleteLevelFromStorage(id);
          if (this.state.getLevel().id === id) {
            this.callbacks.onSelectLevel(this.state.getAllLevels()[0]);
          } else {
            this.render();
          }
        }
        return;
      }

      if (target.closest('#lm-scroll-active-btn')) {
        this.scrollToActive(true);
        return;
      }

      const card = target.closest('.level-card') as HTMLElement;
      if (card) {
        const id = Number(card.dataset.id);
        const lvl = this.state.getAllLevels().find((l) => l.id === id);
        if (lvl) {
          this.state.setSelection(null);
          this.callbacks.onSelectLevel(lvl);
          this.lastScrolledLevelId = lvl.id;
          this.render(true);
          this.scrollToActive(true);
        }
      }
    });

    this.state.subscribe((event) => {
      if (event.type === 'level_updated') {
        this.render();
      }
    });
  }

  public update(): void {
    this.render();
  }
}
