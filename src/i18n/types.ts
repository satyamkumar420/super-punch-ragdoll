export type LanguageCode =
  | 'ar'
  | 'de'
  | 'en'
  | 'es'
  | 'fr'
  | 'hi'
  | 'id'
  | 'it'
  | 'ja'
  | 'ko'
  | 'ms'
  | 'nl'
  | 'pl'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'th'
  | 'tr'
  | 'uk'
  | 'vi'
  | 'zh-Hans'
  | 'zh-Hant';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir?: 'ltr' | 'rtl';
}

export interface TranslationKeys {
  // Modal & Settings
  settings?: string;
  game_controls?: string;
  language: string;
  select_language: string;
  select_level?: string;
  level_locked?: string;
  level_progress?: string;
  close: string;
  sound: string;
  toggle_sound: string;
  restart: string;
  restart_level: string;
  editor: string;
  level_editor: string;
  game_paused?: string;
  paused_description?: string;
  resume?: string;

  // Loader
  brand_title: string;
  game_title: string;
  loading: string;
  loading_game: string;
  loading_assets: string;
  preparing_physics: string;

  // HUD & Gameplay
  level: string;
  level_n: string;
  time_tap_shoot: string;
  level_1_subtitle: string;
  level_2_subtitle: string;
  level_3_subtitle: string;
  level_4_subtitle: string;
  level_5_subtitle: string;
  level_6_subtitle?: string;
  level_7_subtitle?: string;
  level_12_subtitle?: string;
  level_29_subtitle?: string;
  level_30_subtitle?: string;
  level_31_subtitle?: string;
  level_32_subtitle?: string;
  level_33_subtitle?: string;
  level_34_subtitle?: string;
  level_35_subtitle?: string;
  level_36_subtitle?: string;
  level_37_subtitle?: string;
  level_38_subtitle?: string;
  level_39_subtitle?: string;
  level_40_subtitle?: string;
  level_41_subtitle?: string;
  level_42_subtitle?: string;
  level_43_subtitle?: string;
  level_44_subtitle?: string;
  level_45_subtitle?: string;
  level_46_subtitle?: string;
  level_47_subtitle?: string;
  level_48_subtitle?: string;
  level_49_subtitle?: string;
  level_50_subtitle?: string;
  level_51_subtitle?: string;
  level_52_subtitle?: string;
  level_53_subtitle?: string;
  level_54_subtitle?: string;
  level_55_subtitle?: string;
  level_56_subtitle?: string;
  level_57_subtitle?: string;
  level_58_subtitle?: string;
  level_59_subtitle?: string;
  level_60_subtitle?: string;
  level_61_subtitle?: string;
  level_62_subtitle?: string;
  level_63_subtitle?: string;
  level_64_subtitle?: string;
  level_65_subtitle?: string;
  level_66_subtitle?: string;
  level_67_subtitle?: string;
  level_68_subtitle?: string;
  level_69_subtitle?: string;
  level_70_subtitle?: string;

  // Victory Modal
  level_cleared: string;
  all_targets_down: string;
  coins_badge: string;
  collect: string;
  next_level: string;
  start_again: string;
  double_coins?: string;
}
