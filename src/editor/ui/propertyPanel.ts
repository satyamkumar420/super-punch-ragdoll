import type { EditorStateManager } from '../editorState';
import { ASSET_CATALOG, CHARACTER_ANIMATIONS } from '../assetCatalog';
import type { AssetDef, SelectedObjectRef } from '../types';
import { getSvgIcon } from './icons';
import { getAssetPreview } from './assetPreviews';
import {
  renderEmptyInspector,
  renderPropInspector,
  renderTargetInspector,
  renderGunInspector,
  renderEnvInspector,
  renderJsonInspector,
  hexToRgba,
  hexToRgb,
} from './inspectorSections';
import type { Vector3 } from '@babylonjs/core';
import { getDefaultWeaponPosition } from '../../character';

export interface PropertyPanelCallbacks {
  onSpawnAsset: (asset: AssetDef) => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSyncCamera?: () => void;
  onCameraZoomChange?: (radius: number) => void;
}

type TabType = 'palette' | 'inspector' | 'env' | 'json';

function getInputValueNum(el: HTMLElement, id: string, fallback: number): number {
  const v = parseFloat((el.querySelector(id) as HTMLInputElement)?.value);
  return isNaN(v) ? fallback : v;
}

function renderAssetCards(assets: AssetDef[]): string {
  return assets.map((a) => `
    <div class="asset-card" data-asset-id="${a.id}" title="${a.name} - ${a.description || a.category}">
      <div class="asset-preview-box">${getAssetPreview(a.id)}</div>
      <div class="asset-title">${a.name}</div>
    </div>
  `).join('');
}

export class PropertyPanel {
  private element: HTMLElement;
  private state: EditorStateManager;
  private callbacks: PropertyPanelCallbacks;
  private activeTab: TabType = 'palette';
  private selectedCategory = 'all';
  private assetSearchQuery = '';
  private animSearchQuery = '';
  private animModes: Map<string, 'single' | 'multi'> = new Map();
  private isInternalUpdating = false;
  private isVisible = true;

  private getAnimMode(listId: string, defaultSelectedCount: number): 'single' | 'multi' {
    if (this.animModes.has(listId)) {
      return this.animModes.get(listId)!;
    }
    return defaultSelectedCount > 1 ? 'multi' : 'single';
  }

  constructor(state: EditorStateManager, callbacks: PropertyPanelCallbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.element = document.createElement('aside');
    this.element.className = 'editor-panel right-panel';
    this.render();
    this.setupListeners();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    this.element.classList.toggle('hidden', !this.isVisible);
    return this.isVisible;
  }

  public switchToTab(tab: TabType): void {
    this.activeTab = tab;
    this.render();
  }

  private render(): void {
    const sel = this.state.getSelection();

    this.element.innerHTML = `
      <div class="panel-tabs">
        <button class="tab-btn ${this.activeTab === 'palette' ? 'active' : ''}" data-tab="palette">
          <span style="display:inline-flex; align-items:center; gap:5px;">${getSvgIcon('palette', 13)} Assets</span>
        </button>
        <button class="tab-btn ${this.activeTab === 'inspector' ? 'active' : ''}" data-tab="inspector">
          <span style="display:inline-flex; align-items:center; gap:5px;">${getSvgIcon('inspector', 13)} Inspector</span>
        </button>
        <button class="tab-btn ${this.activeTab === 'env' ? 'active' : ''}" data-tab="env">
          <span style="display:inline-flex; align-items:center; gap:5px;">${getSvgIcon('scene', 13)} Scene</span>
        </button>
        <button class="tab-btn ${this.activeTab === 'json' ? 'active' : ''}" data-tab="json">
          <span style="display:inline-flex; align-items:center; gap:5px;">${getSvgIcon('json', 13)} JSON</span>
        </button>
      </div>
      <div class="panel-content">
        ${this.renderActiveTabContent(sel)}
      </div>
    `;
  }

  private renderActiveTabContent(sel: SelectedObjectRef | null): string {
    switch (this.activeTab) {
      case 'palette': return this.renderPaletteTab();
      case 'inspector': return this.renderInspectorTab(sel);
      case 'env': return this.renderEnvTab();
      case 'json': return this.renderJsonTab();
    }
  }

  private getFilteredAssets(): AssetDef[] {
    const q = this.assetSearchQuery.trim().toLowerCase();
    return ASSET_CATALOG.filter((a) => {
      const matchCat = this.selectedCategory === 'all' || a.category === this.selectedCategory;
      const matchQuery = !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || (a.modelPath && a.modelPath.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }

  private renderPaletteTab(): string {
    return `
      <div class="palette-search-wrapper" style="margin-bottom: 8px;">
        <input type="text" class="asset-search-box input-box" placeholder="Search 70+ assets (axe, house, tree...)" value="${this.assetSearchQuery}" style="width:100%; font-size:11px; padding:6px 10px; border-radius:6px; background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.15); color:#f8fafc; outline:none;" />
      </div>
      <div class="filter-pills">
        <button class="pill-btn ${this.selectedCategory === 'all' ? 'active' : ''}" data-cat="all">All (${ASSET_CATALOG.length})</button>
        <button class="pill-btn ${this.selectedCategory === 'nature' ? 'active' : ''}" data-cat="nature">Nature</button>
        <button class="pill-btn ${this.selectedCategory === 'room' ? 'active' : ''}" data-cat="room">Room</button>
        <button class="pill-btn ${this.selectedCategory === 'entity' ? 'active' : ''}" data-cat="entity">Entities</button>
        <button class="pill-btn ${this.selectedCategory === 'city' ? 'active' : ''}" data-cat="city">City</button>
        <button class="pill-btn ${this.selectedCategory === 'rocks' ? 'active' : ''}" data-cat="rocks">Rocks</button>
        <button class="pill-btn ${this.selectedCategory === 'workshop' ? 'active' : ''}" data-cat="workshop">Workshop</button>
      </div>
      <div class="asset-grid">
        ${renderAssetCards(this.getFilteredAssets())}
      </div>
    `;
  }

  private renderInspectorTab(sel: SelectedObjectRef | null): string {
    if (!sel) return renderEmptyInspector();
    const lvl = this.state.getLevel();

    if (sel.type === 'prop' && lvl.props && lvl.props[sel.index]) {
      return renderPropInspector(lvl.props[sel.index]);
    }
    if (sel.type === 'target' && lvl.targets[sel.index]) {
      const t = lvl.targets[sel.index];
      const count = (t.animationNames && t.animationNames.length > 0) ? t.animationNames.length : 1;
      const mode = this.getAnimMode('target-anim-list', count);
      return renderTargetInspector(t, this.animSearchQuery, mode);
    }
    if (sel.type === 'gun') {
      return renderGunInspector(
        lvl.gunSpawnPos || [-2.2, 0.085, 0],
        lvl.ammo || 5,
        this.state.isSelectionLocked(),
        lvl.gunRotation,
        lvl.gunScale
      );
    }
    return '';
  }

  private renderEnvTab(): string {
    return renderEnvInspector(this.state.getLevel());
  }

  private renderJsonTab(): string {
    return renderJsonInspector();
  }

  public updateTransformInputs(pos: Vector3, rot: Vector3, scale: Vector3): void {
    const sel = this.state.getSelection();
    if (!sel) return;

    const setVal = (id: string, val: string) => {
      const el = this.element.querySelector(id) as HTMLInputElement;
      if (el && document.activeElement !== el) el.value = val;
    };

    if (sel.type === 'prop') {
      setVal('#prop-pos-x', pos.x.toFixed(2));
      setVal('#prop-pos-y', pos.y.toFixed(2));
      setVal('#prop-pos-z', pos.z.toFixed(2));
      setVal('#prop-rot-x', Math.round((rot.x * 180) / Math.PI).toString());
      setVal('#prop-rot-y', Math.round((rot.y * 180) / Math.PI).toString());
      setVal('#prop-rot-z', Math.round((rot.z * 180) / Math.PI).toString());
      setVal('#prop-scale', scale.x.toFixed(2));
    } else if (sel.type === 'target') {
      setVal('#target-pos-x', pos.x.toFixed(2));
      setVal('#target-pos-y', pos.y.toFixed(2));
      setVal('#target-pos-z', pos.z.toFixed(2));
      setVal('#target-rot-y', Math.round((rot.y * 180) / Math.PI).toString());
      setVal('#target-scale', scale.x.toFixed(2));

      const distInput = this.element.querySelector('#target-patrol-distance') as HTMLInputElement | null;
      const walkDist = distInput ? parseFloat(distInput.value) || 4.0 : 4.0;
      const half = walkDist / 2;
      const minX = Math.round((pos.x - half) * 100) / 100;
      const maxX = Math.round((pos.x + half) * 100) / 100;
      const rangePreview = this.element.querySelector('#target-patrol-range-preview');
      if (rangePreview) {
        rangePreview.textContent = `Range: [${minX}, ${maxX}]`;
      }
    } else if (sel.type === 'gun') {
      setVal('#gun-pos-x', pos.x.toFixed(2));
      setVal('#gun-pos-y', pos.y.toFixed(2));
      setVal('#gun-pos-z', pos.z.toFixed(2));
    }
  }

  private setupListeners(): void {
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      const tabBtn = target.closest('.tab-btn') as HTMLElement;
      if (tabBtn) {
        this.activeTab = (tabBtn.dataset.tab as TabType) || 'palette';
        if (this.activeTab === 'env' || this.activeTab === 'json') {
          this.state.setSelection(null);
        }
        this.render();
        return;
      }

      const pillBtn = target.closest('.pill-btn') as HTMLElement;
      if (pillBtn) {
        this.selectedCategory = pillBtn.dataset.cat || 'all';
        this.render();
        return;
      }

      const assetCard = target.closest('.asset-card') as HTMLElement;
      if (assetCard) {
        const assetId = assetCard.dataset.assetId;
        const asset = ASSET_CATALOG.find((a) => a.id === assetId);
        if (asset) this.callbacks.onSpawnAsset(asset);
        return;
      }

      if (target.closest('#insp-lock-btn')) {
        this.state.toggleSelectionLock();
        return;
      }

      // Mode toggle buttons (Single vs Multi mode)
      const modeBtn = target.closest<HTMLElement>('.anim-mode-btn');
      if (modeBtn && !modeBtn.hasAttribute('disabled')) {
        e.preventDefault();
        e.stopPropagation();
        const listId = modeBtn.dataset.listId || 'target-anim-list';
        const newMode = (modeBtn.dataset.setMode as 'single' | 'multi') || 'single';
        this.setAnimationMode(listId, newMode);
        return;
      }

      // Pill remove cross (×)
      const pillRemove = target.closest<HTMLElement>('.anim-pill-remove');
      if (pillRemove) {
        e.preventDefault();
        e.stopPropagation();
        const animId = pillRemove.dataset.animId;
        const listId = pillRemove.dataset.listId || 'target-anim-list';
        if (animId) {
          this.removeAnimationFromSequence(listId, animId);
        }
        return;
      }

      const animItem = target.closest<HTMLElement>('.anim-checkbox-item');
      if (animItem) {
        e.preventDefault();
        e.stopPropagation();
        const checkbox = animItem.querySelector<HTMLInputElement>('input[type="checkbox"]');
        if (!checkbox || checkbox.disabled) return;
        const clickedOnInput = (e.target as HTMLElement)?.tagName?.toLowerCase() === 'input';
        const isModifierPressed = e.ctrlKey || e.metaKey || e.shiftKey;
        this.selectAnimationItem(checkbox, clickedOnInput, isModifierPressed);
        return;
      }

      if (target.closest('#target-weapon-reset-btn')) {
        const sel = this.state.getSelection();
        if (sel?.type === 'target') {
          const t = this.state.getLevel().targets[sel.index];
          const anims = t.animationNames && t.animationNames.length > 0
            ? t.animationNames
            : (t.animationName ? [t.animationName] : []);
          const defPos = getDefaultWeaponPosition(t.weaponModelPath || t.swordModelPath, anims);
          this.state.updateTarget(sel.index, {
            swordPosition: [defPos.x, defPos.y, defPos.z],
            swordRotation: [0, 0, 0],
            swordScale: 1.0,
          }, true);
          this.render();
        }
        return;
      }
      if (target.closest('#target-weapon-flip-btn')) {
        const sel = this.state.getSelection();
        if (sel?.type === 'target') {
          const t = this.state.getLevel().targets[sel.index];
          const curRot = t.swordRotation ? [...t.swordRotation] : [0, 0, 0];
          curRot[1] = (curRot[1] + Math.PI) % (2 * Math.PI);
          this.state.updateTarget(sel.index, {
            swordRotation: [curRot[0], curRot[1], curRot[2]],
          }, true);
          this.render();
        }
        return;
      }
      if (target.closest('#insp-dup-btn')) this.callbacks.onDuplicate();
      if (target.closest('#insp-del-btn')) this.callbacks.onDelete();
      if (target.closest('#json-export-btn')) this.callbacks.onExportJson();
      if (target.closest('#json-import-btn')) this.callbacks.onImportJson();
      if (target.closest('#env-sync-cam-btn')) {
        this.callbacks.onSyncCamera?.();
        const btn = target.closest('#env-sync-cam-btn') as HTMLElement;
        if (btn) {
          const original = btn.innerHTML;
          btn.innerHTML = `${getSvgIcon('check', 13)} <span>View Set!</span>`;
          setTimeout(() => { if (btn) btn.innerHTML = original; }, 1200);
        }
        return;
      }
      if (target.closest('#json-save-btn')) {
        this.state.saveCurrentLevelToStorage();
        const btn = this.element.querySelector('#json-save-btn') as HTMLElement;
        if (btn) btn.innerHTML = `${getSvgIcon('check', 14)} <span>Saved!</span>`;
        setTimeout(() => { if (btn) btn.innerHTML = `${getSvgIcon('save', 14)} <span>Save to Storage</span>`; }, 1400);
      }
    });

    this.element.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('asset-search-box')) {
        this.handleAssetSearch((target as HTMLInputElement).value);
        return;
      }
      if (target.classList.contains('anim-search-box')) {
        this.handleAnimSearch(target as HTMLInputElement);
        return;
      }
      this.handleFormChange(target, false);
    });

    this.element.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute('name') === 'target-anim-check') {
        this.selectAnimationItem(target as HTMLInputElement, true, false);
        return;
      }
      this.handleFormChange(target, true);
    });

    this.state.subscribe((event) => {
      if (event.type === 'selection_changed') {
        this.animSearchQuery = '';
        if (event.selection && this.activeTab !== 'inspector') this.activeTab = 'inspector';
        this.render();
      } else if (event.type === 'level_updated') {
        if (this.isInternalUpdating) return;
        const isUserTyping = this.element.contains(document.activeElement);
        if (!isUserTyping) {
          this.render();
        }
      }
    });
  }

  private handleAssetSearch(query: string): void {
    this.assetSearchQuery = query;
    const grid = this.element.querySelector('.asset-grid');
    if (grid) grid.innerHTML = renderAssetCards(this.getFilteredAssets());
  }

  private handleAnimSearch(input: HTMLInputElement): void {
    const listId = input.dataset.target;
    if (!listId) return;
    const container = this.element.querySelector(`#${listId}`);
    if (!container) return;
    const q = input.value.trim().toLowerCase();
    this.animSearchQuery = input.value;
    const items = container.querySelectorAll<HTMLElement>('.anim-checkbox-item');
    items.forEach((item) => {
      const label = item.dataset.animLabel || '';
      item.style.display = (!q || label.includes(q)) ? 'flex' : 'none';
    });
  }

  private setAnimationMode(listId: string, newMode: 'single' | 'multi'): void {
    this.animModes.set(listId, newMode);
    const container = this.element.querySelector(`#${listId}`) as HTMLElement | null;
    if (container) {
      container.dataset.mode = newMode;
    }

    const modeBtns = this.element.querySelectorAll<HTMLElement>(`.anim-mode-btn[data-list-id="${listId}"]`);
    modeBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.setMode === newMode);
    });

    const isTarget = listId === 'target-anim-list';
    const sel = this.state.getSelection();
    if (!sel) return;

    if (newMode === 'single') {
      if (isTarget && sel.type === 'target') {
        const t = this.state.getLevel().targets[sel.index];
        const currentAnims = t.animationNames && t.animationNames.length > 0
          ? t.animationNames
          : (t.animationName ? [t.animationName] : ['Dance_Loop']);
        if (currentAnims.length > 1) {
          this.applyAnimationSelection(listId, [currentAnims[0]]);
        }
      }
    }
  }

  private removeAnimationFromSequence(listId: string, animId: string): void {
    const isTarget = listId === 'target-anim-list';
    const sel = this.state.getSelection();
    if (!sel || !isTarget || sel.type !== 'target') return;

    const t = this.state.getLevel().targets[sel.index];
    const currentAnims = t.animationNames && t.animationNames.length > 0
      ? [...t.animationNames]
      : (t.animationName ? [t.animationName] : ['Dance_Loop']);

    if (currentAnims.length <= 1) return; // Keep at least one
    const newAnims = currentAnims.filter((id) => id !== animId);
    if (newAnims.length === 1) {
      this.animModes.set(listId, 'single');
    }
    this.applyAnimationSelection(listId, newAnims);
  }

  private selectAnimationItem(checkbox: HTMLInputElement, clickedOnInput = false, isModifierPressed = false): void {
    const isTarget = checkbox.name === 'target-anim-check';
    const listId = 'target-anim-list';
    const sel = this.state.getSelection();
    if (!sel || !isTarget || sel.type !== 'target') return;

    const animId = checkbox.value;
    const lvl = this.state.getLevel();

    const t = lvl.targets[sel.index];
    const currentAnims = t.animationNames && t.animationNames.length > 0
      ? [...t.animationNames]
      : (t.animationName ? [t.animationName] : ['Dance_Loop']);

    let activeMode = this.getAnimMode(listId, currentAnims.length);

    if (isModifierPressed) {
      activeMode = 'multi';
      this.animModes.set(listId, 'multi');
    } else if (clickedOnInput && activeMode === 'single' && !currentAnims.includes(animId)) {
      activeMode = 'multi';
      this.animModes.set(listId, 'multi');
    }

    let newAnims: string[] = [];
    if (activeMode === 'single') {
      newAnims = [animId];
    } else {
      if (currentAnims.includes(animId)) {
        if (currentAnims.length > 1) {
          newAnims = currentAnims.filter((id) => id !== animId);
        } else {
          newAnims = [...currentAnims];
        }
      } else {
        newAnims = [...currentAnims, animId];
      }
    }

    this.applyAnimationSelection(listId, newAnims);
  }

  private applyAnimationSelection(listId: string, animNames: string[]): void {
    const isTarget = listId === 'target-anim-list';
    const badgeId = 'target-anim-count-badge';
    const pillsId = 'target-anim-pills';
    const container = this.element.querySelector(`#${listId}`);
    if (!container) return;

    const animSet = new Set(animNames);

    // 1. Update all checkboxes in container
    const allCheckboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    allCheckboxes.forEach((cb) => {
      const isChecked = animSet.has(cb.value);
      cb.checked = isChecked;
      cb.closest('.anim-checkbox-item')?.classList.toggle('selected', isChecked);
    });

    // 2. Update count badge
    const badge = this.element.querySelector(`#${badgeId}`);
    if (badge) {
      badge.textContent = animNames.length > 1 ? `${animNames.length} (Seq)` : `${animNames.length} selected`;
    }

    // 3. Update mode toggle buttons
    const activeMode = this.getAnimMode(listId, animNames.length);
    const modeBtns = this.element.querySelectorAll<HTMLElement>(`.anim-mode-btn[data-list-id="${listId}"]`);
    modeBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.setMode === activeMode);
    });

    // 4. Update pills preserving exact sequence order
    const pillsContainer = this.element.querySelector(`#${pillsId}`);
    if (pillsContainer) {
      const catalog = CHARACTER_ANIMATIONS;
      const animMap = new Map(catalog.map((a) => [a.id, a.label]));
      pillsContainer.innerHTML = animNames.map((id, idx) => {
        const label = animMap.get(id) || id;
        const prefix = animNames.length > 1 ? `${idx + 1}. ` : '';
        const removeBtn = animNames.length > 1
          ? `<span class="anim-pill-remove" data-anim-id="${id}" data-list-id="${listId}" title="Remove animation">×</span>`
          : '';
        return `<span class="anim-pill-tag" data-anim-id="${id}">${prefix}${label}${removeBtn}</span>`;
      }).join('');
    }

    // 5. Update Target in state
    const sel = this.state.getSelection();
    if (isTarget && sel?.type === 'target') {
      const hasLocomotion = animNames.some((a) => {
        const lower = (a || '').toLowerCase();
        return lower.includes('walk') || lower.includes('jog') || lower.includes('sprint') || lower.includes('run');
      });

      const lvl = this.state.getLevel();
      const curTarget = lvl.targets[sel.index];
      const px = curTarget.position[0];
      const curDist = curTarget.patrolRange ? Math.abs(curTarget.patrolRange[1] - curTarget.patrolRange[0]) : 4.0;
      const halfDist = Math.max(0.2, curDist / 2);
      const minX = Math.round((px - halfDist) * 100) / 100;
      const maxX = Math.round((px + halfDist) * 100) / 100;

      const isPatrolActive = hasLocomotion ? (curTarget.isPatrolling ?? true) : false;

      this.isInternalUpdating = true;
      try {
        this.state.updateTarget(sel.index, {
          animationName: animNames[0],
          animationNames: animNames,
          isPatrolling: isPatrolActive,
          patrolRange: isPatrolActive ? (curTarget.patrolRange || [minX, maxX]) : undefined,
          patrolSpeed: isPatrolActive ? (curTarget.patrolSpeed || 1.2) : undefined,
        }, true);
      } finally {
        this.isInternalUpdating = false;
      }

      // Update patrol UI controls
      const patrolCheck = this.element.querySelector('#target-patrol-enable') as HTMLInputElement | null;
      const patrolControls = this.element.querySelector('#target-patrol-controls') as HTMLElement | null;
      const patrolBadge = this.element.querySelector('#target-patrol-status-badge') as HTMLElement | null;
      const distInput = this.element.querySelector('#target-patrol-distance') as HTMLInputElement | null;
      const speedInput = this.element.querySelector('#target-patrol-speed') as HTMLInputElement | null;
      const rangePreview = this.element.querySelector('#target-patrol-range-preview') as HTMLElement | null;

      if (patrolCheck) {
        patrolCheck.disabled = !hasLocomotion;
        patrolCheck.checked = isPatrolActive;
      }
      if (distInput) distInput.disabled = !hasLocomotion;
      if (speedInput) speedInput.disabled = !hasLocomotion;
      if (patrolControls) {
        patrolControls.style.display = (isPatrolActive && hasLocomotion) ? 'block' : 'none';
      }
      if (patrolBadge) {
        patrolBadge.style.color = hasLocomotion ? '#38bdf8' : '#f59e0b';
        patrolBadge.textContent = hasLocomotion ? (isPatrolActive ? 'Patrol Active' : 'Patrol Inactive') : 'Requires Walk Anim';
      }
      if (rangePreview) {
        rangePreview.textContent = `Range: [${minX}, ${maxX}]`;
      }
    }
  }

  private handleFormChange(target: HTMLElement, pushHistory: boolean): void {
    const sel = this.state.getSelection();
    const lvl = this.state.getLevel();
    const getNum = (id: string, fallback: number) => getInputValueNum(this.element, id, fallback);

    if (sel?.type === 'prop' && lvl.props && lvl.props[sel.index]) {
      const p = lvl.props[sel.index];
      const name = (this.element.querySelector('#prop-name-input') as HTMLInputElement)?.value || p.name;
      const px = getNum('#prop-pos-x', p.position[0]);
      const py = getNum('#prop-pos-y', p.position[1]);
      const pz = getNum('#prop-pos-z', p.position[2]);
      const rxDeg = getNum('#prop-rot-x', Math.round(((p.rotationX ?? 0) * 180) / Math.PI));
      const ryDeg = getNum('#prop-rot-y', Math.round(((p.rotationY ?? 0) * 180) / Math.PI));
      const rzDeg = getNum('#prop-rot-z', Math.round(((p.rotationZ ?? 0) * 180) / Math.PI));
      const scale = getNum('#prop-scale', p.scale ?? 1.0);
      const col = (this.element.querySelector('#prop-collision') as HTMLInputElement)?.checked ?? false;
      const sha = (this.element.querySelector('#prop-shadow') as HTMLInputElement)?.checked ?? true;

      this.state.updateProp(sel.index, {
        name,
        position: [px, py, pz],
        rotationX: (rxDeg * Math.PI) / 180,
        rotationY: (ryDeg * Math.PI) / 180,
        rotationZ: (rzDeg * Math.PI) / 180,
        scale,
        hasCollision: col,
        castShadow: sha,
      }, pushHistory);
      return;
    }

    if (sel?.type === 'target' && lvl.targets[sel.index]) {
      const t = lvl.targets[sel.index];
      const checkedBoxes = Array.from(this.element.querySelectorAll<HTMLInputElement>('input[name="target-anim-check"]:checked')).map((cb) => cb.value);
      const checkedSet = new Set(checkedBoxes);
      const existingSeq = (t.animationNames || (t.animationName ? [t.animationName] : [])).filter((id) => checkedSet.has(id));
      checkedSet.forEach((id) => {
        if (!existingSeq.includes(id)) existingSeq.push(id);
      });
      const animNames = existingSeq.length > 0 ? existingSeq : (t.animationNames || [t.animationName || 'Dance_Loop']);
      const anim = animNames[0] || t.animationName || 'Dance_Loop';
      const speed = getNum('#target-anim-speed', t.animationSpeed ?? 1.0);
      const px = getNum('#target-pos-x', t.position[0]);
      const py = getNum('#target-pos-y', t.position[1]);
      const pz = getNum('#target-pos-z', t.position[2]);
      const ryDeg = getNum('#target-rot-y', Math.round(((t.rotationY ?? 0) * 180) / Math.PI));
      const scale = getNum('#target-scale', t.scale ?? 1.0);

      // Weapon model selection
      const weaponModelSelect = this.element.querySelector('#target-weapon-model') as HTMLSelectElement | null;
      let weaponModelPath: string | undefined = undefined;
      if (weaponModelSelect) {
        const val = weaponModelSelect.value;
        weaponModelPath = val === 'auto' ? undefined : (val === 'none' ? 'none' : val);
      } else {
        weaponModelPath = t.weaponModelPath || t.swordModelPath;
      }

      // Weapon position offset (in meters)
      const defWPos = getDefaultWeaponPosition(weaponModelPath, animNames);
      const curWPos = t.swordPosition || [defWPos.x, defWPos.y, defWPos.z];
      const wpx = getNum('#target-weapon-pos-x', curWPos[0]);
      const wpy = getNum('#target-weapon-pos-y', curWPos[1]);
      const wpz = getNum('#target-weapon-pos-z', curWPos[2]);

      // Weapon rotation offset (in degrees converted to radians)
      const curWRot = t.swordRotation || [0, 0, 0];
      const wrxDeg = getNum('#target-weapon-rot-x', Math.round(((curWRot[0] || 0) * 180) / Math.PI));
      const wryDeg = getNum('#target-weapon-rot-y', Math.round(((curWRot[1] || 0) * 180) / Math.PI));
      const wrzDeg = getNum('#target-weapon-rot-z', Math.round(((curWRot[2] || 0) * 180) / Math.PI));

      // Weapon scale multiplier
      const wScale = Math.max(0.05, getNum('#target-weapon-scale', t.swordScale ?? 1.0));

      // Magic VFX selection
      const magicSelect = this.element.querySelector('#target-magic-fx') as HTMLSelectElement | null;
      let magicFx: 'arcane' | 'fire' | undefined = undefined;
      if (magicSelect) {
        const val = magicSelect.value;
        magicFx = val === 'none' ? undefined : (val as 'arcane' | 'fire');
      } else {
        magicFx = typeof t.magicFx === 'string' && t.magicFx !== 'none'
          ? (t.magicFx as 'arcane' | 'fire')
          : (t.magicFx ? 'arcane' : undefined);
      }

      // Patrol & Walk distance handling
      const hasLocomotion = animNames.some((a) => {
        const lower = (a || '').toLowerCase();
        return lower.includes('walk') || lower.includes('jog') || lower.includes('sprint') || lower.includes('run');
      });
      const patrolEnableCheckbox = this.element.querySelector('#target-patrol-enable') as HTMLInputElement | null;
      const isPatrolEnabled = hasLocomotion && (patrolEnableCheckbox ? patrolEnableCheckbox.checked : false);

      const curDist = t.patrolRange ? Math.abs(t.patrolRange[1] - t.patrolRange[0]) : 4.0;
      const walkDistance = Math.max(0.5, getNum('#target-patrol-distance', curDist));
      const walkSpeed = Math.max(0.2, getNum('#target-patrol-speed', t.patrolSpeed ?? 1.2));

      const halfDist = walkDistance / 2;
      const minX = Math.round((px - halfDist) * 100) / 100;
      const maxX = Math.round((px + halfDist) * 100) / 100;

      const patrolControls = this.element.querySelector('#target-patrol-controls') as HTMLElement | null;
      if (patrolControls) {
        patrolControls.style.display = (isPatrolEnabled && hasLocomotion) ? 'block' : 'none';
      }
      const badge = this.element.querySelector('#target-patrol-status-badge') as HTMLElement | null;
      if (badge) {
        badge.style.color = hasLocomotion ? '#38bdf8' : '#f59e0b';
        badge.textContent = hasLocomotion ? (isPatrolEnabled ? 'Patrol Active' : 'Patrol Inactive') : 'Requires Walk Anim';
      }
      const rangePreview = this.element.querySelector('#target-patrol-range-preview');
      if (rangePreview) {
        rangePreview.textContent = `Range: [${minX}, ${maxX}]`;
      }

      this.state.updateTarget(sel.index, {
        animationName: anim,
        animationNames: animNames,
        animationSpeed: speed,
        position: [px, py, pz],
        rotationY: (ryDeg * Math.PI) / 180,
        scale,
        weaponModelPath,
        swordModelPath: weaponModelPath,
        swordPosition: [wpx, wpy, wpz],
        swordRotation: [(wrxDeg * Math.PI) / 180, (wryDeg * Math.PI) / 180, (wrzDeg * Math.PI) / 180],
        swordScale: wScale,
        magicFx,
        isPatrolling: isPatrolEnabled,
        patrolRange: isPatrolEnabled ? [minX, maxX] : undefined,
        patrolSpeed: isPatrolEnabled ? walkSpeed : undefined,
      }, pushHistory);
      return;
    }

    if (sel?.type === 'gun' || target.id.startsWith('gun-')) {
      const cur = lvl.gunSpawnPos || [-2.2, 0.085, 0];
      const px = getNum('#gun-pos-x', cur[0]);
      const py = getNum('#gun-pos-y', cur[1]);
      const pz = 0; // Strictly 0 in 2D gameplay
      const curRot = lvl.gunRotation || [0, 0, 0];
      const rzDeg = getNum('#gun-rot-z', Math.round(((curRot[2] || 0) * 180) / Math.PI));
      const rz = (rzDeg * Math.PI) / 180;
      const curScale = lvl.gunScale ?? 0.52;
      const scale = Math.max(0.1, getNum('#gun-scale', curScale));
      const ammo = Math.max(1, Math.round(getNum('#gun-ammo', lvl.ammo || 5)));
      this.state.updateGun([px, py, pz], [0, 0, rz], ammo, pushHistory, scale);
      return;
    }

    if (target.id.startsWith('env-')) {
      const name = (this.element.querySelector('#env-name-input') as HTMLInputElement)?.value || lvl.name;
      const subInput = this.element.querySelector('#env-sub-input') as HTMLInputElement | null;
      const sub = subInput ? subInput.value : (lvl.subtitle || '');
      const envType = (this.element.querySelector('#env-type-select') as HTMLSelectElement)?.value as 'room' | 'park' | 'custom';
      const skyHex = (this.element.querySelector('#env-sky-color') as HTMLInputElement)?.value || '#8ec5ed';
      const grassHex = (this.element.querySelector('#env-grass-color') as HTMLInputElement)?.value || '#54a84c';
      const camRadVal = parseFloat((this.element.querySelector('#env-cam-radius') as HTMLInputElement)?.value);
      const safeRadius = !isNaN(camRadVal) && camRadVal > 0 ? camRadVal : lvl.cameraRadius;

      if (target.id === 'env-cam-radius' && !isNaN(camRadVal) && camRadVal > 0) {
        this.callbacks.onCameraZoomChange?.(camRadVal);
      }

      this.state.setLevel({
        ...lvl,
        name,
        subtitle: sub,
        environmentType: envType,
        skyColor: hexToRgba(skyHex),
        grassColor: hexToRgb(grassHex),
        cameraRadius: safeRadius,
      }, pushHistory);
    }
  }

  public update(): void {
    this.render();
  }
}
