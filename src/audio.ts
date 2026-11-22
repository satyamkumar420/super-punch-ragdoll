import { youtubePlayables } from './services/youtubePlayables';
import { safeStorage } from './services/storage';

/**
 * Web Audio API Manager with Master Gain, BGM generator,
 * procedural SFX, and YouTube Playables lifecycle synchronization.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private isBgmRunning = false;
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmIntervalId: number | null = null;
  private currentStep = 0;

  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private isPreloadingAudio = false;

  private userSoundEnabled = true;
  private stateListeners: Set<(isMuted: boolean) => void> = new Set();
  private lastButtonClickTime = 0;
  private lastRagdollDeathIdx = -1;
  private unlockHandler: (() => void) | null = null;

  // Game loading state: strictly suppress ALL audio (BGM & SFX) until initial game loading completes
  private isGameLoaded = typeof window === 'undefined';

  constructor() {
    const stored = safeStorage.getItem('game_sound_enabled');
    if (stored !== null) {
      this.userSoundEnabled = stored !== 'false';
    } else {
      this.userSoundEnabled = youtubePlayables.isAudioEnabled();
    }

    this.setupListeners();
    this.setupUnlock();
    this.setupGlobalButtonListener();
    void this.preloadAudio();
  }

  public async preloadAudio(): Promise<void> {
    if (this.isPreloadingAudio || typeof window === 'undefined') return;
    this.isPreloadingAudio = true;
    const ctx = this.getOrCreateContext();
    if (!ctx) return;

    const files: Record<string, string> = {
      gunshot: './assets/audio/weapon/gunshot.mp3',
      slidePull: './assets/audio/weapon/slide_pull.mp3',
      slideRelease: './assets/audio/weapon/slide_release.mp3',
      magIn: './assets/audio/weapon/mag_in.mp3',
      magOut: './assets/audio/weapon/mag_out.mp3',
      clipFill: './assets/audio/weapon/clip_fill.mp3',
      coinCollect: './assets/audio/coin_collect.mp3',
      buttonClick: './assets/audio/button_click.mp3',
      bgm: './assets/audio/bgm.mp3',
      ragdollDeath1: './assets/audio/ragdoll/ragdoll_death_1.mp3',
      ragdollDeath2: './assets/audio/ragdoll/ragdoll_death_2.mp3',
      ragdollDeath3: './assets/audio/ragdoll/ragdoll_death_3.mp3',
      ragdollDeath4: './assets/audio/ragdoll/ragdoll_death_4.mp3',
      ragdollDeath5: './assets/audio/ragdoll/ragdoll_death_5.mp3',
      ragdollDeath6: './assets/audio/ragdoll/ragdoll_death_6.mp3',
      ragdollDeath7: './assets/audio/ragdoll/ragdoll_death_7.mp3',
      ragdollDeath8: './assets/audio/ragdoll/ragdoll_death_8.mp3',
    };

    await Promise.all(
      Object.entries(files).map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const arrayBuf = await res.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          this.audioBuffers.set(key, audioBuf);
        } catch {
          // Graceful fallback to procedural audio
        }
      })
    );
  }

  public preloadWeaponAudio(): Promise<void> {
    return this.preloadAudio();
  }

  private playSample(
    key: string,
    volume = 0.85,
    pitchVariation = 0.04,
    basePlaybackRate = 1.0,
    directToMaster = false
  ): boolean {
    if (!this.isAudioActive()) return false;
    const ctx = this.getOrCreateContext();
    if (!ctx || !this.sfxGain || !this.masterGain) return false;

    const buffer = this.audioBuffers.get(key);
    if (!buffer) {
      void this.preloadAudio();
      return false;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const rate = basePlaybackRate + (pitchVariation > 0 ? (Math.random() * 2 - 1) * pitchVariation : 0);
    source.playbackRate.value = Math.max(0.2, Math.min(3.0, rate));

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(directToMaster ? this.masterGain : this.sfxGain);
    source.start(ctx.currentTime);
    return true;
  }

  private setupListeners(): void {
    youtubePlayables.onAudioEnabledChange((_enabled: boolean) => {
      this.syncMasterAudio();
      this.notifyListeners();
    });

    youtubePlayables.onPause(() => {
      this.pauseAll();
    });

    youtubePlayables.onResume(() => {
      this.syncWithPlatform();
    });
  }

  private setupUnlock(): void {
    if (typeof window === 'undefined') return;
    this.unlockHandler = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      if (this.isAudioActive()) {
        this.unmuteMaster();
        this.startBgm();
        this.removeUnlockListeners();
      }
    };
    window.addEventListener('pointerdown', this.unlockHandler, { passive: true });
    window.addEventListener('touchstart', this.unlockHandler, { passive: true });
    window.addEventListener('keydown', this.unlockHandler, { passive: true });
  }

  private removeUnlockListeners(): void {
    if (!this.unlockHandler || typeof window === 'undefined') return;
    window.removeEventListener('pointerdown', this.unlockHandler);
    window.removeEventListener('touchstart', this.unlockHandler);
    window.removeEventListener('keydown', this.unlockHandler);
    this.unlockHandler = null;
  }

  private setupGlobalButtonListener(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener(
      'click',
      (e: MouseEvent) => {
        const target = (e.target as HTMLElement | null)?.closest(
          'button, [role="button"], .btn-3d, .modal-close-circle'
        ) as HTMLElement | null;
        if (!target) return;
        // The sound toggle button handles its own state transition feedback
        if (target.id === 'sound-btn') return;
        this.playButtonClick();
      },
      { capture: true, passive: true }
    );
  }

  private isLoadingScreenActive(): boolean {
    if (typeof document === 'undefined') return false;
    const loader = document.getElementById('loading-screen');
    if (!loader) return false;
    return !loader.classList.contains('fade-out');
  }

  public setGameLoaded(loaded = true): void {
    this.isGameLoaded = loaded;
    if (loaded) {
      this.syncMasterAudio();
      if (this.ctx && this.ctx.state === 'running' && this.isBgmRunning) {
        this.removeUnlockListeners();
      }
    } else {
      this.stopBgm();
      this.muteMaster();
    }
  }

  public isLoaded(): boolean {
    return this.isGameLoaded && !this.isLoadingScreenActive();
  }

  public isMuted(): boolean {
    return !this.userSoundEnabled || !youtubePlayables.isAudioEnabled();
  }

  public isAudioActive(): boolean {
    if (!this.isGameLoaded || this.isLoadingScreenActive()) return false;
    return this.userSoundEnabled && !youtubePlayables.getIsPaused() && youtubePlayables.isAudioEnabled();
  }

  public getUserSoundPreference(): boolean {
    return this.userSoundEnabled;
  }

  public isPlatformAudioEnabled(): boolean {
    return youtubePlayables.isAudioEnabled() && !youtubePlayables.getIsPaused();
  }

  public isSoundEnabled(): boolean {
    return this.isAudioActive();
  }

  public syncMasterAudio(): void {
    if (this.isAudioActive()) {
      this.unmuteMaster();
      this.startBgm();
    } else {
      this.muteMaster();
      this.stopBgm();
    }
  }

  public syncWithPlatform(): void {
    this.syncMasterAudio();
    this.notifyListeners();
  }

  public pauseAll(): void {
    this.muteMaster();
    this.stopBgm();
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }

  public setMasterMute(mute: boolean): void {
    if (mute) {
      this.muteMaster();
      this.stopBgm();
    } else {
      this.syncMasterAudio();
    }
    this.notifyListeners();
  }

  public setSoundEnabled(enabled: boolean): void {
    this.userSoundEnabled = enabled;
    safeStorage.setItem('game_sound_enabled', String(enabled));
    this.syncMasterAudio();
    this.notifyListeners();
  }

  public toggleSound(): boolean {
    const nextEnabled = !this.userSoundEnabled;
    this.setSoundEnabled(nextEnabled);
    return nextEnabled;
  }

  public onStateChange(callback: (isMuted: boolean) => void): () => void {
    this.stateListeners.add(callback);
    callback(this.isMuted());
    return () => this.stateListeners.delete(callback);
  }

  private notifyListeners(): void {
    const muted = this.isMuted();
    this.stateListeners.forEach((cb) => {
      try {
        cb(muted);
      } catch (err) {
        console.error('Error in audio state listener', err);
      }
    });
  }

  private getOrCreateContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const CtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (CtxClass) {
        this.ctx = new CtxClass();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();

        this.sfxGain.connect(this.masterGain);
        this.bgmGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
        this.bgmGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.isAudioActive() ? 1.0 : 0.0001, this.ctx.currentTime);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && this.isAudioActive()) {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private muteMaster(): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    }
  }

  private unmuteMaster(): void {
    if (!this.isAudioActive()) {
      this.muteMaster();
      return;
    }
    const ctx = this.getOrCreateContext();
    if (ctx && this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
    }
  }

  // --- BGM Playback & Looping ---
  public startBgm(): void {
    if (this.isBgmRunning || !this.isAudioActive()) return;
    const ctx = this.getOrCreateContext();
    if (!ctx || !this.bgmGain) return;

    this.isBgmRunning = true;

    // Use preloaded non-copyrighted audio buffer if ready
    const buffer = this.audioBuffers.get('bgm');
    if (buffer) {
      this.playBgmBuffer(buffer);
      return;
    }

    // Schedule playback as soon as decoded
    void this.preloadAudio().then(() => {
      if (!this.isBgmRunning || !this.isAudioActive()) return;
      const loadedBuf = this.audioBuffers.get('bgm');
      if (loadedBuf && !this.bgmSource) {
        this.stopProceduralBgm();
        this.playBgmBuffer(loadedBuf);
      }
    });

    // Fallback procedural beat while audio buffer loads
    this.startProceduralBgm();
  }

  private playBgmBuffer(buffer: AudioBuffer): void {
    if (!this.ctx || !this.bgmGain || !this.isBgmRunning) return;
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
        this.bgmSource.disconnect();
      } catch {
        // Node already stopped
      }
      this.bgmSource = null;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.bgmGain);
    source.start(0);
    this.bgmSource = source;
  }

  public stopBgm(): void {
    this.isBgmRunning = false;
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
        this.bgmSource.disconnect();
      } catch {
        // Node already stopped
      }
      this.bgmSource = null;
    }
    this.stopProceduralBgm();
  }

  private startProceduralBgm(): void {
    if (this.bgmIntervalId !== null || !this.ctx || !this.bgmGain) return;
    const bpm = 118;
    const sixteenth = (60 / bpm) / 4;

    const melodyNotes = [
      587.33, 0, 698.46, 0, 783.99, 0, 880.00, 783.99, 698.46, 0, 587.33, 0, 523.25, 0, 587.33, 0,
      698.46, 0, 783.99, 0, 1046.50, 0, 880.00, 783.99, 698.46, 783.99, 698.46, 0, 587.33, 0, 0, 0
    ];
    const bassNotes = [
      146.83, 0, 146.83, 0, 116.54, 0, 116.54, 0, 98.00, 0, 98.00, 0, 110.00, 0, 110.00, 0,
      146.83, 0, 146.83, 0, 116.54, 0, 116.54, 0, 98.00, 0, 110.00, 0, 146.83, 0, 146.83, 0
    ];

    this.bgmIntervalId = window.setInterval(() => {
      if (!this.isBgmRunning || !this.isAudioActive() || !this.ctx || !this.bgmGain || this.bgmSource) {
        this.stopProceduralBgm();
        return;
      }
      const now = this.ctx.currentTime;
      const stepIdx = this.currentStep % melodyNotes.length;

      const melFreq = melodyNotes[stepIdx];
      if (melFreq > 0) {
        this.playPluckNote(melFreq, now, 0.12);
      }

      const bassFreq = bassNotes[stepIdx];
      if (bassFreq > 0) {
        this.playBassNote(bassFreq, now, 0.18);
      }

      this.currentStep++;
    }, sixteenth * 1000);
  }

  private stopProceduralBgm(): void {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  private playTone(
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    dur: number,
    vol = 0.5,
    dest: GainNode | null = this.sfxGain,
    startTime?: number
  ): void {
    if (!this.isAudioActive() || !this.ctx || !dest) return;
    try {
      const t = startTime ?? this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, t);
      if (startFreq !== endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), t + dur);
      }
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + dur);
    } catch {
      // Audio safety
    }
  }

  private playPluckNote(freq: number, time: number, dur: number): void {
    this.playTone('triangle', freq, freq, dur, 0.18, this.bgmGain, time);
  }

  private playBassNote(freq: number, time: number, dur: number): void {
    this.playTone('sine', freq, freq, dur, 0.25, this.bgmGain, time);
  }

  private playNoiseBurst(dur: number, startFreq: number, endFreq: number, vol: number, decayRate = 0.025): void {
    if (!this.isAudioActive()) return;
    const ctx = this.getOrCreateContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decayRate));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  // --- SFX (Sound Effects) ---
  public playPunchWhoosh(): void {
    if (!this.isAudioActive()) return;
    this.playTone('sine', 160, 45, 0.12, 0.65);
  }

  public playHeavyPunch(): void {
    if (!this.isAudioActive()) return;
    this.playTone('triangle', 240, 30, 0.22, 0.95);
    const ctx = this.getOrCreateContext();
    if (ctx) {
      setTimeout(() => {
        if (this.isAudioActive()) this.playTone('sine', 110, 35, 0.15, 0.85);
      }, 25);
    }
  }

  public playGunshot(): void {
    if (!this.isAudioActive()) return;
    if (this.playSample('gunshot', 0.95, 0.04)) return;
    this.playNoiseBurst(0.14, 3200, 260, 0.85, 0.025);
  }

  public playHitSound(): void {
    if (!this.isAudioActive()) return;
    this.playTone('triangle', 190, 35, 0.18, 0.85);
  }

  public playBoingSound(): void {
    if (this.isAudioActive()) this.playTone('sine', 210, 680, 0.22, 0.6);
  }

  public playVictorySound(): void {
    if (!this.isAudioActive()) return;
    const ctx = this.getOrCreateContext();
    if (!ctx) return;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      this.playTone('triangle', freq, freq, 0.35, 0.5, this.sfxGain, ctx.currentTime + idx * 0.11);
    });
  }

  public playStarSound(starIndex = 0): void {
    if (!this.isAudioActive()) return;
    const ctx = this.getOrCreateContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const safeIdx = Math.max(0, Math.min(2, Math.floor(starIndex)));

    // Musical frequency tiers for Star 1, 2, and 3 (rising pitch & triumph)
    const starConfigs = [
      { root: 1046.5, overtone: 1567.98, body: 523.25, duration: 0.42, vol: 0.65 }, // C6 + G6
      { root: 1318.51, overtone: 1975.53, body: 659.25, duration: 0.48, vol: 0.70 }, // E6 + B6
      { root: 1567.98, overtone: 2093.00, body: 783.99, duration: 0.72, vol: 0.82 }, // G6 + C7
    ];

    const cfg = starConfigs[safeIdx];

    // 1. Crystal chime tone (pure bell overtone)
    this.playChimeTone(cfg.root, t, cfg.duration, cfg.vol);
    this.playChimeTone(cfg.overtone, t + 0.012, cfg.duration * 0.88, cfg.vol * 0.75);

    // 2. Punchy warm thud (body of cartoon star landing)
    this.playTone('sine', cfg.body * 1.08, cfg.body, 0.16, cfg.vol * 0.45, this.sfxGain, t);
    this.playTone('sine', 520, 160, 0.065, cfg.vol * 0.5, this.sfxGain, t);

    // 3. For 3rd star (climax), add sparkling celebratory chord harmonics
    if (safeIdx === 2) {
      const sparklePitches = [2637.02, 3135.96, 4186.01]; // E7, G7, C8
      sparklePitches.forEach((freq, i) => {
        this.playChimeTone(freq, t + 0.07 + i * 0.05, 0.45, 0.4);
      });
    }
  }

  private playChimeTone(freq: number, startTime: number, duration: number, vol: number): void {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(vol, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Audio safety
    }
  }

  public playButtonClick(): void {
    if (!this.isAudioActive()) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastButtonClickTime < 45) return;
    this.lastButtonClickTime = now;

    const playedSample = this.playSample('buttonClick', 0.85, 0.02);
    if (!playedSample) {
      this.playTone('sine', 420, 840, 0.06, 0.4);
    }
  }

  public playMaterialImpactSound(material: string): void {
    if (!this.isAudioActive()) return;
    if (material === 'metal') {
      this.playTone('sine', 1420, 880, 0.16, 0.5);
    } else if (material === 'concrete' || material === 'stone') {
      this.playNoiseBurst(0.08, 1200, 200, 0.7, 0.018);
    } else {
      this.playTone('triangle', 280, 75, 0.12, 0.7);
    }
  }

  public playCoinPickupSound(pitchMultiplier = 1.0): void {
    if (!this.isAudioActive()) return;
    const clampedPitch = Math.max(0.6, Math.min(2.0, pitchMultiplier));
    const playedSample = this.playSample('coinCollect', 0.65, 0.015, clampedPitch);
    if (!playedSample) {
      const baseFreq = 987.77 * clampedPitch;
      this.playTone('sine', baseFreq, baseFreq * 1.33, 0.14, 0.35);
    }
  }

  public playObstacleBreakSound(): void {
    if (this.isAudioActive()) this.playTone('sawtooth', 320, 60, 0.22, 0.8);
  }

  public playSlidePull(): void {
    if (this.isAudioActive() && !this.playSample('slidePull', 1.15)) this.playTone('sine', 480, 240, 0.08, 0.6);
  }

  public playSlideRelease(): void {
    if (this.isAudioActive() && !this.playSample('slideRelease', 1.25)) this.playTone('triangle', 320, 160, 0.06, 0.65);
  }

  public playMagIn(): void {
    if (this.isAudioActive() && !this.playSample('magIn', 1.3)) this.playTone('sine', 280, 560, 0.07, 0.65);
  }

  public playMagOut(): void {
    if (this.isAudioActive() && !this.playSample('magOut', 1.3)) this.playTone('sine', 520, 260, 0.07, 0.65);
  }

  public playClipFill(): void {
    if (this.isAudioActive() && !this.playSample('clipFill', 1.2)) this.playTone('sine', 600, 750, 0.05, 0.5);
  }

  public playRagdollDeathSound(preferredVariant?: number): void {
    if (!this.isAudioActive()) return;

    const count = 8;
    let chosenIdx: number;

    if (typeof preferredVariant === 'number' && preferredVariant >= 1 && preferredVariant <= count) {
      chosenIdx = Math.floor(preferredVariant);
      if (chosenIdx === this.lastRagdollDeathIdx && count > 1) {
        chosenIdx = (chosenIdx % count) + 1;
      }
    } else {
      chosenIdx = Math.floor(Math.random() * count) + 1;
      if (chosenIdx === this.lastRagdollDeathIdx && count > 1) {
        chosenIdx = (chosenIdx % count) + 1;
      }
    }

    this.lastRagdollDeathIdx = chosenIdx;
    const key = `ragdollDeath${chosenIdx}`;

    // Play at 100% full volume directly connected to master gain
    const played = this.playSample(key, 1.0, 0.03, 1.0, true);
    if (!played) {
      // Clean fallback at full volume if buffer not ready yet
      this.playTone('sawtooth', 360, 90, 0.28, 1.0, this.masterGain);
    }
  }
}

export const audioManager = new AudioManager();

// Shorthand function exports for backward compatibility & easy importing
export const playPunchWhoosh = () => audioManager.playPunchWhoosh();
export const playHeavyPunch = () => audioManager.playHeavyPunch();
export const playGunshot = () => audioManager.playGunshot();
export const playSlidePull = () => audioManager.playSlidePull();
export const playSlideRelease = () => audioManager.playSlideRelease();
export const playMagIn = () => audioManager.playMagIn();
export const playMagOut = () => audioManager.playMagOut();
export const playClipFill = () => audioManager.playClipFill();
export const playHitSound = () => audioManager.playHitSound();
export const playBoingSound = () => audioManager.playBoingSound();
export const playRagdollDeathSound = (variant?: number) => audioManager.playRagdollDeathSound(variant);
export const playVictorySound = () => audioManager.playVictorySound();
export const playStarSound = (starIndex = 0) => audioManager.playStarSound(starIndex);
export const playButtonClick = () => audioManager.playButtonClick();
export const playCoinPickupSound = (mult = 1.0) => audioManager.playCoinPickupSound(mult);
export const playMaterialImpactSound = (mat: string) => audioManager.playMaterialImpactSound(mat);
export const playObstacleBreakSound = () => audioManager.playObstacleBreakSound();
export const isAudioMuted = () => audioManager.isMuted();
export const setMuted = (muted: boolean) => audioManager.setSoundEnabled(!muted);
export const toggleSound = () => audioManager.toggleSound();
export const setGameLoaded = (loaded = true) => audioManager.setGameLoaded(loaded);



