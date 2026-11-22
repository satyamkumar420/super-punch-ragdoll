import type { YouTubePlayablesSDK, YtGameAudioCallback, YtGameSdkCallback } from '../types/ytgame';
import { safeStorage } from './storage';

export interface PlayerCloudSaveData {
  unlockedLevel: number;
  highestScore: number;
  soundEnabled?: boolean;
  preferredLanguage?: string;
  updatedAt?: number;
}

export class YouTubePlayablesService {
  private isFirstFrameReadySent = false;
  private isGameReadySent = false;
  private isPlatformAudioEnabled = true;
  private isPlatformPaused = false;

  private pauseListeners: Set<YtGameSdkCallback> = new Set();
  private resumeListeners: Set<YtGameSdkCallback> = new Set();
  private audioListeners: Set<YtGameAudioCallback> = new Set();

  private sdkRef: YouTubePlayablesSDK | null = null;
  private initialized = false;
  private isDataLoaded = false;
  private loadDataPromise: Promise<PlayerCloudSaveData | null> | null = null;
  private cachedCloudData: PlayerCloudSaveData | null = null;
  private lastSentScore: number | null = null;
  private lastSentScoreTime = 0;
  private lastInterstitialTime = Date.now();
  private readonly INTERSTITIAL_COOLDOWN_MS = 90 * 1000;
  private isAdPlaying = false;

  public getIsAdPlaying(): boolean {
    return this.isAdPlaying;
  }

  constructor() {
    this.init();
  }

  public init(): void {
    if (this.initialized) return;

    const sdk = this.sdkRef || (typeof window !== 'undefined' ? window.ytgame : null);
    if (!sdk) return;

    this.sdkRef = sdk;
    this.initialized = true;

    try {
      if (typeof sdk.system?.isAudioEnabled === 'function') {
        const enabled = sdk.system.isAudioEnabled();
        const changed = this.isPlatformAudioEnabled !== enabled;
        this.isPlatformAudioEnabled = enabled;
        if (changed) {
          this.audioListeners.forEach((cb) => {
            try { cb(enabled); } catch (err) { console.error('Error in onAudioEnabledChange listener', err); }
          });
        }
      }
    } catch (e) {
      console.warn('Failed to query initial audio state', e);
    }

    try {
      sdk.system?.onPause(() => {
        this.isPlatformPaused = true;
        this.pauseListeners.forEach((cb) => {
          try { cb(); } catch (err) { console.error('Error in onPause listener', err); }
        });
      });
    } catch (e) {
      console.warn('Failed to bind onPause in YouTube SDK', e);
    }

    try {
      sdk.system?.onResume(() => {
        this.isPlatformPaused = false;
        if (typeof sdk.system?.isAudioEnabled === 'function') {
          try {
            this.isPlatformAudioEnabled = sdk.system.isAudioEnabled();
          } catch {
            // keep cached
          }
        }
        this.resumeListeners.forEach((cb) => {
          try { cb(); } catch (err) { console.error('Error in onResume listener', err); }
        });
      });
    } catch (e) {
      console.warn('Failed to bind onResume in YouTube SDK', e);
    }

    try {
      sdk.system?.onAudioEnabledChange((enabled: boolean) => {
        this.isPlatformAudioEnabled = enabled;
        this.audioListeners.forEach((cb) => {
          try { cb(enabled); } catch (err) { console.error('Error in onAudioEnabledChange listener', err); }
        });
      });
    } catch (e) {
      console.warn('Failed to bind onAudioEnabledChange in YouTube SDK', e);
    }
  }

  public firstFrameReady(): void {
    const sdk = this.getSdk();
    if (sdk?.game?.firstFrameReady) {
      if (!this.isFirstFrameReadySent) {
        this.isFirstFrameReadySent = true;
        try {
          sdk.game.firstFrameReady();
        } catch (e) {
          console.error('Failed to signal firstFrameReady', e);
        }
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const interval = setInterval(() => {
        const lateSdk = this.getSdk();
        if (lateSdk?.game?.firstFrameReady) {
          clearInterval(interval);
          if (!this.isFirstFrameReadySent) {
            this.isFirstFrameReadySent = true;
            try {
              lateSdk.game.firstFrameReady();
            } catch (e) {
              console.error('Failed to signal firstFrameReady on late SDK', e);
            }
          }
        }
      }, 20);
      setTimeout(() => clearInterval(interval), 4000);
    }
  }

  public gameReady(): void {
    if (!this.isFirstFrameReadySent) {
      this.firstFrameReady();
    }

    const sdk = this.getSdk();
    if (sdk?.game?.gameReady) {
      if (!this.isGameReadySent) {
        this.isGameReadySent = true;
        try {
          sdk.game.gameReady();
        } catch (e) {
          console.error('Failed to signal gameReady', e);
        }
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const interval = setInterval(() => {
        const lateSdk = this.getSdk();
        if (lateSdk?.game?.gameReady) {
          clearInterval(interval);
          if (!this.isGameReadySent) {
            this.isGameReadySent = true;
            try {
              lateSdk.game.gameReady();
            } catch (e) {
              console.error('Failed to signal gameReady on late SDK', e);
            }
          }
        }
      }, 20);
      setTimeout(() => clearInterval(interval), 4000);
    }
  }

  public isAudioEnabled(): boolean {
    return this.isPlatformAudioEnabled;
  }

  public queryPlatformAudioEnabled(): boolean {
    const sdk = this.getSdk();
    if (sdk?.system && typeof sdk.system.isAudioEnabled === 'function') {
      try {
        this.isPlatformAudioEnabled = sdk.system.isAudioEnabled();
      } catch {
        // keep cached
      }
    }
    return this.isPlatformAudioEnabled;
  }

  public getIsPaused(): boolean {
    return this.isPlatformPaused;
  }

  public onPause(callback: YtGameSdkCallback): () => void {
    this.pauseListeners.add(callback);
    if (this.isPlatformPaused) {
      try {
        callback();
      } catch (err) {
        console.error('Error invoking immediate onPause callback', err);
      }
    }
    return () => this.pauseListeners.delete(callback);
  }

  public onResume(callback: YtGameSdkCallback): () => void {
    this.resumeListeners.add(callback);
    return () => this.resumeListeners.delete(callback);
  }

  public onAudioEnabledChange(callback: YtGameAudioCallback): () => void {
    this.audioListeners.add(callback);
    try {
      callback(this.isPlatformAudioEnabled);
    } catch (err) {
      console.error('Error invoking immediate onAudioEnabledChange callback', err);
    }
    return () => this.audioListeners.delete(callback);
  }

  public async ensureSdkReady(timeoutMs = 2000): Promise<YouTubePlayablesSDK | null> {
    const immediate = this.getSdk();
    if (
      typeof immediate?.game?.loadData === 'function' &&
      typeof immediate?.game?.saveData === 'function'
    ) {
      return immediate;
    }

    if (typeof window === 'undefined') return immediate;

    const start = Date.now();
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const sdk = this.getSdk();
        if (
          typeof sdk?.game?.loadData === 'function' &&
          typeof sdk?.game?.saveData === 'function'
        ) {
          clearInterval(interval);
          resolve(sdk);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          clearInterval(interval);
          resolve(this.getSdk());
        }
      }, 25);
    });
  }

  public async getPlatformLanguage(): Promise<string | null> {
    const sdk = await this.ensureSdkReady(1000);
    if (sdk?.system && typeof sdk.system.getLanguage === 'function') {
      try {
        const lang = await Promise.resolve(sdk.system.getLanguage());
        if (typeof lang === 'string' && lang.trim().length > 0) {
          return lang.trim();
        }
      } catch (e) {
        console.warn('Failed to query platform language from YouTube SDK', e);
      }
    }
    return null;
  }

  public async sendScore(score: number): Promise<void> {
    if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) return;

    const rounded = Math.round(score);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (this.lastSentScore === rounded && now - this.lastSentScoreTime < 1000) {
      return;
    }

    this.lastSentScore = rounded;
    this.lastSentScoreTime = now;

    const sdk = this.getSdk();
    if (sdk?.engagement?.sendScore) {
      try {
        await sdk.engagement.sendScore({ value: rounded });
      } catch (err) {
        console.error('Failed to submit score to YouTube Playables', err);
        this.logError();
      }
    }
  }

  public sanitizeUtf16(jsonString: string): string {
    const loneHigh = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g;
    const loneLow = /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
    return jsonString.replace(loneHigh, '').replace(loneLow, '');
  }

  public async saveData(data: Partial<PlayerCloudSaveData>): Promise<void> {
    if (!this.isDataLoaded) {
      await (this.loadDataPromise || this.loadData());
    }

    const payload: PlayerCloudSaveData = {
      unlockedLevel: typeof data.unlockedLevel === 'number' ? data.unlockedLevel : (this.cachedCloudData?.unlockedLevel ?? 1),
      highestScore: typeof data.highestScore === 'number' ? data.highestScore : (this.cachedCloudData?.highestScore ?? 0),
      soundEnabled: typeof data.soundEnabled === 'boolean' ? data.soundEnabled : (this.cachedCloudData?.soundEnabled ?? true),
      preferredLanguage: typeof data.preferredLanguage === 'string' ? data.preferredLanguage : this.cachedCloudData?.preferredLanguage,
      updatedAt: Date.now(),
    };

    this.cachedCloudData = payload;
    const cleanJson = this.sanitizeUtf16(JSON.stringify(payload));

    try {
      safeStorage.setItem('yt_cloud_data_backup', cleanJson);
      if (payload.preferredLanguage) {
        safeStorage.setItem('preferred_language', payload.preferredLanguage);
      }
    } catch {
      // safe fallback
    }

    const sdk = await this.ensureSdkReady(1000);
    if (!sdk?.game?.saveData) return;

    try {
      const byteLength = new TextEncoder().encode(cleanJson).length;
      if (byteLength > 3 * 1024 * 1024) {
        console.error('Save data exceeds 3 MiB limit');
        return;
      }
      await Promise.resolve(sdk.game.saveData(cleanJson));
    } catch (e) {
      console.error('Failed to save data to YouTube Playables', e);
      this.logError();
    }
  }

  public async loadData(timeoutMs = 2500): Promise<PlayerCloudSaveData | null> {
    if (this.loadDataPromise) return this.loadDataPromise;

    this.loadDataPromise = (async () => {
      const sdk = await this.ensureSdkReady(1500);
      if (!sdk?.game?.loadData) {
        this.isDataLoaded = true;
        this.restoreLocalBackup();
        return this.cachedCloudData;
      }

      let loadP: Promise<string | null>;
      try {
        loadP = Promise.resolve(sdk.game.loadData());
      } catch (err) {
        console.warn('Failed to call sdk.game.loadData', err);
        this.isDataLoaded = true;
        this.restoreLocalBackup();
        return this.cachedCloudData;
      }

      const timeoutP = new Promise<null>((res) => setTimeout(() => res(null), timeoutMs));

      try {
        const raw = await Promise.race([loadP, timeoutP]);
        if (typeof raw === 'string' && raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const result: PlayerCloudSaveData = {
              unlockedLevel: typeof parsed.unlockedLevel === 'number' ? parsed.unlockedLevel : 1,
              highestScore: typeof parsed.highestScore === 'number' ? parsed.highestScore : 0,
              soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
              preferredLanguage: typeof parsed.preferredLanguage === 'string' ? parsed.preferredLanguage : undefined,
              updatedAt: parsed.updatedAt,
            };
            this.cachedCloudData = result;
            return result;
          }
        }
      } catch (e) {
        console.error('Failed to load data from YouTube Playables', e);
        this.logError();
      } finally {
        this.isDataLoaded = true;
      }

      this.restoreLocalBackup();
      return this.cachedCloudData;
    })();

    return this.loadDataPromise;
  }

  private restoreLocalBackup(): void {
    if (this.cachedCloudData) return;
    try {
      const backup = safeStorage.getItem('yt_cloud_data_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (parsed && typeof parsed === 'object') {
          this.cachedCloudData = {
            unlockedLevel: typeof parsed.unlockedLevel === 'number' ? parsed.unlockedLevel : 1,
            highestScore: typeof parsed.highestScore === 'number' ? parsed.highestScore : 0,
            soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
            preferredLanguage: typeof parsed.preferredLanguage === 'string' ? parsed.preferredLanguage : undefined,
            updatedAt: parsed.updatedAt,
          };
        }
      }
    } catch {
      // safe fallback
    }
  }

  public logError(): void {
    try {
      this.getSdk()?.health?.logError();
    } catch {
      // Ignore
    }
  }

  public logWarning(): void {
    try {
      this.getSdk()?.health?.logWarning();
    } catch {
      // Ignore
    }
  }

  public canShowInterstitial(): boolean {
    return Date.now() - this.lastInterstitialTime >= this.INTERSTITIAL_COOLDOWN_MS;
  }

  public getInterstitialCooldownRemaining(): number {
    const elapsed = Date.now() - this.lastInterstitialTime;
    return Math.max(0, this.INTERSTITIAL_COOLDOWN_MS - elapsed);
  }

  public async showInterstitial(
    onPause?: () => void,
    onResume?: () => void
  ): Promise<boolean> {
    const sdk = this.getSdk();

    if (sdk?.ads?.requestInterstitialAd) {
      if (!this.canShowInterstitial()) {
        return false;
      }

      try {
        this.isAdPlaying = true;
        onPause?.();
        await sdk.ads.requestInterstitialAd();
        this.lastInterstitialTime = Date.now();
        return true;
      } catch (err) {
        console.warn('Interstitial ad failed or was unavailable:', err);
        this.logWarning();
        return false;
      } finally {
        this.isAdPlaying = false;
        onResume?.();
      }
    }

    // Local development simulation fallback
    if (typeof window !== 'undefined' && !window.ytgame?.IN_PLAYABLES_ENV) {
      if (!this.canShowInterstitial()) {
        return false;
      }
      try {
        this.isAdPlaying = true;
        onPause?.();
        await new Promise((res) => setTimeout(res, 250));
        this.lastInterstitialTime = Date.now();
        return true;
      } finally {
        this.isAdPlaying = false;
        onResume?.();
      }
    }

    return false;
  }

  public async showRewarded(
    rewardId: string,
    onPause?: () => void,
    onResume?: () => void
  ): Promise<boolean> {
    const sdk = this.getSdk();

    if (sdk?.ads?.requestRewardedAd) {
      try {
        this.isAdPlaying = true;
        onPause?.();
        const result = await sdk.ads.requestRewardedAd(rewardId);
        const granted =
          result === undefined ||
          result === true ||
          (typeof result === 'object' && result !== null && (result as any).hasReward !== false && (result as any).success !== false);
        return Boolean(granted);
      } catch (err) {
        console.warn(`Rewarded ad (${rewardId}) failed or was closed early:`, err);
        this.logWarning();
        return false;
      } finally {
        this.isAdPlaying = false;
        onResume?.();
      }
    }

    // Local development simulation fallback
    if (typeof window !== 'undefined' && !window.ytgame?.IN_PLAYABLES_ENV) {
      try {
        this.isAdPlaying = true;
        onPause?.();
        await new Promise((res) => setTimeout(res, 400));
        return true;
      } finally {
        this.isAdPlaying = false;
        onResume?.();
      }
    }

    return false;
  }

  private getSdk(): YouTubePlayablesSDK | null {
    if (!this.sdkRef && typeof window !== 'undefined' && window.ytgame) {
      this.sdkRef = window.ytgame;
      this.init();
    }
    return this.sdkRef;
  }
}

export const youtubePlayables = new YouTubePlayablesService();
