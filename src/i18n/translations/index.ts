import type { LanguageCode, TranslationKeys } from '../types.ts';
import { en } from './en.ts';
import { hi } from './hi.ts';
import { es } from './es.ts';
import { fr } from './fr.ts';
import { de } from './de.ts';
import { it } from './it.ts';
import { pt } from './pt.ts';
import { ru } from './ru.ts';
import { ja } from './ja.ts';
import { ko } from './ko.ts';
import { zhHans } from './zh-Hans.ts';
import { zhHant } from './zh-Hant.ts';
import { ar } from './ar.ts';
import { id } from './id.ts';
import { ms } from './ms.ts';
import { th } from './th.ts';
import { vi } from './vi.ts';
import { tr } from './tr.ts';
import { nl } from './nl.ts';
import { pl } from './pl.ts';
import { ro } from './ro.ts';
import { uk } from './uk.ts';

export const translations: Record<LanguageCode, TranslationKeys> = {
  en,
  hi,
  es,
  fr,
  de,
  it,
  pt,
  ru,
  ja,
  ko,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  ar,
  id,
  ms,
  th,
  vi,
  tr,
  nl,
  pl,
  ro,
  uk,
};

export {
  en,
  hi,
  es,
  fr,
  de,
  it,
  pt,
  ru,
  ja,
  ko,
  zhHans,
  zhHant,
  ar,
  id,
  ms,
  th,
  vi,
  tr,
  nl,
  pl,
  ro,
  uk,
};
