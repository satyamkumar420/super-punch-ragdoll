import type { JsonLevelConfig } from '../../config/levelTypes';
import { getSvgIcon } from './icons';

export class JsonModal {
  private container: HTMLElement;
  private onImportCallback: (level: JsonLevelConfig) => void;

  constructor(onImport: (level: JsonLevelConfig) => void) {
    this.onImportCallback = onImport;
    this.container = document.createElement('div');
    this.container.className = 'modal-overlay hidden';
    document.body.appendChild(this.container);
  }

  public showExport(level: JsonLevelConfig): void {
    const jsonStr = JSON.stringify(level, null, 2);
    this.container.innerHTML = `
      <div class="modal-content">
        <div class="panel-header" style="background:transparent; padding:0;">
          <span style="display:inline-flex; align-items:center; gap:6px;">
            ${getSvgIcon('download', 14)} EXPORT LEVEL JSON
          </span>
          <button id="modal-close-btn" class="editor-btn" style="padding:4px 8px;">Close</button>
        </div>
        <textarea class="json-textarea" readonly>${jsonStr}</textarea>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button id="copy-json-btn" class="editor-btn editor-btn-primary">
            ${getSvgIcon('copy', 14)} <span>Copy to Clipboard</span>
          </button>
          <button id="download-json-btn" class="editor-btn">
            ${getSvgIcon('download', 14)} <span>Download File</span>
          </button>
        </div>
      </div>
    `;
    this.container.classList.remove('hidden');

    this.container.querySelector('#modal-close-btn')?.addEventListener('click', () => this.hide());

    this.container.querySelector('#copy-json-btn')?.addEventListener('click', () => {
      void navigator.clipboard.writeText(jsonStr);
      const btn = this.container.querySelector('#copy-json-btn') as HTMLElement;
      if (btn) btn.innerHTML = `${getSvgIcon('check', 14)} <span>Copied!</span>`;
      setTimeout(() => {
        if (btn) btn.innerHTML = `${getSvgIcon('copy', 14)} <span>Copy to Clipboard</span>`;
      }, 1500);
    });

    this.container.querySelector('#download-json-btn')?.addEventListener('click', () => {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${level.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'level'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  public showImport(): void {
    this.container.innerHTML = `
      <div class="modal-content">
        <div class="panel-header" style="background:transparent; padding:0;">
          <span style="display:inline-flex; align-items:center; gap:6px;">
            ${getSvgIcon('upload', 14)} IMPORT LEVEL JSON
          </span>
          <button id="modal-close-btn" class="editor-btn" style="padding:4px 8px;">Close</button>
        </div>
        <p style="font-size:12px; color:#94a3b8; margin:0;">Paste valid JsonLevelConfig below:</p>
        <textarea id="import-json-area" class="json-textarea" placeholder="Paste JSON here..."></textarea>
        <div id="import-err-msg" style="color:#f87171; font-size:11px; display:none;"></div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button id="modal-cancel-btn" class="editor-btn">Cancel</button>
          <button id="submit-import-btn" class="editor-btn editor-btn-primary">
            ${getSvgIcon('check', 14)} <span>Load Level</span>
          </button>
        </div>
      </div>
    `;
    this.container.classList.remove('hidden');

    this.container.querySelector('#modal-close-btn')?.addEventListener('click', () => this.hide());
    this.container.querySelector('#modal-cancel-btn')?.addEventListener('click', () => this.hide());

    this.container.querySelector('#submit-import-btn')?.addEventListener('click', () => {
      const area = this.container.querySelector('#import-json-area') as HTMLTextAreaElement;
      const errEl = this.container.querySelector('#import-err-msg') as HTMLElement;
      try {
        const parsed = JSON.parse(area.value) as JsonLevelConfig;
        if (!parsed || !Array.isArray(parsed.targets) || !parsed.skyColor) {
          throw new Error('Invalid level structure: missing targets or skyColor');
        }
        this.onImportCallback(parsed);
        this.hide();
      } catch (err) {
        if (errEl) {
          errEl.textContent = `Error: ${(err as Error).message}`;
          errEl.style.display = 'block';
        }
      }
    });
  }

  public hide(): void {
    this.container.classList.add('hidden');
    this.container.innerHTML = '';
  }

  public dispose(): void {
    this.container.remove();
  }
}
