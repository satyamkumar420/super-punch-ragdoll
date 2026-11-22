import { Vector3, Matrix } from '@babylonjs/core';
import { createGameScene } from './scene';
import { createPunchShooter } from './punchShooter';
import {
  audioManager,
  playVictorySound,
  playButtonClick,
  playCoinPickupSound,
  isAudioMuted,
  toggleSound,
} from './audio';
import type { RagdollController } from './ragdoll';
import { youtubePlayables } from './services/youtubePlayables';
import { setupDevGizmo } from './core/devGizmo';
import { obstacleManager } from './core/obstacleManager';
import { LevelEditor } from './editor/levelEditor';
import { TestPlayController } from './core/testPlayMode';
import { parseJsonLevel } from './core/levelLoader';
import type { JsonLevelConfig, LevelData } from './config/levelTypes';
import level1Json from './config/levels/level-1.json';
import { ALL_LEVELS } from './config/levels/index';
import { preloadAllAssets, clearPreloadCache } from './core/assetPreloader';
import { triggerCoinCollectionAnimation } from './core/coinFlyAnimation';
import { updateModalResponsiveScale } from './core/modalResponsive';
import { computeLevelGameplayBounds } from './core/cameraResponsive';
import { i18n, t } from './i18n/i18n';
import { LanguageModalController } from './i18n/languageModal';
import { LevelModalController } from './core/levelModal';
import { safeStorage } from './services/storage';
import { playStarsSequenceAnimation, resetStarsPodium } from './core/starsAnimation';
import { environmentManager } from './environments/environmentManager';

async function bootstrap() {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const levelBadge = document.getElementById('level-badge');
  const tapHint = document.getElementById('tap-hint');
  const loadingScreen = document.getElementById('loading-screen');
  const victoryBanner = document.getElementById('victory-banner');
  const victoryScoreBadge = document.getElementById('victory-score-badge');
  const pauseModal = document.getElementById('pause-modal');
  const pauseResumeBtn = document.getElementById('pause-resume-btn') as HTMLButtonElement | null;
  const collectBtn = document.getElementById('collect-btn') as HTMLButtonElement | null;
  const doubleCoinsBtn = document.getElementById('double-coins-btn') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;
  const soundBtn = document.getElementById('sound-btn');
  const langBtn = document.getElementById('lang-btn');
  const editorBtn = document.getElementById('editor-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const settingsModalClose = document.getElementById('settings-modal-close');
  const settingsLevelBtn = document.getElementById('settings-level-btn');
  const uiOverlay = document.getElementById('ui-overlay');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const scoreVal = document.getElementById('score-val');
  const scoreBadge = document.getElementById('score-badge');

  youtubePlayables.firstFrameReady();

  let currentLevelIdx = 0;
  let highestUnlockedLevel = 1;
  let totalScore = 0;
  let pendingBonusCoins = 0;
  let isEditorMode = false;
  let hasTappedOnce = false;
  let activeLevelToken = 0;
  let currentActiveLevel: LevelData = parseJsonLevel(level1Json as unknown as JsonLevelConfig);

  const syncSettingsTexts = () => {
    const langSub = document.getElementById('settings-lang-sub');
    if (langSub) {
      langSub.textContent = i18n.getCurrentLanguageMeta().nativeName;
    }
    const settingsLevelIndicator = document.getElementById('settings-level-indicator');
    if (settingsLevelIndicator) {
      settingsLevelIndicator.textContent = t('level_n', { n: currentActiveLevel.id });
    }
    const settingsLevelSub = document.getElementById('settings-level-sub');
    if (settingsLevelSub) {
      settingsLevelSub.textContent = `${t('level', {}, 'LEVEL')} ${currentActiveLevel.id} • ${highestUnlockedLevel} ${t('level_locked', {}, 'UNLOCKED')}`;
    }
  };

  const updateHUD = (lvl: LevelData) => {
    const levelText = document.getElementById('level-badge-text');
    if (levelText) {
      levelText.textContent = t('level_n', { n: lvl.id });
    } else if (levelBadge) {
      levelBadge.textContent = t('level_n', { n: lvl.id });
    }
    syncSettingsTexts();
    if (tapHint) {
      if (lvl.id === 1 && !hasTappedOnce) {
        // Only Level 1 shows the introductory tutorial hint
        const subKey = 'level_1_subtitle';
        const rawSub = (lvl.subtitle || '').trim();
        const subtitleText = rawSub.length > 0 ? t(subKey, {}, rawSub).trim() : '🥊 Tap anywhere to punch ragdolls!';
        tapHint.textContent = subtitleText;
        tapHint.classList.remove('hidden');
      } else {
        // Strictly no subtitle for any other level
        tapHint.textContent = '';
        tapHint.classList.add('hidden');
      }
    }
  };

  const storedHighest = safeStorage.getItem('highest_unlocked_level');
  if (storedHighest) {
    const parsed = parseInt(storedHighest, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      highestUnlockedLevel = Math.max(highestUnlockedLevel, parsed);
    }
  }

  const cloudData = await youtubePlayables.loadData();
  if (cloudData) {
    if (typeof cloudData.unlockedLevel === 'number' && cloudData.unlockedLevel >= 1) {
      highestUnlockedLevel = Math.max(highestUnlockedLevel, cloudData.unlockedLevel);
      currentLevelIdx = Math.max(0, cloudData.unlockedLevel - 1);
    }
    if (typeof cloudData.highestScore === 'number') totalScore = cloudData.highestScore;
    if (typeof cloudData.soundEnabled === 'boolean') audioManager.setSoundEnabled(cloudData.soundEnabled);
  }
  safeStorage.setItem('highest_unlocked_level', String(highestUnlockedLevel));

  const platformLang = await youtubePlayables.getPlatformLanguage();
  i18n.init(cloudData?.preferredLanguage, platformLang);
  currentActiveLevel = { ...currentActiveLevel, id: currentLevelIdx + 1 };
  updateHUD(currentActiveLevel);

  const languageModal = new LanguageModalController();
  langBtn?.addEventListener('click', () => {
    playButtonClick();
    settingsModal?.classList.add('hidden');
    languageModal.open();
  });

  const openSettings = () => {
    if (isGamePaused) return;
    playButtonClick();
    syncSettingsTexts();
    updateModalResponsiveScale();
    settingsModal?.classList.remove('hidden');
  };

  const closeSettings = () => {
    playButtonClick();
    settingsModal?.classList.add('hidden');
  };

  settingsBtn?.addEventListener('click', openSettings);
  settingsModalClose?.addEventListener('click', closeSettings);
  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });

  settingsLevelBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isGamePaused) return;
    playButtonClick();
    settingsModal?.classList.add('hidden');
    levelModal?.open();
  });

  const urlParams = new URLSearchParams(window.location.search);
  const requestedLevel = urlParams.get('level');
  if (requestedLevel) {
    const parsed = parseInt(requestedLevel, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      currentLevelIdx = parsed - 1;
      currentActiveLevel = { ...currentActiveLevel, id: currentLevelIdx + 1 };
      updateHUD(currentActiveLevel);
    }
  }

  const updateScoreDisplay = () => {
    if (scoreVal) scoreVal.textContent = totalScore.toLocaleString();
    if (scoreBadge) {
      scoreBadge.classList.remove('score-bump');
      void scoreBadge.offsetWidth;
      scoreBadge.classList.add('score-bump');
    }
  };
  updateScoreDisplay();

  const getDynamicPoints = (min = 20, max = 100): number => {
    const step = 5;
    return min + Math.floor(Math.random() * (Math.floor((max - min) / step) + 1)) * step;
  };

  const updateSoundIcons = (muted: boolean = isAudioMuted(), animate = false) => {
    soundIconOn?.classList.toggle('hidden', muted);
    soundIconOff?.classList.toggle('hidden', !muted);
    soundBtn?.classList.toggle('btn-3d-red', muted);
    soundBtn?.classList.toggle('btn-3d-blue', !muted);

    const titleText = t('toggle_sound');
    soundBtn?.setAttribute('aria-label', titleText);
    soundBtn?.setAttribute('title', titleText);
    soundBtn?.setAttribute('aria-pressed', String(!muted));

    const soundToggleBadge = document.getElementById('sound-toggle-badge');
    if (soundToggleBadge) {
      soundToggleBadge.textContent = muted ? 'OFF' : 'ON';
      soundToggleBadge.classList.toggle('sound-off', muted);
      soundToggleBadge.classList.toggle('sound-on', !muted);
    }

    const soundIconBox = document.getElementById('settings-sound-icon-box');
    if (soundIconBox) {
      soundIconBox.classList.toggle('settings-icon-amber', muted);
      soundIconBox.classList.toggle('settings-icon-cyan', !muted);
    }

    if (animate && soundBtn) {
      soundBtn.classList.remove('btn-toggle-pop');
      void soundBtn.offsetWidth;
      soundBtn.classList.add('btn-toggle-pop');
    }
  };

  // Immediate subscription: Whenever platform (YouTube) or in-game toggles audio, UI syncs instantly
  audioManager.onStateChange((muted) => {
    updateSoundIcons(muted, true);
  });

  soundBtn?.addEventListener('click', () => {
    const nextEnabled = toggleSound();
    if (nextEnabled) {
      playButtonClick();
    }
    void youtubePlayables.saveData({
      soundEnabled: nextEnabled,
      preferredLanguage: i18n.getLanguage(),
    });
  });

  // Preload all 3D game models upfront into memory to eliminate repeated network fetches
  const loaderBarFill = document.querySelector('.loader-bar-fill') as HTMLElement | null;
  const loaderSubtitle = document.querySelector('.loader-subtitle') as HTMLElement | null;
  const loaderPercent = document.querySelector('.loader-percent') as HTMLElement | null;
  const loaderTitle = document.querySelector('.loader-title') as HTMLElement | null;

  if (loaderTitle) {
    loaderTitle.textContent = t('game_title');
  }
  if (loaderSubtitle) {
    loaderSubtitle.textContent = t('loading');
  }
  if (loaderBarFill) {
    loaderBarFill.style.width = '1%';
  }
  if (loaderPercent) {
    loaderPercent.textContent = '1%';
  }

  const preloadStartTime = Date.now();
  await Promise.all([
    preloadAllAssets({
      concurrency: 8,
      onProgress: ({ percent }) => {
        const displayPercent = Math.max(1, Math.min(100, percent));
        if (loaderBarFill) loaderBarFill.style.width = `${displayPercent}%`;
        if (loaderPercent) loaderPercent.textContent = `${displayPercent}%`;
      },
    }),
    audioManager.preloadAudio(),
  ]);

  if (loaderPercent) loaderPercent.textContent = '100%';
  if (loaderBarFill) loaderBarFill.style.width = '100%';

  // Ensure minimum visual duration so players can see the smooth 1-100% progress
  const preloadElapsed = Date.now() - preloadStartTime;
  if (preloadElapsed < 500) {
    await new Promise((resolve) => setTimeout(resolve, 500 - preloadElapsed));
  }

  const {
    engine,
    scene,
    camera,
    shadowGenerator,
    hemiLight,
    dirLight,
    setStudioColor,
    setCameraParams,
    pause: pauseScene,
    resume: resumeScene,
  } = await createGameScene(canvas);
  (window as any).__SCENE__ = scene;
  (window as any).__projectPoint = (v: { x: number; y: number; z: number }) => {
    return Vector3.Project(
      new Vector3(v.x, v.y, v.z),
      Matrix.Identity(),
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(canvas.clientWidth, canvas.clientHeight)
    );
  };
  setupDevGizmo(scene);
  obstacleManager.init(scene);
  (window as any).__obstacleManager = obstacleManager;
  const punchShooter = createPunchShooter(scene, camera, shadowGenerator);

  const setWeaponVisible = (visible: boolean) => {
    punchShooter.root.setEnabled(visible);
  };

  let currentControllers: RagdollController[] = [];
  let currentCleanup: (() => void) | null = null;
  let isLevelEnding = false;

  const updateNextBtn = () => {
    if (!nextBtn || typeof editor === 'undefined') return;
    const isLast = currentLevelIdx === getAvailableLevels().length - 1;
    const label = isLast ? t('start_again') : t('next_level');
    const icon = isLast
      ? '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'
      : '<path d="m9 18 6-6-6-6"/>';
    nextBtn.innerHTML = `<span>${label}</span><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
  };

  let levelModal: LevelModalController | null = null;

  i18n.onLanguageChange(() => {
    updateHUD(currentActiveLevel);
    if (victoryScoreBadge && pendingBonusCoins > 0) {
      victoryScoreBadge.textContent = t('coins_badge', { amount: pendingBonusCoins });
    }
    const doubleBtnText = document.getElementById('double-coins-btn-text');
    if (doubleBtnText) {
      doubleBtnText.textContent = t('double_coins', {}, '2X COINS');
    }
    updateNextBtn();
    levelModal?.updateTexts();
  });

  const getAvailableLevels = (): LevelData[] => {
    const editorLevels = editor ? editor.getState().getAllLevels() : [];
    // If in editor or test-play mode, use live editor drafts so modifications can be tested
    if (isEditorMode || testPlayController.isTesting()) {
      const baseLevels = ALL_LEVELS.map((lvl) => {
        const editorVersion = editorLevels.find((el) => el.id === lvl.id);
        return editorVersion ? parseJsonLevel(editorVersion) : lvl;
      });
      const extraCustom = editorLevels
        .filter((el) => !ALL_LEVELS.some((lvl) => lvl.id === el.id))
        .map((el) => parseJsonLevel(el));
      return [...baseLevels, ...extraCustom];
    }
    // In regular gameplay, always use the authoritative ALL_LEVELS from code + custom levels
    const extraCustom = editorLevels
      .filter((el) => !ALL_LEVELS.some((lvl) => lvl.id === el.id))
      .map((el) => parseJsonLevel(el));
    return [...ALL_LEVELS, ...extraCustom];
  };

  const loadActiveLevel = async (level: LevelData) => {
    const token = ++activeLevelToken;
    currentActiveLevel = level;
    isLevelEnding = false;
    hasTappedOnce = false;
    pendingBonusCoins = 0;
    // Instantly hide weapon during transition so previous level's position is NEVER visible
    setWeaponVisible(false);
    victoryBanner?.classList.add('hidden');
    resetStarsPodium();
    collectBtn?.classList.add('hidden');
    doubleCoinsBtn?.classList.add('hidden');
    if (doubleCoinsBtn) {
      doubleCoinsBtn.disabled = false;
      doubleCoinsBtn.style.pointerEvents = 'auto';
      doubleCoinsBtn.style.opacity = '1';
    }
    nextBtn?.classList.add('hidden');

    currentControllers = [];
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    obstacleManager.clear();
    // Sweep orphan geometries with no active meshes to free CPU/GPU vertex buffers
    scene.getGeometries().forEach((g) => {
      if (!g.meshes || g.meshes.length === 0) {
        g.dispose();
      }
    });
    scene.cleanCachedTextureBuffer();
    if (typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
      } catch {
        // Safe check
      }
    }

    environmentManager.applyTheme(level.id, level.environmentType, scene, shadowGenerator, hemiLight, dirLight);
    setStudioColor(level.skyColor, level.grassColor);
    const bounds = computeLevelGameplayBounds(level);
    setCameraParams(level.cameraRadius, level.cameraTarget, level.cameraAlpha, level.cameraBeta, bounds);
    const result = await level.setup(scene, shadowGenerator);
    if (token !== activeLevelToken) {
      result.cleanup?.();
      return;
    }
    currentControllers = result.controllers;
    (window as any).__controllers = currentControllers;
    (window as unknown as { __getScene?: () => unknown }).__getScene = () => scene;
    currentCleanup = result.cleanup;

    setWeaponVisible(true);

    updateHUD(level);
  };

  const loadLevelByIdx = async (idx: number) => {
    const all = getAvailableLevels();
    currentLevelIdx = idx % all.length;
    await loadActiveLevel(all[currentLevelIdx]);
  };

  levelModal = new LevelModalController({
    getLevels: () => getAvailableLevels().map((lvl) => ({ id: lvl.id, name: lvl.name })),
    getCurrentLevelId: () => currentActiveLevel.id,
    getHighestUnlockedLevel: () => highestUnlockedLevel,
    onSelectLevel: (_lvlId, lvlIdx) => {
      if (isEditorMode) {
        isEditorMode = false;
        testPlayController.deactivate();
        setWeaponVisible(true);
        uiOverlay?.classList.remove('hidden');
      }
      void loadLevelByIdx(lvlIdx);
    },
  });

  let openEditorMode: (specificLevel?: JsonLevelConfig) => void;

  const testPlayController = new TestPlayController({
    onExitToEditor: (levelJson) => {
      openEditorMode(levelJson);
    },
    onRestartTest: async (levelJson) => {
      const testLevel = parseJsonLevel(levelJson);
      await loadActiveLevel(testLevel);
      canvas.focus();
    },
  });

  // Lazy Level Editor Controller Setup (instantiated only on demand)
  let editor: LevelEditor | null = null;
  const getEditor = (): LevelEditor => {
    if (!editor) {
      editor = new LevelEditor({
        scene,
        canvas,
        shadowGenerator,
        setStudioColor,
        onTestLevel: async (testLevelJson: JsonLevelConfig) => {
          isEditorMode = false;
          setWeaponVisible(true);
          uiOverlay?.classList.remove('hidden');
          const all = getAvailableLevels();
          const foundIdx = all.findIndex((l) => l.id === testLevelJson.id);
          if (foundIdx >= 0) currentLevelIdx = foundIdx;
          testPlayController.activate(testLevelJson);
          const testLevel = parseJsonLevel(testLevelJson);
          await loadActiveLevel(testLevel);
          canvas.focus();
        },
        onExitEditor: () => {
          isEditorMode = false;
          testPlayController.deactivate();
          setWeaponVisible(true);
          uiOverlay?.classList.remove('hidden');
          const activeLvl = editor!.getState().getLevel();
          const all = getAvailableLevels();
          const foundIdx = all.findIndex((l) => l.id === activeLvl.id);
          if (foundIdx >= 0) currentLevelIdx = foundIdx;
          void loadLevelByIdx(currentLevelIdx);
        },
      });
      (window as any).__LEVEL_EDITOR__ = editor;
    }
    return editor;
  };

  openEditorMode = (specificLevel?: JsonLevelConfig) => {
    languageModal.close();
    testPlayController.deactivate();
    isEditorMode = true;
    uiOverlay?.classList.add('hidden');
    tapHint?.classList.add('hidden');
    victoryBanner?.classList.add('hidden');
    resetStarsPodium();
    setWeaponVisible(false);
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    const ed = getEditor();
    if (specificLevel) {
      ed.open(specificLevel);
      return;
    }
    const all = ed.getState().getAllLevels();
    const safeIdx = Math.min(currentLevelIdx, all.length - 1);
    const targetJson = all[safeIdx] || all[0];
    ed.open(targetJson);
  };

  editorBtn?.addEventListener('click', () => {
    playButtonClick();
    openEditorMode();
  });

  if (window.location.search.includes('editor') || window.location.hash.includes('editor')) {
    openEditorMode();
  } else {
    try {
      await loadLevelByIdx(currentLevelIdx);
    } catch (err) {
      console.error('Failed to load initial level:', err);
    }
  }

  setTimeout(() => {
    loadingScreen?.classList.add('fade-out');
    engine.resize();
    updateModalResponsiveScale();
    youtubePlayables.gameReady();
    audioManager.setGameLoaded(true);
    // Release in-memory preloaded Blob URLs once initial game is ready
    clearPreloadCache();
  }, 350);


  updateModalResponsiveScale();
  window.addEventListener('resize', updateModalResponsiveScale);
  window.addEventListener('orientationchange', updateModalResponsiveScale);

  const checkWin = () => {
    const total = currentControllers.length;
    const defeated = currentControllers.filter((c) => c.isDefeated).length;

    if (defeated === total && total > 0 && !isLevelEnding) {
      isLevelEnding = true;
      setTimeout(() => {
        playVictorySound();
        if (testPlayController.isTesting()) {
          if (nextBtn) {
            nextBtn.innerHTML = `<span>Back to Editor</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
            nextBtn.classList.remove('hidden');
          }
          if (collectBtn) collectBtn.classList.add('hidden');
          if (doubleCoinsBtn) doubleCoinsBtn.classList.add('hidden');
          updateModalResponsiveScale();
          victoryBanner?.classList.remove('hidden');
          playStarsSequenceAnimation();
          return;
        }

        pendingBonusCoins = getDynamicPoints(30, 80);
        highestUnlockedLevel = Math.max(highestUnlockedLevel, currentLevelIdx + 2);
        safeStorage.setItem('highest_unlocked_level', String(highestUnlockedLevel));

        if (victoryScoreBadge) victoryScoreBadge.textContent = t('coins_badge', { amount: pendingBonusCoins });
        if (doubleCoinsBtn) {
          doubleCoinsBtn.classList.remove('hidden');
          doubleCoinsBtn.disabled = false;
          doubleCoinsBtn.style.pointerEvents = 'auto';
          doubleCoinsBtn.style.opacity = '1';
        }
        if (collectBtn) {
          collectBtn.classList.remove('hidden');
          collectBtn.disabled = false;
          collectBtn.style.pointerEvents = 'auto';
          collectBtn.style.opacity = '1';
        }
        nextBtn?.classList.add('hidden');
        updateNextBtn();
        updateModalResponsiveScale();
        victoryBanner?.classList.remove('hidden');
        playStarsSequenceAnimation();
      }, 700);
    }
  };

  // Continuous victory monitor: ensures victory modal reliably opens even when ragdolls
  // are defeated asynchronously by flying domino ragdoll crashes, obstacles, or delayed chain reactions
  scene.onBeforeRenderObservable.add(() => {
    if (isEditorMode || isGamePaused || isLevelEnding) return;
    if (currentControllers.length > 0 && currentControllers.every((c) => c.isDefeated)) {
      updateHUD(currentActiveLevel);
      checkWin();
    }
  });

  let isGamePaused = youtubePlayables.getIsPaused();
  let isPlatformPaused = youtubePlayables.getIsPaused();

  const updatePauseUI = () => {
    if (!pauseResumeBtn) return;
    const isLockedByPlatform = isPlatformPaused || youtubePlayables.getIsPaused();
    if (isLockedByPlatform) {
      pauseResumeBtn.disabled = true;
      pauseResumeBtn.style.opacity = '0.5';
      pauseResumeBtn.style.pointerEvents = 'none';
      pauseResumeBtn.setAttribute('aria-disabled', 'true');
    } else {
      pauseResumeBtn.disabled = false;
      pauseResumeBtn.style.opacity = '1';
      pauseResumeBtn.style.pointerEvents = 'auto';
      pauseResumeBtn.removeAttribute('aria-disabled');
    }
  };

  let isAdPlaying = false;

  const handlePause = (fromPlatform = false, showModal = true) => {
    if (fromPlatform) {
      isPlatformPaused = true;
    }
    if (isGamePaused) {
      updatePauseUI();
      return;
    }
    isGamePaused = true;
    pauseScene();

    // Suppress pause modal if an ad is currently playing or showModal is false
    const isAdActive = isAdPlaying || youtubePlayables.getIsAdPlaying();
    if (!isAdActive && showModal) {
      pauseModal?.classList.remove('hidden');
    } else {
      pauseModal?.classList.add('hidden');
    }

    audioManager.pauseAll();
    updatePauseUI();
  };

  const handleResume = (fromPlatform = false) => {
    // If paused from outside (platform / SDK), do NOT allow in-game resume until platform sends onResume!
    if (!fromPlatform && (isPlatformPaused || youtubePlayables.getIsPaused())) {
      console.warn('[PauseResume] In-game resume rejected: Platform is currently paused externally.');
      updatePauseUI();
      return;
    }

    if (fromPlatform) {
      isPlatformPaused = false;
    }

    if (!isGamePaused) {
      updatePauseUI();
      return;
    }

    isGamePaused = false;
    resumeScene();
    pauseModal?.classList.add('hidden');
    audioManager.syncWithPlatform();
    updatePauseUI();
  };

  pauseResumeBtn?.addEventListener('click', () => {
    if (isPlatformPaused || youtubePlayables.getIsPaused()) {
      return;
    }
    playButtonClick();
    handleResume(false);
  });

  window.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape') {
      if (settingsModal && !settingsModal.classList.contains('hidden')) {
        closeSettings();
        return;
      }
      if (isAdPlaying || youtubePlayables.getIsAdPlaying()) {
        return;
      }
      if (isGamePaused) {
        if (isPlatformPaused || youtubePlayables.getIsPaused()) {
          return;
        }
        playButtonClick();
        handleResume(false);
      } else {
        handlePause(false);
      }
    }
  });

  youtubePlayables.onPause(() => {
    const isAdActive = isAdPlaying || youtubePlayables.getIsAdPlaying();
    handlePause(true, !isAdActive);
  });

  youtubePlayables.onResume(() => {
    handleResume(true);
  });

  if (youtubePlayables.getIsPaused()) {
    handlePause(true);
  }

  let pointerStartX = 0;
  let pointerStartY = 0;

  window.addEventListener('pointerdown', (evt) => {
    if (isEditorMode || isGamePaused || isLevelEnding) return;
    const targetEl = evt.target as HTMLElement | null;
    if (targetEl && targetEl.closest && (targetEl.tagName === 'BUTTON' || targetEl.closest('.modal-card'))) return;

    pointerStartX = evt.clientX;
    pointerStartY = evt.clientY;
  });

  window.addEventListener('pointerup', (evt) => {
    if (isEditorMode || isGamePaused || isLevelEnding) return;
    const targetEl = evt.target as HTMLElement | null;
    if (targetEl && targetEl.closest && (targetEl.tagName === 'BUTTON' || targetEl.closest('.modal-card'))) return;

    if (!hasTappedOnce) {
      hasTappedOnce = true;
      tapHint?.classList.add('hidden');
    }

    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX - rect.left;
    const clientY = evt.clientY - rect.top;

    const deltaX = evt.clientX - pointerStartX;
    const deltaY = evt.clientY - pointerStartY;
    const swipeDist = Math.hypot(deltaX, deltaY);

    let targetPoint = new Vector3(0.2, 0.9, 0.0);

    const pickRes = scene.pick(clientX, clientY, (m) => m.isVisible && !m.name.includes('punch') && !m.name.includes('reticle'));
    const clickedObs = pickRes?.pickedMesh ? obstacleManager.getObstacleByMesh(pickRes.pickedMesh) : null;

    let directHitBrawler: RagdollController | null = null;
    if (pickRes?.pickedMesh) {
      for (const ctrl of currentControllers) {
        if (ctrl.isDefeated) continue;
        let curr: any = pickRes.pickedMesh;
        while (curr) {
          if (curr === ctrl.character.rootNode) {
            directHitBrawler = ctrl;
            break;
          }
          curr = curr.parent;
        }
        if (directHitBrawler) break;
      }
    }

    const isDirectCharMesh = directHitBrawler !== null || (pickRes?.pickedMesh && (
      pickRes.pickedMesh.name.includes('char') ||
      pickRes.pickedMesh.name.includes('mannequin') ||
      pickRes.pickedMesh.name.includes('DEF-') ||
      pickRes.pickedMesh.name.includes('acc') ||
      pickRes.pickedMesh.name.includes('Pistol') ||
      pickRes.pickedMesh.name.includes('Sword')
    ));

    if (clickedObs && pickRes?.pickedPoint) {
      // Direct click on obstacle (e.g. car, crate, bench)
      targetPoint = pickRes.pickedPoint.clone();
      targetPoint.y = Math.max(0.05, targetPoint.y);
    } else if (isDirectCharMesh && pickRes?.pickedPoint) {
      // Direct click on ragdoll / character mesh
      targetPoint = pickRes.pickedPoint.clone();
    } else if (pickRes?.hit && pickRes.pickedPoint) {
      // Direct click on the ground, road, crosswalk, sidewalk, or scenery!
      // The user clicked this exact spot (e.g. road to left/right of car). Never snap away!
      targetPoint = pickRes.pickedPoint.clone();
      targetPoint.y = Math.max(0.05, targetPoint.y);
    } else {
      // Clicked into empty air/sky above everything (e.g. above ragdoll head or skyline)
      const ray = scene.createPickingRay(clientX, clientY, Matrix.Identity(), camera);
      if (ray) {
        // Project at camera focal distance (camera.radius from camera)
        // High clicks in the sky aim UP into 3D sky space, cleanly missing foreground characters!
        targetPoint = ray.origin.add(ray.direction.scale(camera.radius));
      }
    }

    const targetObsId = clickedObs ? clickedObs.id : null;
    if (swipeDist >= 24) {
      // Directional Swipe/Flick strike:
      // deltaX > 0: East (right), deltaX < 0: West (left)
      // deltaY < 0 (swipe up) pushes deeper into the screen (+Z)
      const swipeDir = new Vector3(deltaX, 0, Math.max(10, -deltaY)).normalize();
      punchShooter.shootPunch(targetPoint, currentControllers, () => {
        updateHUD(currentActiveLevel);
        checkWin();
      }, swipeDir, targetObsId);
    } else {
      // Direct Tap strike: punches straight to targetPoint, and ragdoll flies in that EXACT same direction!
      punchShooter.shootPunch(targetPoint, currentControllers, () => {
        updateHUD(currentActiveLevel);
        checkWin();
      }, undefined, targetObsId);
    }
  });

  const executeCollect = (multiplier = 1) => {
    if (isGamePaused) return;
    if (collectBtn) {
      collectBtn.disabled = true;
      collectBtn.style.pointerEvents = 'none';
    }
    if (doubleCoinsBtn) {
      doubleCoinsBtn.disabled = true;
      doubleCoinsBtn.style.pointerEvents = 'none';
    }
    playButtonClick();

    const startScore = totalScore;
    const coinsWon = pendingBonusCoins * multiplier;
    const finalScore = totalScore + coinsWon;
    pendingBonusCoins = 0;

    const target = scoreBadge || document.getElementById('score-badge');
    const totalCoins = multiplier > 1 ? 16 : 10;
    let coinsLanded = 0;

    const finishCollection = () => {
      totalScore = finalScore;
      updateScoreDisplay();
      void youtubePlayables.saveData({
        unlockedLevel: highestUnlockedLevel,
        highestScore: totalScore,
        soundEnabled: !isAudioMuted(),
        preferredLanguage: i18n.getLanguage(),
      });
      void youtubePlayables.sendScore(totalScore);

      collectBtn?.classList.add('hidden');
      doubleCoinsBtn?.classList.add('hidden');
      if (nextBtn) {
        nextBtn.classList.remove('hidden');
        nextBtn.classList.remove('btn-pop-in');
        void nextBtn.offsetWidth;
        nextBtn.classList.add('btn-pop-in');
      }
    };

    const animOrigin = (multiplier > 1 && doubleCoinsBtn) ? doubleCoinsBtn : collectBtn;
    if (!target || !animOrigin) {
      finishCollection();
      return;
    }

    void triggerCoinCollectionAnimation({
      fromElement: animOrigin,
      toElement: target,
      coinCount: totalCoins,
      onCoinLand: (idx) => {
        coinsLanded++;
        playCoinPickupSound(1.0 + (idx / totalCoins) * 0.4);
        scoreBadge?.classList.remove('score-bump');
        void scoreBadge?.offsetWidth;
        scoreBadge?.classList.add('score-bump');

        const currentVal = Math.round(startScore + (coinsWon * (coinsLanded / totalCoins)));
        if (scoreVal) scoreVal.textContent = currentVal.toLocaleString();
      },
      onComplete: finishCollection,
    });
  };

  doubleCoinsBtn?.addEventListener('click', async () => {
    if (isGamePaused || !doubleCoinsBtn || doubleCoinsBtn.disabled) return;
    playButtonClick();

    doubleCoinsBtn.disabled = true;
    doubleCoinsBtn.style.pointerEvents = 'none';
    if (collectBtn) {
      collectBtn.disabled = true;
      collectBtn.style.pointerEvents = 'none';
    }

    const granted = await youtubePlayables.showRewarded(
      'double_coins',
      () => {
        isAdPlaying = true;
        handlePause(true, false);
        audioManager.setMasterMute(true);
      },
      () => {
        isAdPlaying = false;
        handleResume(true);
        audioManager.syncWithPlatform();
      }
    );

    if (granted) {
      executeCollect(2);
    } else {
      doubleCoinsBtn.disabled = false;
      doubleCoinsBtn.style.pointerEvents = 'auto';
      if (collectBtn) {
        collectBtn.disabled = false;
        collectBtn.style.pointerEvents = 'auto';
      }
    }
  });

  collectBtn?.addEventListener('click', () => {
    if (isGamePaused || !collectBtn || collectBtn.disabled) return;
    executeCollect(1);
  });

  nextBtn?.addEventListener('click', async () => {
    if (isGamePaused) return;
    playButtonClick();
    if (testPlayController.isTesting()) {
      const cur = testPlayController.getCurrentLevel();
      testPlayController.deactivate();
      openEditorMode(cur || undefined);
      return;
    }

    // Interstitial ad at natural break between levels (respects 90s cooldown)
    await youtubePlayables.showInterstitial(
      () => {
        isAdPlaying = true;
        handlePause(true, false);
        audioManager.setMasterMute(true);
      },
      () => {
        isAdPlaying = false;
        handleResume(true);
        audioManager.syncWithPlatform();
      }
    );

    void loadLevelByIdx((currentLevelIdx + 1) % getAvailableLevels().length);
  });

  engine.runRenderLoop(() => {
    if (isGamePaused) return;
    scene.render();
  });
}

bootstrap().catch(console.error);
