import type { JsonLevelConfig } from '../config/levelTypes';

export interface TestPlayCallbacks {
  onExitToEditor: (levelJson: JsonLevelConfig) => void;
  onRestartTest: (levelJson: JsonLevelConfig) => void;
}

export class TestPlayController {
  private container: HTMLElement;
  private callbacks: TestPlayCallbacks;
  private currentLevel: JsonLevelConfig | null = null;
  private isActive = false;

  constructor(callbacks: TestPlayCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.container.id = 'test-play-hud';
    this.container.className = 'test-play-bar hidden';
    document.getElementById('game-container')?.appendChild(this.container);

    this.setupListeners();
  }

  public activate(level: JsonLevelConfig): void {
    this.currentLevel = level;
    this.isActive = true;
    this.container.innerHTML = `
      <div class="test-play-badge">
        <span class="test-pulse-dot"></span>
        <span>TESTING: ${level.name || 'Level'}</span>
      </div>
      <div class="test-play-actions">
        <button id="test-restart-btn" class="test-btn test-btn-secondary" title="Restart Level (R)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          <span>Restart (R)</span>
        </button>
        <button id="test-exit-btn" class="test-btn test-btn-primary" title="Back to Editor (Esc)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          <span>Back to Editor (Esc)</span>
        </button>
      </div>
    `;
    this.container.classList.remove('hidden');
  }

  public deactivate(): void {
    this.isActive = false;
    this.container.classList.add('hidden');
  }

  public isTesting(): boolean {
    return this.isActive;
  }

  public getCurrentLevel(): JsonLevelConfig | null {
    return this.currentLevel;
  }

  private setupListeners(): void {
    this.container.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('button');
      if (!target || !this.currentLevel) return;

      if (target.id === 'test-exit-btn') {
        this.deactivate();
        this.callbacks.onExitToEditor(this.currentLevel);
      } else if (target.id === 'test-restart-btn') {
        this.callbacks.onRestartTest(this.currentLevel);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isActive || !this.currentLevel) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.deactivate();
        this.callbacks.onExitToEditor(this.currentLevel);
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.callbacks.onRestartTest(this.currentLevel);
      }
    });
  }
}
