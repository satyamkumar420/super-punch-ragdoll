import type { EditorStateManager } from '../editorState';
import { getSvgIcon } from './icons';

export interface ToolbarCallbacks {
  onBackToGame: () => void;
  onPlayTest: () => void;
  onSave?: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleGroundLock?: () => boolean;
}

export class EditorToolbar {
  private element: HTMLElement;
  private state: EditorStateManager;
  private callbacks: ToolbarCallbacks;
  private isGroundLocked = false;

  constructor(state: EditorStateManager, callbacks: ToolbarCallbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.element = document.createElement('header');
    this.element.className = 'editor-toolbar';
    this.render();
    this.setupListeners();
    this.setupKeyboardShortcuts();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private render(): void {
    const mode = this.state.getGizmoMode();
    const canUndo = this.state.canUndo();
    const canRedo = this.state.canRedo();
    const isSnap = this.state.isSnapEnabled();

    this.element.innerHTML = `
      <div class="tb-group">
        <button id="tb-back-btn" class="editor-btn" title="Return to Play Mode">
          ${getSvgIcon('back', 14)} <span>Exit</span>
        </button>
        <button id="tb-left-toggle-btn" class="editor-btn" title="Toggle Levels Panel">
          ${getSvgIcon('layers', 14)} <span>Levels</span>
        </button>
      </div>

      <div class="tb-group">
        <button id="tb-mode-trans" class="editor-btn ${mode === 'translate' ? 'active' : ''}" title="Translate / Move (W)">
          ${getSvgIcon('move', 14)} <span>Move (W)</span>
        </button>
        <button id="tb-mode-rot" class="editor-btn ${mode === 'rotate' ? 'active' : ''}" title="Rotate (E)">
          ${getSvgIcon('rotate', 14)} <span>Rotate (E)</span>
        </button>
        <button id="tb-mode-scale" class="editor-btn ${mode === 'scale' ? 'active' : ''}" title="Scale (R)">
          ${getSvgIcon('scale', 14)} <span>Scale (R)</span>
        </button>
        <button id="tb-snap-btn" class="editor-btn ${isSnap ? 'active' : ''}" title="Toggle Grid Snapping">
          ${getSvgIcon('snap', 14)} <span>Snap (${this.state.getGridSize()}m)</span>
        </button>
        <button id="tb-lock-y-btn" class="editor-btn ${this.isGroundLocked ? 'active' : ''}" title="3D Lock Y / Ground Plane Only">
          ${getSvgIcon(this.isGroundLocked ? 'lock' : 'unlock', 14)} <span>Floor Y</span>
        </button>
      </div>

      <div class="tb-group">
        <button id="tb-undo-btn" class="editor-btn" ${!canUndo ? 'disabled' : ''} title="Undo (Ctrl+Z)">
          ${getSvgIcon('undo', 14)} <span>Undo</span>
        </button>
        <button id="tb-redo-btn" class="editor-btn" ${!canRedo ? 'disabled' : ''} title="Redo (Ctrl+Y)">
          ${getSvgIcon('redo', 14)} <span>Redo</span>
        </button>
        <button id="tb-dup-btn" class="editor-btn" title="Duplicate Selected (Ctrl+D)">
          ${getSvgIcon('copy', 14)} <span>Clone</span>
        </button>
        <button id="tb-del-btn" class="editor-btn editor-btn-danger" title="Delete Selected (Delete)">
          ${getSvgIcon('trash', 14)} <span>Delete</span>
        </button>
      </div>

      <div class="tb-group">
        <button id="tb-right-toggle-btn" class="editor-btn" title="Toggle Properties Panel">
          ${getSvgIcon('inspector', 14)} <span>Inspector</span>
        </button>
        <button id="tb-save-btn" class="editor-btn editor-btn-success" title="Save Level Changes (Ctrl+S)">
          ${getSvgIcon('save', 14)} <span>Save</span>
        </button>
        <button id="tb-play-btn" class="editor-btn editor-btn-primary" title="Playtest Current Level (P)">
          ${getSvgIcon('play', 14)} <span>Test (P)</span>
        </button>
      </div>
    `;
  }

  private setupListeners(): void {
    this.element.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('button');
      if (!target) return;

      switch (target.id) {
        case 'tb-back-btn':
          this.callbacks.onBackToGame();
          break;
        case 'tb-left-toggle-btn':
          this.callbacks.onToggleLeftPanel();
          break;
        case 'tb-right-toggle-btn':
          this.callbacks.onToggleRightPanel();
          break;
        case 'tb-mode-trans':
          this.state.setGizmoMode('translate');
          this.render();
          break;
        case 'tb-mode-rot':
          this.state.setGizmoMode('rotate');
          this.render();
          break;
        case 'tb-mode-scale':
          this.state.setGizmoMode('scale');
          this.render();
          break;
        case 'tb-snap-btn':
          this.state.toggleSnap();
          this.render();
          break;
        case 'tb-lock-y-btn':
          if (this.callbacks.onToggleGroundLock) {
            this.isGroundLocked = this.callbacks.onToggleGroundLock();
            this.render();
          }
          break;
        case 'tb-undo-btn':
          this.state.undo();
          break;
        case 'tb-redo-btn':
          this.state.redo();
          break;
        case 'tb-dup-btn':
          this.callbacks.onDuplicate();
          break;
        case 'tb-del-btn':
          this.callbacks.onDelete();
          break;
        case 'tb-save-btn':
          if (this.callbacks.onSave) {
            this.callbacks.onSave();
            const btn = this.element.querySelector('#tb-save-btn') as HTMLElement;
            if (btn) {
              btn.innerHTML = `${getSvgIcon('check', 14)} <span>Saved!</span>`;
              setTimeout(() => {
                if (btn) btn.innerHTML = `${getSvgIcon('save', 14)} <span>Save</span>`;
              }, 1200);
            }
          }
          break;
        case 'tb-play-btn':
          this.callbacks.onPlayTest();
          break;
      }
    });

    this.state.subscribe((event) => {
      if (
        event.type === 'history_changed' ||
        event.type === 'gizmo_mode_changed' ||
        event.type === 'level_updated'
      ) {
        this.render();
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const btn = this.element.querySelector('#tb-save-btn') as HTMLElement;
        btn?.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.state.redo();
        else this.state.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.state.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.callbacks.onDuplicate();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        this.callbacks.onDelete();
      } else if (e.key.toLowerCase() === 'w') {
        this.state.setGizmoMode('translate');
        this.render();
      } else if (e.key.toLowerCase() === 'e') {
        this.state.setGizmoMode('rotate');
        this.render();
      } else if (e.key.toLowerCase() === 'r') {
        this.state.setGizmoMode('scale');
        this.render();
      } else if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.callbacks.onPlayTest();
      }
    });
  }

  public update(): void {
    this.render();
  }
}
