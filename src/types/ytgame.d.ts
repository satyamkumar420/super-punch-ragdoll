/**
 * TypeScript definitions for the official YouTube Playables SDK.
 * @see https://developers.google.com/youtube/gaming/playables/reference/sdk
 */

export type YtGameSdkCallback = () => void;
export type YtGameAudioCallback = (enabled: boolean) => void;

export interface YtGameScoreParams {
  value: number;
}

export interface YtGameContentParams {
  id: string;
}

export interface YtGameGameModule {
  firstFrameReady(): void;
  gameReady(): void;
  saveData(data: string): Promise<void>;
  loadData(): Promise<string | null>;
}

export interface YtGameSystemModule {
  isAudioEnabled(): boolean;
  onAudioEnabledChange(callback: YtGameAudioCallback): (() => void) | void;
  onPause(callback: YtGameSdkCallback): (() => void) | void;
  onResume(callback: YtGameSdkCallback): (() => void) | void;
  getLanguage(): Promise<string>;
}

export interface YtGameEngagementModule {
  sendScore(params: YtGameScoreParams): Promise<void>;
  openYTContent?(params: YtGameContentParams): Promise<void>;
}

export interface YtGameHealthModule {
  logError(): void;
  logWarning(): void;
}

export interface YtGameAdsModule {
  requestInterstitialAd?(): Promise<void | boolean>;
  requestRewardedAd?(rewardId: string): Promise<void | boolean | { hasReward?: boolean }>;
}

export interface YouTubePlayablesSDK {
  SDK_VERSION?: string;
  IN_PLAYABLES_ENV?: boolean;
  game: YtGameGameModule;
  system: YtGameSystemModule;
  engagement: YtGameEngagementModule;
  health?: YtGameHealthModule;
  ads?: YtGameAdsModule;
}

declare global {
  interface Window {
    ytgame?: YouTubePlayablesSDK;
  }
}
