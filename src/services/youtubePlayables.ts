import { safeStorage } from './storage';

export interface PlayerCloudSaveData {
  unlockedLevel: number;
  highestScore: number;
  soundEnabled?: boolean;
  preferredLanguage?: string;
  updatedAt?: number;
}

export type SdkCallback = () => void;
export type AudioCallback = (enabled: boolean) => void;

const PRIMARY_KEY = 'super_punch_save_data';
const BACKUP_KEY = 'yt_cloud_data_backup';

export class YouTubePlayablesService {
  private isPlatformAudioEnabled = true;
  private isPlatformPaused = false;
  private pauseListeners: Set<SdkCallback> = new Set();
  private resumeListeners: Set<SdkCallback> = new Set();
  private audioListeners: Set<AudioCallback> = new Set();
  private cachedCloudData: PlayerCloudSaveData | null = null;
  private isDataLoaded = false;

  constructor() {
    this.init();
  }

  public init(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.isPlatformPaused = true;
          this.pauseListeners.forEach((cb) => {
            try { cb(); } catch (err) { console.error('Error in onPause listener', err); }
          });
        } else {
          this.isPlatformPaused = false;
          this.resumeListeners.forEach((cb) => {
            try { cb(); } catch (err) { console.error('Error in onResume listener', err); }
          });
        }
      });
    }
  }

  public firstFrameReady(): void {}
  public gameReady(): void {}

  public isAudioEnabled(): boolean {
    return this.isPlatformAudioEnabled;
  }

  public getIsPaused(): boolean {
    return this.isPlatformPaused;
  }

  public getIsAdPlaying(): boolean {
    return false;
  }

  public onPause(callback: SdkCallback): () => void {
    this.pauseListeners.add(callback);
    return () => this.pauseListeners.delete(callback);
  }

  public onResume(callback: SdkCallback): () => void {
    this.resumeListeners.add(callback);
    return () => this.resumeListeners.delete(callback);
  }

  public onAudioEnabledChange(callback: AudioCallback): () => void {
    this.audioListeners.add(callback);
    return () => this.audioListeners.delete(callback);
  }

  public async getPlatformLanguage(): Promise<string | null> {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }
    return 'en';
  }

  public async sendScore(_score: number): Promise<void> {}

  public async saveData(data: Partial<PlayerCloudSaveData>): Promise<void> {
    const current = await this.loadData();
    const updated: PlayerCloudSaveData = {
      unlockedLevel: typeof data.unlockedLevel === 'number' ? Math.max(1, data.unlockedLevel) : (current?.unlockedLevel ?? 1),
      highestScore: typeof data.highestScore === 'number' ? Math.max(0, data.highestScore) : (current?.highestScore ?? 0),
      soundEnabled: typeof data.soundEnabled === 'boolean' ? data.soundEnabled : (current?.soundEnabled ?? true),
      preferredLanguage: typeof data.preferredLanguage === 'string' ? data.preferredLanguage : current?.preferredLanguage,
      updatedAt: Date.now(),
    };

    this.cachedCloudData = updated;
    const json = JSON.stringify(updated);

    safeStorage.setItem(PRIMARY_KEY, json);
    safeStorage.setItem(BACKUP_KEY, json);
    safeStorage.setItem('highest_unlocked_level', String(updated.unlockedLevel));
    safeStorage.setItem('game_sound_enabled', String(updated.soundEnabled));
    if (updated.preferredLanguage) {
      safeStorage.setItem('preferred_language', updated.preferredLanguage);
    }
  }

  public async loadData(_timeoutMs = 1000): Promise<PlayerCloudSaveData | null> {
    if (this.isDataLoaded && this.cachedCloudData) {
      return this.cachedCloudData;
    }

    let parsed: Partial<PlayerCloudSaveData> | null = null;
    const raw = safeStorage.getItem(PRIMARY_KEY) || safeStorage.getItem(BACKUP_KEY);
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn('Failed to parse saved game data JSON', e);
      }
    }

    const legacyLevel = parseInt(safeStorage.getItem('highest_unlocked_level') || '1', 10);
    const legacySound = safeStorage.getItem('game_sound_enabled');
    const legacyLang = safeStorage.getItem('preferred_language');

    this.cachedCloudData = {
      unlockedLevel: Math.max(1, typeof parsed?.unlockedLevel === 'number' ? parsed.unlockedLevel : (isNaN(legacyLevel) ? 1 : legacyLevel)),
      highestScore: Math.max(0, typeof parsed?.highestScore === 'number' ? parsed.highestScore : 0),
      soundEnabled: typeof parsed?.soundEnabled === 'boolean' ? parsed.soundEnabled : (legacySound !== null ? legacySound !== 'false' : true),
      preferredLanguage: typeof parsed?.preferredLanguage === 'string' ? parsed.preferredLanguage : (legacyLang || undefined),
      updatedAt: parsed?.updatedAt || Date.now(),
    };

    this.isDataLoaded = true;
    return this.cachedCloudData;
  }

  public logError(): void {}
  public logWarning(): void {}

  public canShowInterstitial(): boolean {
    return false;
  }

  public getInterstitialCooldownRemaining(): number {
    return 0;
  }

  public async showInterstitial(
    _onPause?: () => void,
    _onResume?: () => void
  ): Promise<boolean> {
    return true;
  }

  public async showRewarded(
    _rewardId: string,
    _onPause?: () => void,
    _onResume?: () => void
  ): Promise<boolean> {
    return true;
  }
}

export const youtubePlayables = new YouTubePlayablesService();
